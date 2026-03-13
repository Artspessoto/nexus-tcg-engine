import { THEME_CONFIG } from "../constants/ThemeConfig";
import { EventBus } from "../events/EventBus";
import { GameEvent, type CardSentToGYPayload } from "../events/GameEvents";
import type { IBattleContext } from "../interfaces/IBattleContext";
import type { ICombatManager } from "../interfaces/ICombatManager";
import type { Card } from "../objects/Card";
import type { GameSide } from "../types/GameTypes";

export class CombatManager implements ICombatManager {
  private context: IBattleContext;
  public isSelectingTarget: boolean = false;
  public currentAttacker: Card | null = null;

  constructor(context: IBattleContext) {
    this.context = context;

    EventBus.on(GameEvent.PHASE_CHANGED, () => {
      this.cancelTarget();
    });

    EventBus.on(
      GameEvent.CARD_SENT_TO_GRAVEYARD,
      (data: CardSentToGYPayload) => {
        //if currentAttacker sent to graveyard by trap or other effect during the battle phase
        if (this.currentAttacker == data.card) {
          this.cancelTarget(); //prevents bug (ghost attack)
        }
      },
    );
  }

  private get notices() {
    return this.context.translationText.combat_notices;
  }

  public prepareTargeting(attacker: Card) {
    const opponentSide = attacker.owner == "PLAYER" ? "OPPONENT" : "PLAYER";
    const existsMonstersIntoField = this.context.field.monsterSlots[
      opponentSide
    ].some((slot) => slot !== null);

    if (attacker.hasAttacked) return;

    if (!existsMonstersIntoField) {
      this.context
        .getUI(opponentSide)
        .showNotice(this.notices.direct_attack, "WARNING");
      attacker.setAlpha(0.7);

      this.context.time.delayedCall(100, () => {
        this.executeDirectAttack(attacker, opponentSide);
        this.currentAttacker = null;
      });
      return;
    }

    this.currentAttacker = attacker;
    this.isSelectingTarget = true;

    EventBus.emit(GameEvent.TARGETING_STARTED, {
      source: attacker,
      type: "ATTACK",
    });
    attacker.setAlpha(0.7);
  }

  public handleCardSelection(target: Card) {
    if (!this.isSelectingTarget || !this.currentAttacker) return;

    if (this.context.gameState.currentPhase !== "BATTLE") {
      this.cancelTarget();
      return;
    }
    const attackOwnCard = target.owner === this.currentAttacker.owner;
    const isValidTargetType = target.getType().includes("MONSTER");

    if (attackOwnCard) {
      this.context
        .getUI(this.currentAttacker.owner)
        .showNotice(this.notices.invalid_own_card, "WARNING");
      this.cancelTarget();
      return;
    }

    if (!isValidTargetType) {
      this.context
        .getUI(this.currentAttacker.owner)
        .showNotice(this.notices.select_attack_target, "WARNING");
      return;
    }

    this.isSelectingTarget = false;
    this.executeAttack(this.currentAttacker, target);

    this.cancelTarget();
  }

  public cancelTarget() {
    if (this.currentAttacker) {
      EventBus.emit(GameEvent.ATTACK_CANCELED, {
        attacker: this.currentAttacker,
      });
      if (!this.currentAttacker.hasAttacked) {
        this.currentAttacker.setAlpha(1);
      }
    }
    this.isSelectingTarget = false;
    this.currentAttacker = null;
  }

  private executeAttack(attacker: Card, target: Card) {
    const { DURATIONS, EASING } = THEME_CONFIG.ANIMATIONS;

    EventBus.emit(GameEvent.ATTACK_DECLARED, { attacker, target });

    this.context.tweens.add({
      targets: attacker,
      x: target.x,
      y: target.y,
      duration: DURATIONS.NORMAL,
      ease: EASING.BOUNCE,
      yoyo: true, //attacker return into original pos
      onYoyoAll: () => {
        this.triggerImpactEffects(target);

        if (target.isFaceDown) target.setFaceUp();
        const isTargetDefenseMode = target.angle === 270;

        if (isTargetDefenseMode) {
          this.resolveAtkVsDef(attacker, target);
        } else {
          this.resolveAtkVsAtk(attacker, target);
        }
      },
      onComplete: () => {
        const side = attacker.owner;
        const monsterSlots = this.context.field.monsterSlots[side];
        const monsterStillOnField = monsterSlots.includes(attacker);

        if (monsterStillOnField) {
          attacker.hasAttacked = true;
          attacker.setAlpha(0.7);
        }
      },
    });
  }

  private executeDirectAttack(attacker: Card, targetSide: GameSide) {
    const { DURATIONS, EASING, SHAKES } = THEME_CONFIG.ANIMATIONS;
    const damage = attacker.getCardData().atk ?? 0;

    const targetY = targetSide === "OPPONENT" ? 50 : 650;
    const targetX = 650;

    this.context.tweens.add({
      targets: attacker,
      y: targetY,
      x: targetX,
      duration: DURATIONS.NORMAL,
      ease: EASING.BOUNCE,
      yoyo: true, //attacker return into original pos
      onYoyoAll: () => {
        this.context.cameras.main.shake(
          SHAKES.MEDIUM.duration,
          SHAKES.MEDIUM.intensity,
        );
        EventBus.emit(GameEvent.DIRECT_ATTACK, {
          attacker,
          targetSide,
          damage,
        });
      },
      onComplete: () => {
        const side = attacker.owner;
        const monsterSlots = this.context.field.monsterSlots[side];
        const monsterStillOnField = monsterSlots.includes(attacker);

        if (monsterStillOnField) {
          attacker.hasAttacked = true;
          attacker.setAlpha(0.7);
        }
      },
    });
  }

  private resolveAtkVsDef(attacker: Card, target: Card) {
    const attackerAtk = attacker.getCardData().atk ?? 0;
    const targetDef = target.getCardData().def ?? 0;

    const targetSide = target.owner;

    let diff: number = 0;
    let winner: Card | null = null;

    switch (true) {
      case attackerAtk > targetDef:
        winner = attacker;
        this.destroyCard(target, targetSide);
        break;
      case attackerAtk < targetDef:
        winner = target;
        diff = targetDef - attackerAtk;
        break;
      default:
        break;
    }

    EventBus.emit(GameEvent.BATTLE_RESOLVED, {
      attacker,
      target,
      damage: diff,
      winner,
    });
  }

  private resolveAtkVsAtk(attacker: Card, target: Card) {
    const attackerAtk = attacker.getCardData().atk ?? 0;
    const targetAtk = target.getCardData().atk ?? 0;

    const attackerSide = attacker.owner;
    const targetSide = target.owner;

    let winner: Card | null = null;
    let damageToApply: number = 0;

    switch (true) {
      case attackerAtk > targetAtk: {
        winner = attacker;
        damageToApply = attackerAtk - targetAtk;
        this.destroyCard(target, targetSide);
        break;
      }
      case targetAtk > attackerAtk: {
        winner = target;
        damageToApply = targetAtk - attackerAtk;
        this.destroyCard(attacker, attackerSide);
        break;
      }
      default:
        //destroy both
        this.destroyCard(target, targetSide);
        this.destroyCard(attacker, attackerSide, true);
        break;
    }

    EventBus.emit(GameEvent.BATTLE_RESOLVED, {
      attacker,
      damage: damageToApply,
      target,
      winner,
    });
  }

  public triggerImpactEffects(target: Card) {
    const { COLORS, ANIMATIONS } = THEME_CONFIG;
    const { MEDIUM } = ANIMATIONS.SHAKES;
    this.context.cameras.main.shake(MEDIUM.duration, MEDIUM.intensity);

    this.applyTint(target, COLORS.TINT_IMPACT);
    this.context.time.delayedCall(100, () => this.applyTint(target, null));
  }

  public destroyCard(
    card: Card,
    side: GameSide,
    silentEffect: boolean = false,
  ) {
    const { DURATIONS, EASING } = THEME_CONFIG.ANIMATIONS;
    const currentSlots = card.getType().includes("MONSTER")
      ? this.context.field["monsterSlots"][side]
      : this.context.field["spellSlots"][side];

    // if card isnt in slot returns
    if (currentSlots.indexOf(card) === -1) return;

    this.context.field.releaseSlot(card, side);
    card.disableInteractive();

    if (silentEffect) {
      this.context.tweens.add({
        targets: card,
        alpha: 0,
        duration: DURATIONS.NORMAL,
        onComplete: () => {
          card.setFaceUp();
          this.context.field.moveToGraveyard(card);
          card.setAlpha(1);
        },
      });
      return;
    }

    this.context.tweens.add({
      targets: card,
      alpha: 0,
      scale: 1.4,
      duration: DURATIONS.SLOW,
      ease: EASING.EXPO_OUT,
      onStart: () => {
        this.applyTint(card, THEME_CONFIG.COLORS.TINT_IMPACT);
      },
      onComplete: () => {
        card.setFaceUp();
        this.context.field.moveToGraveyard(card);

        card.setAlpha(1);
        card.setScale(1);
        this.applyTint(card, null);
      },
    });
  }

  private applyTint(card: Card, color: number | null) {
    card.visualElements.iterate((child: Phaser.GameObjects.Sprite) => {
      if (color === null) {
        if (child.clearTint) child.clearTint();
      } else {
        if (child.setTint) child.setTint(color);
      }
    });
  }
}
