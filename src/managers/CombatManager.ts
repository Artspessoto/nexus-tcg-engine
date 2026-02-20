import type { Card } from "../objects/Card";
import type { BattleScene } from "../scenes/BattleScene";
import type { GameSide } from "../types/GameTypes";

export class CombatManager {
  private scene: BattleScene;
  public isSelectingTarget: boolean = false;
  public currentAttacker: Card | null = null;

  constructor(scene: BattleScene) {
    this.scene = scene;
  }

  private get notices() {
    return this.scene.translationText.combat_notices;
  }

  public prepareTargeting(attacker: Card) {
    const opponentSide = attacker.owner == "PLAYER" ? "OPPONENT" : "PLAYER";
    const existsMonstersIntoField = this.scene.fieldManager.monsterSlots[
      opponentSide
    ].some((slot) => slot !== null);

    if (!existsMonstersIntoField) {
      this.scene.playerUI.showNotice(this.notices.direct_attack, "WARNING");
      attacker.setAlpha(0.7);

      this.scene.time.delayedCall(100, () => {
        this.executeDirectAttack(attacker, opponentSide);
        this.currentAttacker = null;
      });
      return;
    }

    this.currentAttacker = attacker;
    this.isSelectingTarget = true;
    this.scene.playerUI.showNotice(this.notices.select_target, "NEUTRAL");
    attacker.setAlpha(0.7);
  }

  public handleCardSelection(target: Card) {
    if (!this.isSelectingTarget || !this.currentAttacker) return;

    if (this.scene.currentPhase !== "BATTLE") {
      this.cancelTarget();
      return;
    }
    const attackOwnCard = target.owner === this.currentAttacker.owner;
    const isValidTargetType = target.getType().includes("MONSTER");

    if (attackOwnCard) {
      this.scene.playerUI.showNotice(this.notices.invalid_own_card, "WARNING");
      return;
    }

    if (!isValidTargetType) {
      this.scene.playerUI.showNotice(this.notices.select_target, "WARNING");
      return;
    }

    if (target.owner !== this.currentAttacker.owner) {
      this.executeAttack(this.currentAttacker, target);
    }

    this.cancelTarget();
  }

  public cancelTarget() {
    if (this.currentAttacker) {
      if (!this.currentAttacker.hasAttacked) {
        this.currentAttacker.setAlpha(1);
      }
    }
    this.isSelectingTarget = false;
    this.currentAttacker = null;
  }

  private executeAttack(attacker: Card, target: Card) {
    this.scene.tweens.add({
      targets: attacker,
      x: target.x,
      y: target.y,
      duration: 300,
      ease: "Back.easeIn",
      yoyo: true, //attacker return into original pos
      onYoyo: () => {
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
        attacker.hasAttacked = true;
        attacker.setAlpha(0.7);
      },
    });
  }

  private executeDirectAttack(attacker: Card, targetSide: GameSide) {
    const damage = attacker.getCardData().atk ?? 0;

    const targetY = targetSide === "OPPONENT" ? 50 : 650;

    this.scene.tweens.add({
      targets: attacker,
      y: targetY,
      duration: 300,
      ease: "Back.easeIn",
      yoyo: true, //attacker return into original pos
      onYoyo: () => {
        this.scene.cameras.main.shake(100, 0.003);
        this.getUIManager(targetSide).updateLP(targetSide, -damage);
      },
      onComplete: () => {
        attacker.hasAttacked = true;
        attacker.setAlpha(0.7);
      },
    });
  }

  private resolveAtkVsDef(attacker: Card, target: Card) {
    const attackerAtk = attacker.getCardData().atk ?? 0;
    const targetDef = target.getCardData().def ?? 0;

    const attackerSide = attacker.owner;
    const targetSide = target.owner;

    let diff: number;

    switch (true) {
      case attackerAtk > targetDef:
        this.destroyCard(target, targetSide);
        break;
      case attackerAtk < targetDef:
        diff = targetDef - attackerAtk;
        this.getUIManager(attackerSide).updateLP(attackerSide, -diff);
        break;
      default:
        break;
    }
  }

  private resolveAtkVsAtk(attacker: Card, target: Card) {
    const attackerAtk = attacker.getCardData().atk ?? 0;
    const targetAtk = target.getCardData().atk ?? 0;

    const attackerSide = attacker.owner;
    const targetSide = target.owner;

    let damageToApply: number;

    switch (true) {
      case attackerAtk > targetAtk: {
        damageToApply = attackerAtk - targetAtk;
        this.destroyCard(target, targetSide);
        this.getUIManager(targetSide).updateLP(targetSide, -damageToApply);
        break;
      }
      case targetAtk > attackerAtk: {
        damageToApply = targetAtk - attackerAtk;
        this.destroyCard(attacker, attackerSide);
        this.getUIManager(attackerSide).updateLP(attackerSide, -damageToApply);
        break;
      }
      default:
        //destroy both
        this.destroyCard(target, targetSide);
        this.destroyCard(attacker, attackerSide, true);
        break;
    }
  }

  public triggerImpactEffects(target: Card) {
    this.scene.cameras.main.shake(100, 0.003);

    this.applyTint(target, 0xff0000);
    this.scene.time.delayedCall(100, () => this.applyTint(target, null));
  }

  public destroyCard(
    card: Card,
    side: GameSide,
    silentEffect: boolean = false,
  ) {
    const currentSlots = card.getType().includes("MONSTER")
      ? this.scene.fieldManager["monsterSlots"][side]
      : this.scene.fieldManager["spellSlots"][side];

    // if card isnt in slot returns
    if (currentSlots.indexOf(card) === -1) return;

    this.scene.fieldManager.releaseSlot(card, side);
    card.disableInteractive();

    if (silentEffect) {
      this.scene.tweens.add({
        targets: card,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          this.scene.fieldManager.moveToGraveyard(card, side);
          card.setAlpha(1);
        },
      });
      return;
    }

    this.scene.tweens.add({
      targets: card,
      alpha: 0,
      scale: 1.4,
      duration: 500,
      ease: "Expo.easeOut",
      onStart: () => {
        this.applyTint(card, 0xff0000);
      },
      onComplete: () => {
        this.scene.fieldManager.moveToGraveyard(card, side);

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

  private getUIManager(side: GameSide) {
    return side === "PLAYER" ? this.scene.playerUI : this.scene.opponentUI;
  }
}
