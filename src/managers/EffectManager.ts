import type { IEffectManager } from "../interfaces/IEffectManager";
import type { IBattleContext } from "../interfaces/IBattleContext";
import type { Card } from "../objects/Card";
import type {
  ActionEffect,
  CardEffect,
  EffectTypes,
} from "../types/EffectTypes";
import type {
  EffectInstructions,
  GameSide,
  PlacementMode,
} from "../types/GameTypes";
import { EventBus } from "../events/EventBus";
import { GameEvent } from "../events/GameEvents";
import { Logger } from "../utils/Logger";

export class EffectManager implements IEffectManager {
  private context: IBattleContext;
  public isSelectingTarget: boolean = false;
  private pendingEffect: CardEffect | null = null;
  private pendingSource: Card | null = null;

  //controller for await player choose card response (ex: active trap)
  public isSelectingResponse: boolean = false;

  //resolve a promise that pauses combat while awaiting the choice of response card
  private responseResolver: ((card: Card | null) => void) | null = null;

  //resolve a promise that pauses effect execution (await the target select in field/graveyard)
  private targetingResolver: (() => void) | null = null;

  private handlerEffects: Record<
    EffectTypes,
    (
      effect: CardEffect,
      side: GameSide,
      source: Card,
      AIInstructions?: EffectInstructions,
    ) => Promise<void> | void
  >;

  constructor(context: IBattleContext) {
    this.context = context;

    EventBus.on(GameEvent.PHASE_CHANGED, () => {
      this.stopTargeting();
      this.cleanupResponseState();
    });

    EventBus.on(GameEvent.ACTION_FINALIZED, (data) => {
      if (this.isSelectingResponse) {
        this.finalizeResponse(data.card);
      }
    });

    EventBus.on(GameEvent.FIELD_STATS_RESET, () => {
      this.cancelTargeting();
    });

    this.handlerEffects = {
      BURN: async (effect, side) => {
        const amount = -(effect.value || 0);
        EventBus.emit(GameEvent.LP_CHANGED, { side, amount });
      },
      HEAL: async (effect, side) => {
        const amount = effect.value || 0;
        EventBus.emit(GameEvent.LP_CHANGED, { side, amount });
      },
      DRAW_CARD: async (effect, side) => {
        this.handleDraw(effect, side);
      },
      GAIN_MANA: async (effect, side) => {
        const amount = effect.value || 0;
        EventBus.emit(GameEvent.MANA_CHANGED, { side, amount });
      },
      BOOST_ATK: async (effect, _side, source, AIInstructions) =>
        await this.resolveOrTarget(
          AIInstructions?.target ?? null,
          source,
          effect,
          async (t) => {
            this.targetResolution.BOOST_ATK!(t, source, effect);
          },
        ),
      NERF_ATK: async (effect, _side, source, AIInstructions) =>
        await this.resolveOrTarget(
          AIInstructions?.target ?? null,
          source,
          effect,
          async (t) => {
            this.targetResolution.NERF_ATK!(t, source, effect);
          },
        ),
      BOOST_DEF: async (effect, _side, source, AIInstructions) =>
        await this.resolveOrTarget(
          AIInstructions?.target ?? null,
          source,
          effect,
          async (t) => {
            this.targetResolution.BOOST_DEF!(t, source, effect);
          },
        ),
      NERF_DEF: async (effect, _side, source, AIInstructions) =>
        await this.resolveOrTarget(
          AIInstructions?.target ?? null,
          source,
          effect,
          async (t) => {
            this.targetResolution.NERF_DEF!(t, source, effect);
          },
        ),
      CHANGE_POS: async (effect, _side, source, AIInstructions) => {
        await this.resolveOrTarget(
          AIInstructions?.target ?? null,
          source,
          effect,
          (t) => this.targetResolution.CHANGE_POS!(t, source, effect),
        );
        await new Promise((r) => this.context.time.delayedCall(400, r));
      },
      DESTROY: async (effect, _side, source, AIInstructions) => {
        await this.resolveOrTarget(
          AIInstructions?.target ?? null,
          source,
          effect,
          async (t) => await this.targetResolution.DESTROY!(t, source, effect),
        );
      },
      BOUNCE: async (effect, _side, source, AIInstructions) =>
        await this.resolveOrTarget(
          AIInstructions?.target ?? null,
          source,
          effect,
          async (t) => await this.targetResolution.BOUNCE!(t, source, effect),
        ),
      NEGATE: (effect, _side, source) => this.prepareTargeting(effect, source),
      REVIVE: async (effect, _side, source, AIInstructions) => {
        if (AIInstructions?.target) {
          this.resolveRevive(
            AIInstructions.target,
            source,
            AIInstructions.mode || "ATK",
          );
        } else {
          await this.handleRevive(effect, source);
        }
      },

      PROTECT: () => console.log(""),
    };
  }

  private get notices() {
    return this.context.translationText.effect_notices;
  }

  private async resolveOrTarget(
    aiTarget: Card | null,
    source: Card,
    effect: CardEffect,
    resolution: (target: Card) => Promise<void> | void,
  ) {
    if (aiTarget) {
      const validator = this.targetValidations[effect.type];

      if (validator && !validator(aiTarget, effect)) {
        Logger.error(
          `EffectManager: action blocked. Card: ${source.getCardData().nameKey} try to apply ${effect.type} on an invalid target ${aiTarget}`,
          {
            sourceCard: source,
            invalidTarget: aiTarget,
            effectData: effect,
          },
        );
        return;
      }
      await resolution(aiTarget);
    } else {
      await this.prepareTargeting(effect, source);
    }
  }

  public async applyCardEffect(
    card: Card,
    AIInstructions?: EffectInstructions,
  ): Promise<void> {
    this.stopTargeting();
    const effect = card.getCardData().effects;
    if (!effect) return;

    EventBus.emit(GameEvent.EFFECT_ACTIVATED, { card, effect });

    if (AIInstructions?.target) {
      await this.executeCardEffect(
        effect,
        AIInstructions.target.owner,
        card,
        AIInstructions,
      );
      return;
    }

    const isTargetedEffect = [
      "DESTROY",
      "BOUNCE",
      "NERF_ATK",
      "BOOST_ATK",
      "NERF_DEF",
      "BOOST_DEF",
      "REVIVE",
      "CHANGE_POS",
    ].includes(effect.type);

    if (isTargetedEffect) {
      //target effect dont need side
      await this.executeCardEffect(effect, card.owner, card);
      return;
    }

    //global effects -> BURN, HEAL, DRAW
    const targets = this.getEffectTargets(
      card.owner,
      effect.targetSide || "OPPONENT",
    );
    for (const side of targets) {
      await this.executeCardEffect(effect, side, card, AIInstructions);
    }
  }

  private async executeCardEffect(
    effect: CardEffect,
    side: GameSide,
    sourceCard: Card,
    AIInstructions?: EffectInstructions,
  ): Promise<void> {
    const handler = this.handlerEffects[effect.type];

    if (!handler) return;

    await handler(effect, side, sourceCard, AIInstructions);
  }

  private handleDraw(effect: CardEffect, side: GameSide) {
    const count = effect.value || 0;
    const hand = this.context.getHand(side);
    const deck = this.context.getDeck(side);

    for (let i = 0; i < count; i++) {
      const drawCard = this.context.gameState.setDeckState(side);

      if (drawCard) {
        this.context.time.delayedCall(i * 250, () => {
          hand.drawCard(deck.position, drawCard);
        });
      } else {
        Logger.debug("SYSTEM", "Deck out");
        break;
      }
    }
  }

  private async handleRevive(effect: CardEffect, source: Card): Promise<void> {
    const targetSide = effect.targetSide || "OWNER";

    const allowedSides = this.getEffectTargets(source.owner, targetSide);

    const hasAnyValidCard = allowedSides.some((side) =>
      this.context.field.graveyardSlot[side].some((card) =>
        this.validateType(card, effect),
      ),
    );

    if (!hasAnyValidCard) {
      EventBus.emit(GameEvent.NOTICE_REQUESTED, {
        message: this.notices.no_valid_graveyard,
        type: "WARNING",
      });

      this.stopTargeting();
      return;
    }

    //option to choose between both cemeteries
    if (targetSide == "BOTH") {
      await this.prepareTargeting(
        effect,
        source,
        this.notices.select_graveyard,
      );
    } else {
      //if target side is owner open source owner graveyard, else open contrary graveyard
      const sideOpen =
        targetSide == "OWNER"
          ? source.owner
          : this.getOpponentSide(source.owner);
      await this.openGraveyardList(sideOpen, effect, source);
    }
  }

  private async openGraveyardList(
    side: GameSide,
    effect: CardEffect,
    source: Card,
  ): Promise<void> {
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
      EventBus.emit(GameEvent.NOTICE_REQUESTED, { message, type: "NEUTRAL" });

      if (effect.targetSide !== "BOTH") {
        this.stopTargeting();
      }
      return;
    }

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

    return new Promise((resolve) => {
      this.targetingResolver = resolve;
    });
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
    if (!this.pendingSource || !this.pendingEffect) {
      this.stopTargeting();
      return;
    }

    const source = this.pendingSource;
    const isRevive = this.pendingEffect.type === "REVIVE";

    this.stopTargeting();

    if (this.targetingResolver) {
      this.targetingResolver();
      this.targetingResolver = null;
    }

    if (!isRevive) {
      EventBus.emit(GameEvent.TARGETING_CANCELED, { source, type: "EFFECT" });
    }
  }

  private getOpponentSide(side: GameSide): GameSide {
    return side == "PLAYER" ? "OPPONENT" : "PLAYER";
  }

  private resolveChangePosition(target: Card) {
    const isFaceDown = target.isFaceDown;
    const newMode = target.angle === 270 ? "ATK" : "DEF";
    EventBus.emit(GameEvent.CARD_POSITION_CHANGED, {
      card: target,
      isFlip: isFaceDown,
      newMode,
    });
  }

  private resolveBounce(target: Card) {
    const hand = this.context.getHand(target.owner);
    this.context.field.releaseSlot(target, target.owner);
    target.resetStats();
    target.setLocation("HAND");
    hand.addCardBack(target);
  }

  private resolveRevive(
    target: Card,
    source: Card,
    mode: PlacementMode = "ATK",
  ) {
    const side = source.owner;
    target.active = true;
    const isMonster = target.getCardData().type.includes("MONSTER");

    //remove from graveyard
    this.context.field.releaseSlot(target, target.owner);

    //update target owner to enable btn attack option
    target.setOwner(source.owner);

    if (!isMonster) {
      target.setLocation("HAND");
      this.context.getHand(side).addCardBack(target);
      return;
    }

    const slot = this.context.field.getFirstAvailableSlot(side, "MONSTER");
    if (!slot) {
      EventBus.emit(GameEvent.ZONE_OCCUPIED, { side });
      this.context.field.moveToGraveyard(target);
      return;
    }

    if (side == "PLAYER") {
      this.context.selectedCard = target;
      this.context.field.previewPlacement(target, slot.x, slot.y);
      this.context
        .getUI("PLAYER")
        .showSelectionMenu(slot.x, slot.y, target, (mode: PlacementMode) => {
          this.context.field.occupySlot(side, "MONSTER", slot.index, target);

          this.context.field.playCardToZone(target, slot.x, slot.y, mode);

          this.stopTargeting();
          this.context.selectedCard = null;

          if (this.targetingResolver) {
            this.targetingResolver();
            this.targetingResolver = null;
          }
        });
    } else {
      this.context.selectedCard = target;
      this.context.field.occupySlot(side, "MONSTER", slot.index, target);
      this.context.field.playCardToZone(target, slot.x, slot.y, mode);

      if (this.targetingResolver) {
        this.targetingResolver();
        this.targetingResolver = null;
      }
    }
  }

  private targetResolution: Partial<
    Record<
      EffectTypes,
      (target: Card, source: Card, effect: CardEffect) => Promise<void> | void
    >
  > = {
    BOOST_ATK: (target, _, effect) =>
      target.updateStat(
        (target.getCardData().atk || 0) + (effect.value || 0),
        "atk",
      ),
    NERF_ATK: (target, _, effect) =>
      target.updateStat(
        Math.max(0, (target.getCardData().atk || 0) - (effect.value || 0)),
        "atk",
      ),
    BOOST_DEF: (target, _, effect) =>
      target.updateStat(
        (target.getCardData().def || 0) + (effect.value || 0),
        "def",
      ),
    NERF_DEF: (target, _, effect) =>
      target.updateStat(
        Math.max(0, (target.getCardData().def || 0) - (effect.value || 0)),
        "def",
      ),
    DESTROY: async (target) =>
      this.context.combat.destroyCard(target, target.owner),
    CHANGE_POS: (target) => this.resolveChangePosition(target),
    BOUNCE: async (target) => {
      this.resolveBounce(target);
    },
    REVIVE: (target, source) => this.resolveRevive(target, source),
  };

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
      EventBus.emit(GameEvent.NOTICE_REQUESTED, {
        message: this.notices.invalid_target,
        type: "WARNING",
      });
      return;
    }

    const resolve = this.targetResolution[this.pendingEffect.type];
    if (resolve) {
      resolve(target, this.pendingSource, this.pendingEffect);

      if (this.pendingEffect.type !== "REVIVE") {
        EventBus.emit(GameEvent.EFFECT_RESOLVED, {
          source: this.pendingSource,
          target,
        });

        this.stopTargeting();

        if (this.targetingResolver) {
          this.targetingResolver();
          this.targetingResolver = null;
        }
      }
    }
  }

  public async prepareTargeting(
    effect: CardEffect,
    source: Card,
    customMessage?: string,
  ): Promise<void> {
    this.isSelectingTarget = true;
    this.pendingEffect = effect;
    this.pendingSource = source;

    const message = customMessage || this.notices.select_target;

    EventBus.emit(GameEvent.TARGETING_STARTED, {
      source,
      type: "EFFECT",
      message,
    });

    return new Promise((resolve) => {
      this.targetingResolver = resolve;
    });
  }

  //pause request to use in combat manager (to trigger response trap/effect monster)
  public async selectResponseActivationSource(): Promise<Card | null> {
    this.isSelectingResponse = true;

    return new Promise((resolve) => {
      this.responseResolver = resolve;
    });
  }

  //break the pause and return to combat
  private finalizeResponse(card: Card | null): void {
    this.isSelectingResponse = false;
    if (this.responseResolver) {
      const resolve = this.responseResolver;
      this.responseResolver = null;
      resolve(card);
    }
  }

  public handleGlobalClick(card: Card): void {
    if (this.isSelectingTarget && this.context.selectedCard) {
      return;
    }
    if (this.isSelectingTarget) {
      if (card.location === "GRAVEYARD") {
        this.onGraveyardClicked(card.owner);
      } else {
        this.handleCardSelection(card);
      }
      return;
    }

    if (this.isSelectingResponse) {
      const isValid =
        card.getType() === "TRAP" || card.getType() === "EFFECT_MONSTER";
      const isOwner = card.owner === "PLAYER";

      if (!isValid || !isOwner) {
        EventBus.emit(GameEvent.NOTICE_REQUESTED, {
          message: "SELECIONE UMA CARTA SUA PARA RESPONDER",
          type: "WARNING",
        });
        return;
      }

      EventBus.emit(GameEvent.REQUEST_CARD_MENU, {
        card,
        x: card.x,
        y: card.y,
      });

      return;
    }
  }

  private stopTargeting() {
    this.isSelectingTarget = false;
    this.pendingEffect = null;
    this.pendingSource = null;
  }

  private cleanupResponseState(): void {
    if (this.isSelectingResponse) {
      this.finalizeResponse(null);
    }
  }
}
