import { THEME_CONFIG } from "../constants/ThemeConfig";
import { EventBus } from "../events/EventBus";
import { GameEvent, type CardSentToGYPayload } from "../events/GameEvents";
import type { IBattleContext } from "../interfaces/IBattleContext";
import type { ICombatManager } from "../interfaces/ICombatManager";
import type { Card } from "../objects/Card";
import type { GameSide } from "../types/GameTypes";
import { Logger } from "../utils/Logger";

export class CombatManager implements ICombatManager {
  private context: IBattleContext;
  public isSelectingTarget: boolean = false;
  public currentAttacker: Card | null = null;
  public isAnimating: boolean = false;

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

  public async prepareTargeting(attacker: Card): Promise<void> {
    const opponentSide = attacker.owner == "PLAYER" ? "OPPONENT" : "PLAYER";
    const existsMonstersIntoField = this.context.field.monsterSlots[
      opponentSide
    ].some((slot) => slot !== null);

    if (!existsMonstersIntoField) {
      await this.triggerActivation(opponentSide);

      const isExecuteDirectAttackValid = attacker && attacker.active;

      if (!isExecuteDirectAttackValid) {
        this.cancelTarget();
        return;
      }

      EventBus.emit(GameEvent.NOTICE_REQUESTED, {
        message: this.notices.direct_attack,
        type: "WARNING",
      });

      attacker.setAlpha(0.7);

      await this.delay(200);

      await this.executeDirectAttack(attacker, opponentSide);
      this.currentAttacker = null;
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

  public async handleCardSelection(target: Card): Promise<void> {
    if (!this.isSelectingTarget || !this.currentAttacker || this.isAnimating)
      return;

    this.isSelectingTarget = false;

    if (this.context.gameState.currentPhase !== "BATTLE") {
      this.cancelTarget();
      return;
    }
    const attackOwnCard = target.owner === this.currentAttacker.owner;
    const isValidTargetType = target.getType().includes("MONSTER");

    await this.triggerActivation(target.owner);

    const isCombatStillValid =
      this.currentAttacker &&
      this.currentAttacker.active &&
      target &&
      target.active &&
      target.location === "FIELD";

    if (!isCombatStillValid) {
      this.cancelTarget();
      return;
    }

    if (attackOwnCard) {
      EventBus.emit(GameEvent.NOTICE_REQUESTED, {
        message: this.notices.invalid_own_card,
        type: "WARNING",
      });
      this.cancelTarget();
      return;
    }

    if (!isValidTargetType) {
      EventBus.emit(GameEvent.NOTICE_REQUESTED, {
        message: this.notices.select_attack_target,
        type: "WARNING",
      });
      return;
    }

    await this.executeAttack(this.currentAttacker, target);

    this.cancelTarget();
  }

  private async triggerActivation(side: GameSide): Promise<void> {
    if (!this.currentAttacker) return;

    const checkResponse = await this.checkOpponentResponse(side);

    if (checkResponse) {
      const triggerCard =
        await this.context.effects.selectResponseActivationSource(side);

      if (triggerCard) {
        if (!this.currentAttacker || !this.currentAttacker.active) {
          Logger.debug(
            "COMBAT",
            "Attack canceled. The attacking monster/warrior was negated/destroyed by the effect",
          );
          this.cancelTarget();
          return;
        }
      }
    }
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

  private executeAttack(attacker: Card, target: Card): Promise<void> {
    if (!attacker.active || !target.active) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const { DURATIONS, EASING } = THEME_CONFIG.ANIMATIONS;
      attacker.hasAttacked = true;
      attacker.setAlpha(0.7);

      this.isAnimating = true;

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

          const isTargetDefenseMode =
            target.angle == 270 || target.angle == -90;

          if (isTargetDefenseMode) {
            if (target.isFaceDown) target.setFaceUp();
            this.resolveAtkVsDef(attacker, target);
          } else {
            if (target.isFaceDown) target.setFaceUp();
            this.resolveAtkVsAtk(attacker, target);
          }
        },
        onComplete: () => {
          this.isAnimating = false;
          resolve();
        },
      });
    });
  }

  private executeDirectAttack(
    attacker: Card,
    targetSide: GameSide,
  ): Promise<void> {
    return new Promise((resolve) => {
      const { DURATIONS, EASING, SHAKES } = THEME_CONFIG.ANIMATIONS;
      const damage = attacker.getCardData().atk ?? 0;

      attacker.hasAttacked = true;
      attacker.setAlpha(0.7);

      this.isAnimating = true;

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
          this.isAnimating = false;
          resolve();
        },
      });
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

    card.active = false;
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

  private async checkOpponentResponse(
    defenderSide: GameSide,
  ): Promise<boolean> {
    if (defenderSide === "OPPONENT") {
      // TODO: npc response with trap or effect monster
      return false;
    }

    const monsters = this.context.field.monsterSlots[defenderSide];
    const spells = this.context.field.spellSlots[defenderSide];

    const hasEffectMonster = monsters.some(
      (c) => c?.getType() === "EFFECT_MONSTER",
    );
    const hasTrap = spells.some((c) => c?.getType() === "TRAP");

    if (!hasEffectMonster && !hasTrap) return false;

    if (defenderSide == "PLAYER") {
      return await this.context.getUI("PLAYER").showTrapResponseAction();
    } else {
      //TODO: npc response
    }

    return false;
  }

  private delay(ms: number) {
    return new Promise((resolve) => this.context.time.delayedCall(ms, resolve));
  }

  public handleGlobalClick(card: Card) {
    if (!this.isSelectingTarget) return;

    this.handleCardSelection(card);
  }
}
