import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { THEME_CONFIG } from "../constants/ThemeConfig";
import { EventBus } from "../events/EventBus";
import { GameEvent, type PhaseChangedPayload } from "../events/GameEvents";
import type { IBattleContext } from "../interfaces/IBattleContext";
import type {
  IFieldManager,
  IFieldPlayResult,
} from "../interfaces/IFieldManager";
import type { Card } from "../objects/Card";
import type { GameSide, PlacementMode } from "../types/GameTypes";

export class FieldManager implements IFieldManager {
  private context: IBattleContext;

  //null = empty slot, Card = slot full
  public monsterSlots = {
    PLAYER: [null, null, null] as (Card | null)[],
    OPPONENT: [null, null, null] as (Card | null)[],
  };

  public spellSlots = {
    PLAYER: [null, null, null] as (Card | null)[],
    OPPONENT: [null, null, null] as (Card | null)[],
  };

  public graveyardSlot = {
    PLAYER: [] as Card[],
    OPPONENT: [] as Card[],
  };

  constructor(context: IBattleContext) {
    this.context = context;

    EventBus.on(GameEvent.PHASE_CHANGED, (data: PhaseChangedPayload) => {
      if (data.newPhase == "CHANGE_TURN") {
        this.resetAttackFlags();
      }
    });
  }

  public setupFieldZones() {
    const { FIELD } = LAYOUT_CONFIG;
    const sides: GameSide[] = ["PLAYER", "OPPONENT"];

    sides.forEach((side) => {
      //Monster Zones
      FIELD[side].MONSTER.forEach((pos, i) => {
        this.context.add
          .zone(pos.x, pos.y, FIELD.ZONE_SIZE.W, FIELD.ZONE_SIZE.H)
          .setRectangleDropZone(FIELD.ZONE_SIZE.W, FIELD.ZONE_SIZE.H)
          .setData("type", "MONSTER")
          .setData("side", side)
          .setData("index", i);
      });

      //Spell/Trap Zones
      FIELD[side].SPELL.forEach((pos, i) => {
        this.context.add
          .zone(pos.x, pos.y, FIELD.ZONE_SIZE.W, FIELD.ZONE_SIZE.H)
          .setRectangleDropZone(FIELD.ZONE_SIZE.W, FIELD.ZONE_SIZE.H)
          .setData("type", "SPELL")
          .setData("side", side)
          .setData("index", i);
      });
    });
  }

  public getFirstAvailableSlot(side: GameSide, type: "MONSTER" | "SPELL") {
    const { FIELD } = LAYOUT_CONFIG;
    const slots =
      type == "MONSTER" ? this.monsterSlots[side] : this.spellSlots[side];
    const coords = type === "MONSTER" ? FIELD[side].MONSTER : FIELD[side].SPELL;

    for (let i = 0; i < slots.length; i++) {
      //return first slot to use
      if (slots[i] == null) {
        //response format: { x: 505, y: 450, index: i }
        return { ...coords[i], index: i };
      }
    }

    return null;
  }

  public occupySlot(
    side: GameSide,
    type: "MONSTER" | "SPELL",
    index: number,
    card: Card,
  ) {
    if (type == "MONSTER") this.monsterSlots[side][index] = card;
    else this.spellSlots[side][index] = card;
  }

  public releaseSlot(card: Card, side: GameSide) {
    const isMonster = card.getType().includes("MONSTER");
    const fieldSlots = isMonster
      ? this.monsterSlots[side]
      : this.spellSlots[side];

    //find card position into array
    const fieldIndex = fieldSlots.indexOf(card);

    //card found and remove from slots
    if (fieldIndex !== -1) {
      fieldSlots[fieldIndex] = null;

      EventBus.emit(GameEvent.CARD_LEFT_FIELD, { card, side });
      return;
    }

    // try to remove from graveyard
    const graveyard = this.graveyardSlot[side];
    const gyIndex = graveyard.indexOf(card);
    if (gyIndex !== -1) {
      graveyard.splice(gyIndex, 1);

      EventBus.emit(GameEvent.CARD_REMOVED_FROM_GRAVEYARD, { card, side });
    }
  }

  public getValidSlotToPlay(
    card: Card,
    side: GameSide,
    zoneType: "MONSTER" | "SPELL",
  ): IFieldPlayResult {
    const cardType = card.getType();
    const cardData = card.getCardData();
    const currentMana = this.context.gameState.getMana(side);

    //type card validation
    const isMonsterValid =
      cardType.includes("MONSTER") && zoneType === "MONSTER";
    const isSupportValid =
      (cardType === "SPELL" || cardType === "TRAP") && zoneType === "SPELL";

    if (!isMonsterValid && !isSupportValid) {
      return { valid: false }; // Tipo incompatível com a zona
    }

    //mana cost validation
    if (cardData.manaCost > currentMana)
      return { valid: false, reason: "MANA" };

    //phase validation
    if (this.context.currentPhase !== "MAIN") return { valid: false };

    //available slot validation
    const slot = this.getFirstAvailableSlot(side, zoneType);
    if (!slot) return { valid: false, reason: "SLOT" };

    return { valid: true, slot };
  }

  public validatePlay(
    card: Card,
    zone: Phaser.GameObjects.Zone,
  ): IFieldPlayResult {
    const zoneType: "MONSTER" | "SPELL" = zone.getData("type");
    const zoneSide: GameSide = zone.getData("side");
    const activeSide = this.context.gameState.activePlayer;

    //block to drop card into opponent slot
    if (zoneSide !== activeSide) return { valid: false };

    const result = this.getValidSlotToPlay(card, zoneSide, zoneType);

    if (!result.valid && result.reason) {
      return { valid: false, reason: result.reason };
    }

    return result;
  }

  public playCardToZone(
    card: Card,
    targetX: number,
    targetY: number,
    mode: PlacementMode,
  ) {
    const { SCALES } = THEME_CONFIG.COMPONENTS.CARD;
    const { DURATIONS, SHAKES, EASING } = THEME_CONFIG.ANIMATIONS;
    const currentTurn = this.context.gameState.currentTurn;

    card.disableInteractive();
    this.context.tweens.killTweensOf(card.visualElements);

    card.visualElements.setY(0);
    card.visualElements.setScale(1);
    card.setFieldVisuals();
    card.setLocation("FIELD", currentTurn); //save actual turn and location into card obj

    const isDefense = mode === "DEF";
    const isSet = mode === "SET";
    const isMonster = card.getType().includes("MONSTER");

    const finalAngle = isDefense ? 270 : 0;
    const finalScale = isDefense ? SCALES.FIELD_DEF : SCALES.FIELD_ATK;

    if (isSet || (isMonster && isDefense)) {
      card.setFaceDown();
    } else {
      // mode == ATK or FACE_UP, card face up
      //opponent need this to face up card into field slot (default -> card face down into opponent hand)
      card.setFaceUp();
    }

    EventBus.emit(GameEvent.CARD_PLAYED, {
      card,
      side: card.owner,
      mode,
    });

    // Slot animation movement
    this.context.tweens.add({
      targets: card,
      x: targetX,
      y: targetY,
      angle: finalAngle,
      scale: finalScale,
      duration: DURATIONS.FIELD_PLAY,
      ease: EASING.BOUNCE,
      onComplete: () => {
        // card impact animation effect
        this.context.cameras.main.shake(
          SHAKES.LIGHT.duration,
          SHAKES.LIGHT.intensity,
        );
        card.setDepth(10);

        this.setupFieldInteractions(card);
      },
    });
  }

  public previewPlacement(card: Card, targetX: number, targetY: number) {
    const { ANIMATIONS, COMPONENTS, DEPTHS } = THEME_CONFIG;
    card.disableInteractive();
    this.context.tweens.killTweensOf(card);

    card.visualElements.setY(0);
    card.visualElements.setScale(1);

    this.context.tweens.add({
      targets: card,
      x: targetX,
      y: targetY,
      scale: COMPONENTS.CARD.SCALES.PREVIEW,
      angle: 0,
      duration: ANIMATIONS.DURATIONS.PREVIEW,
      ease: ANIMATIONS.EASING.SMOOTH,
    });

    card.setDepth(DEPTHS.PREVIEW_CARD);
  }

  public moveToGraveyard(card: Card) {
    const { FIELD } = LAYOUT_CONFIG;
    const { COMPONENTS, ANIMATIONS } = THEME_CONFIG;
    this.context.tweens.killTweensOf(card.visualElements);

    const realSide = card.originalOwner;
    const coords = FIELD[realSide].GRAVEYARD;

    //sent to original owner location
    card.setOwner(realSide);

    this.graveyardSlot[realSide].unshift(card);
    card.resetStats();
    card.setLocation("GRAVEYARD");

    EventBus.emit(GameEvent.CARD_SENT_TO_GRAVEYARD, {
      card,
      side: realSide,
    });

    this.context.tweens.add({
      targets: card,
      x: coords.x,
      y: coords.y,
      scale: COMPONENTS.CARD.SCALES.FIELD_ATK,
      angle: 0,
      duration: ANIMATIONS.DURATIONS.SLOW,
      ease: ANIMATIONS.EASING.SMOOTH,
      onStart: () => {
        card.visualElements.setDepth(1000);
      },
      onComplete: () => {
        const arraySize = this.graveyardSlot[realSide].length;
        card.setDepth(10 + arraySize);

        this.setupFieldInteractions(card);
      },
    });
  }

  private setupFieldInteractions(card: Card) {
    card.setInteractive({ cursor: "pointer" });
    card.removeAllListeners();

    card.on("pointerdown", () => {
      const currentX = card.x;
      const currentY = card.y;

      //card in battle mode
      if (this.context.combat.isSelectingTarget) {
        this.context.combat.handleCardSelection(card);
        return;
      }

      if (
        this.context.effects.isSelectingTarget &&
        card.location === "GRAVEYARD"
      ) {
        this.context.effects.onGraveyardClicked(card.owner);
        return;
      }

      //effect card activated
      if (this.context.effects.isSelectingTarget) {
        this.context.effects.handleCardSelection(card);
        return;
      }

      switch (card.location) {
        case "FIELD":
          this.context
            .getUI(card.owner)
            .showFieldCardMenu(currentX, currentY, card);
          this.context.getHand("PLAYER").hideHand();
          break;
        case "GRAVEYARD": {
          const cardOwner = card.owner;
          this.context
            .getUI(cardOwner)
            .showGraveyardMenu(
              this.graveyardSlot[cardOwner],
              currentX,
              currentY,
            );
          break;
        }
        default:
          console.warn("card without local");
          break;
      }
    });
  }

  public resetAttackFlags() {
    const sides: GameSide[] = ["PLAYER", "OPPONENT"];

    sides.forEach((side) => {
      this.monsterSlots[side].forEach((card) => {
        if (card) {
          card.hasAttacked = false;
          card.setAlpha(1);
          card.hasChangedPosition = false;
        }
      });
    });

    EventBus.emit(GameEvent.FIELD_STATS_RESET, { sides });
  }
}
