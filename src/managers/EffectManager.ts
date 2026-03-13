import type { IEffectManager } from "../interfaces/IEffectManager";
import type { IBattleContext } from "../interfaces/IBattleContext";
import type { Card } from "../objects/Card";
import type {
  ActionEffect,
  CardEffect,
  EffectTypes,
} from "../types/EffectTypes";
import type { GameSide, PlacementMode } from "../types/GameTypes";
import { EventBus } from "../events/EventBus";
import { GameEvent } from "../events/GameEvents";

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

    EventBus.on(GameEvent.PHASE_CHANGED, () => this.stopTargeting());

    this.handlerEffects = {
      BURN: (effect, side) => {
        const amount = -(effect.value || 0);
        EventBus.emit(GameEvent.LP_CHANGED, { side, amount });
      },
      HEAL: (effect, side) => {
        const amount = effect.value || 0;
        EventBus.emit(GameEvent.LP_CHANGED, { side, amount });
      },
      DRAW_CARD: (effect, side) => this.handleDraw(effect, side),
      GAIN_MANA: (effect, side) => {
        const amount = effect.value || 0;
        EventBus.emit(GameEvent.MANA_CHANGED, { side, amount });
      },
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
      REVIVE: (effect, _side, source) => this.handleRevive(effect, source),
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

    EventBus.emit(GameEvent.EFFECT_ACTIVATED, { card, effect });

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

  private handleRevive(effect: CardEffect, source: Card) {
    const targetSide = effect.targetSide || "OWNER";

    const allowedSides = this.getEffectTargets(source.owner, targetSide);

    const hasAnyValidCard = allowedSides.some((side) =>
      this.context.field.graveyardSlot[side].some((card) =>
        this.validateType(card, effect),
      ),
    );

    if (!hasAnyValidCard) {
      this.context
        .getUI(source.owner)
        .showNotice(this.notices.no_valid_graveyard, "WARNING");
      this.stopTargeting();
      return;
    }

    //option to choose between both cemeteries
    if (targetSide == "BOTH") {
      this.prepareTargeting(effect, source, this.notices.select_graveyard);
    } else {
      //if target side is owner open source owner graveyard, else open contrary graveyard
      const sideOpen =
        targetSide == "OWNER"
          ? source.owner
          : this.getOpponentSide(source.owner);
      this.openGraveyardList(sideOpen, effect, source);
    }
  }

  private openGraveyardList(side: GameSide, effect: CardEffect, source: Card) {
    const graveyardCards = this.context.field.graveyardSlot[side];

    const validCards = graveyardCards.filter((card) =>
      this.validateType(card, effect),
    );

    if (validCards.length == 0) {
      const targetType = (effect as ActionEffect).targetType || "SPELL";

      const typeLabel =
        this.context.translationText.card_types[targetType] || targetType;

      const message = this.notices.no_target_type_found.replace(
        "{type}",
        typeLabel,
      );
      this.context.getUI(source.owner).showNotice(message, "NEUTRAL");

      if (effect.targetSide !== "BOTH") {
        this.stopTargeting();
      }
      return;
    }

    if (source.owner == "PLAYER") {
      this.isSelectingTarget = true;
      this.pendingEffect = effect;
      this.pendingSource = source;

      this.context.engine.scene.launch("CardListScene", {
        cards: validCards,
        isSelectionMode: true,
        onSelect: (selectedCard: Card) => {
          this.handleCardSelection(selectedCard);
        },
      });
    } else {
      //TODO: opponent logic to select better card by: atk, def, spell or target effect
    }
  }

  public onGraveyardClicked(side: GameSide) {
    if (!this.pendingEffect || this.pendingEffect.type !== "REVIVE") return;

    this.openGraveyardList(side, this.pendingEffect, this.pendingSource!);
  }

  //translated by the card's owner and defines the final target (player || opponent || player & opponent)
  private getEffectTargets(owner: GameSide, targetSide: string): GameSide[] {
    const opponent = owner == "PLAYER" ? "OPPONENT" : "PLAYER";
    if (targetSide == "OWNER") return [owner];
    if (targetSide == "OPPONENT") return [opponent];

    return ["PLAYER", "OPPONENT"];
  }

  public cancelTargeting(): void {
    const source = this.pendingSource!;
    this.stopTargeting();

    EventBus.emit(GameEvent.TARGETING_CANCELED, { source, type: "EFFECT" });
  }

  private getOpponentSide(side: GameSide): GameSide {
    return side == "PLAYER" ? "OPPONENT" : "PLAYER";
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
      REVIVE: (target, source) => {
        const side = source.owner;
        const isMonster = target.getCardData().type.includes("MONSTER");

        //remove from graveyard
        this.context.field.releaseSlot(target, target.owner);

        //update target owner to enable btn attack option
        target.setOwner(source.owner);

        if (isMonster) {
          const slot = this.context.field.getFirstAvailableSlot(
            side,
            "MONSTER",
          );

          if (slot) {
            if (side == "PLAYER") {
              this.context.field.previewPlacement(target, slot.x, slot.y);
              this.context
                .getUI("PLAYER")
                .showSelectionMenu(
                  slot.x,
                  slot.y,
                  target,
                  (mode: PlacementMode) => {
                    this.context.field.occupySlot(
                      side,
                      "MONSTER",
                      slot.index,
                      target,
                    );

                    this.context.field.playCardToZone(
                      target,
                      slot.x,
                      slot.y,
                      mode,
                    );
                  },
                );
            } else {
              this.context.field.occupySlot(
                side,
                "MONSTER",
                slot.index,
                target,
              );
              this.context.field.playCardToZone(target, slot.x, slot.y, "ATK");
            }
          } else {
            this.context
              .getUI(side)
              .showNotice(this.notices.field_full, "WARNING");
            this.context.field.moveToGraveyard(target, target.owner);
          }
        } else {
          const hand = this.context.getHand(side);

          target.setLocation("HAND");

          hand.addCardBack(target);
        }
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

      EventBus.emit(GameEvent.EFFECT_RESOLVED, {
        source: this.pendingSource,
        target,
      });
    }

    this.stopTargeting();
  }

  public prepareTargeting(
    effect: CardEffect,
    source: Card,
    customMessage?: string,
  ) {
    this.isSelectingTarget = true;
    this.pendingEffect = effect;
    this.pendingSource = source;

    const message = customMessage || this.notices.select_target;

    EventBus.emit(GameEvent.TARGETING_STARTED, {
      source,
      type: "EFFECT",
      message,
    });
  }

  private stopTargeting() {
    this.isSelectingTarget = false;
    this.pendingEffect = null;
    this.pendingSource = null;
  }
}
