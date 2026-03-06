import type { IEffectManager } from "../interfaces/IEffectManager";
import type { IBattleContext } from "../interfaces/IBattleContext";
import type { Card } from "../objects/Card";
import type { CardEffect, EffectTypes } from "../types/EffectTypes";
import type { GameSide } from "../types/GameTypes";

export class EffectManager implements IEffectManager {
  private context: IBattleContext;
  public isSelectingTarget: boolean = false;
  private pendingEffect: CardEffect | null = null;
  private pendingSource: Card | null = null;
  private handlerEffects: Record<
    EffectTypes,
    (effect: CardEffect, side: GameSide, source: Card) => void
  >;

  constructor(context: IBattleContext) {
    this.context = context;

    this.handlerEffects = {
      BURN: (effect, side) =>
        this.context.getUI(side).updateLP(side, -(effect.value || 0)),
      HEAL: (effect, side) =>
        this.context.getUI(side).updateLP(side, effect.value || 0),
      DRAW_CARD: (effect, side) => this.handleDraw(effect, side),
      GAIN_MANA: (effect, side) =>
        this.context.getUI(side).updateMana(effect.value || 0),
      BOOST_ATK: (effect, _side, source) =>
        this.prepareTargeting(effect, source),
      NERF_ATK: (effect, _side, source) =>
        this.prepareTargeting(effect, source),
      BOOST_DEF: (effect, _side, source) =>
        this.prepareTargeting(effect, source),
      NERF_DEF: (effect, _side, source) =>
        this.prepareTargeting(effect, source),
      CHANGE_POS: (effect, _side, source) =>
        this.prepareTargeting(effect, source),
      DESTROY: (effect, _side, source) => this.prepareTargeting(effect, source),
      BOUNCE: (effect, _side, source) => this.prepareTargeting(effect, source),
      NEGATE: (effect, _side, source) => this.prepareTargeting(effect, source),
      REVIVE: (effect, _side, source) => this.prepareTargeting(effect, source),
      PROTECT: () => console.log(""),
    };
  }

  private get notices() {
    return this.context.translationText.effect_notices;
  }

  public applyCardEffect(card: Card) {
    this.stopTargeting();
    const effect = card.getCardData().effects;
    if (!effect) return;

    const targets = this.getEffectTargets(
      card.owner,
      effect.targetSide || "OPPONENT",
    );

    targets.forEach((side) => {
      this.executeCardEffect(effect, side, card);
    });
  }

  private executeCardEffect(
    effect: CardEffect,
    side: GameSide,
    sourceCard: Card,
  ) {
    const handler = this.handlerEffects[effect.type];

    if (handler) {
      handler(effect, side, sourceCard);
    } else {
      console.log(`${effect.type} não criado até o momento`);
    }
  }

  private handleDraw(effect: CardEffect, side: GameSide) {
    const count = effect.value || 0;
    const hand = this.context.getHand(side);
    const deck = this.context.getDeck(side);
    for (let i = 0; i < count; i++) {
      hand.drawCard(deck.position);
    }
  }

  private getEffectTargets(owner: GameSide, targetSide: string): GameSide[] {
    const opponent = owner == "PLAYER" ? "OPPONENT" : "PLAYER";
    if (targetSide == "OWNER") return [owner];
    if (targetSide == "OPPONENT") return [opponent];

    return ["PLAYER", "OPPONENT"];
  }

  public cancelTargeting(): void {
    this.stopTargeting();
    this.context.getUI("PLAYER").showNotice("CANCELADO", "NEUTRAL");
  }

  private targetResolution: Partial<
    Record<
      EffectTypes,
      (target: Card, source: Card, effect: CardEffect) => void
    >
  > = (() => {
    const destroyResolver = (target: Card) =>
      this.context.combat.destroyCard(target, target.owner);

    const statResolver =
      (type: "atk" | "def", isBuff: boolean) =>
      (target: Card, _source: Card, effect: CardEffect) => {
        //BUG: this effect apply into all same cards (need to apply just to target selected)
        const current =
          type === "atk"
            ? target.getCardData().atk || 0
            : target.getCardData().def || 0;
        const value = effect.value || 0;
        const finalValue = isBuff
          ? current + value
          : Math.max(0, current - value); //prevents value lower than 0
        target.updateStat(finalValue, type);
      };

    return {
      BOOST_ATK: statResolver("atk", true),
      NERF_ATK: statResolver("atk", false),
      BOOST_DEF: statResolver("def", true),
      NERF_DEF: statResolver("def", false),
      DESTROY: destroyResolver,
      CHANGE_POS: (target, source) => {
        if (target.isFaceDown) {
          this.context.getUI(source.owner).handleFlipSummon(target);
        } else {
          this.context.getUI(source.owner).handleChangePosition(target);
        }
      },
      BOUNCE: (target) => {
        const hand = this.context.getHand(target.owner);

        this.context.field.releaseSlot(target, target.owner);
        target.resetStats();

        target.setLocation("HAND");

        hand.addCardBack(target);
      },
    };
  })();

  private targetValidations: Partial<
    Record<EffectTypes, (target: Card, effect: CardEffect) => boolean>
  > = {
    BOOST_ATK: (target) => target.getType().includes("MONSTER"),
    NERF_ATK: (target) => target.getType().includes("MONSTER"),
    BOOST_DEF: (target) => target.getType().includes("MONSTER"),
    NERF_DEF: (target) => target.getType().includes("MONSTER"),
    CHANGE_POS: (target) => target.getType().includes("MONSTER"),
    REVIVE: (target, effect) => this.validateType(target, effect),
    DESTROY: (target, effect) => this.validateType(target, effect),
    BOUNCE: (target, effect) => this.validateType(target, effect),
  };

  private validateType(target: Card, effect: CardEffect): boolean {
    if (!("targetType" in effect) || !effect.targetType) return true;

    //verify target card type == effect target (source)
    //ex: target (monster) == bounce effect for monster card
    return target.getType().includes(effect.targetType);
  }

  public handleCardSelection(target: Card) {
    if (!this.pendingEffect || !this.pendingSource) return;

    //prevents select source card to apply effect
    if (target == this.pendingSource) return;

    const validator = this.targetValidations[this.pendingEffect.type];

    //check if validator exists for pendingEffect type and apply validation
    if (validator && !validator(target, this.pendingEffect)) {
      this.context
        .getUI(this.pendingSource.owner)
        .showNotice(this.notices.invalid_target, "WARNING");
      return;
    }

    const resolve = this.targetResolution[this.pendingEffect.type];
    if (resolve) {
      resolve(target, this.pendingSource, this.pendingEffect);
    }

    this.stopTargeting();
  }

  public prepareTargeting(effect: CardEffect, source: Card) {
    this.isSelectingTarget = true;
    this.pendingEffect = effect;
    this.pendingSource = source;
    this.context
      .getUI(source.owner)
      .showNotice(this.notices.select_target, "NEUTRAL");
  }

  private stopTargeting() {
    this.isSelectingTarget = false;
    this.pendingEffect = null;
    this.pendingSource = null;
  }
}
