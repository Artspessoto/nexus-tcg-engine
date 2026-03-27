import Phaser from "phaser";
import type { IBattleContext } from "../interfaces/IBattleContext";
import { Card } from "../objects/Card";
import { CARD_DATABASE } from "../constants/CardDatabase";
import type { GameSide } from "../types/GameTypes";
import type { IHandManager } from "../interfaces/IHandManager";
import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { THEME_CONFIG } from "../constants/ThemeConfig";
import { EventBus } from "../events/EventBus";
import { GameEvent, type CardPlayedPayload } from "../events/GameEvents";
import { Logger } from "../utils/Logger";

export class HandManager implements IHandManager {
  private context: IBattleContext;
  public hand: Card[] = [];
  private side: GameSide;

  public currentHandY: number; //hand position
  public readonly hiddenY: number; //hidden hand cards
  public readonly normalY: number;
  public readonly maxHandSize: number;

  constructor(context: IBattleContext, side: GameSide) {
    this.context = context;
    this.side = side;

    const config = LAYOUT_CONFIG.HAND[side];
    this.normalY = config.NORMAL_Y;
    this.hiddenY = config.HIDDEN_Y;
    this.maxHandSize = LAYOUT_CONFIG.HAND.MAX_CARDS;

    this.currentHandY = this.normalY;

    EventBus.on(GameEvent.PHASE_CHANGED, () => {
      this.showHand();
    });

    EventBus.on(GameEvent.CARD_PLAYED, (data: CardPlayedPayload) => {
      if (data.card.owner == this.side) {
        this.showHand();
      }
    });

    EventBus.on(GameEvent.TARGETING_STARTED, (data) => {
      if (this.side == "PLAYER" && data.type == "ATTACK") {
        this.hideHand();
      }
    });

    EventBus.on(GameEvent.ATTACK_CANCELED, () => {
      if (this.side === "PLAYER") this.showHand();
    });

    EventBus.on(GameEvent.BATTLE_RESOLVED, () => {
      if (this.side === "PLAYER") this.showHand();
    });

    EventBus.on(GameEvent.DIRECT_ATTACK, () => {
      if (this.side === "PLAYER") this.showHand();
    });
  }

  public get cards(): Card[] {
    return this.hand;
  }

  public hideHand() {
    this.currentHandY = this.hiddenY;
    this.reorganizeHand();
  }

  public showHand() {
    this.currentHandY = this.normalY;
    this.context.time.delayedCall(500, () => {
      this.reorganizeHand();
    });
  }

  public drawCard(deckPosition: { x: number; y: number }) {
    const { DEPTHS } = THEME_CONFIG;
    if (this.hand.length >= this.maxHandSize) {
      EventBus.emit(GameEvent.HAND_FULL, { side: this.side });
      return;
    }

    const cardData = this.getRandomCardData();

    const newCard = new Card(
      this.context.engine,
      deckPosition.x,
      deckPosition.y,
      cardData,
      this.side,
      this.side,
    );

    if (this.side == "OPPONENT") {
      newCard.setFaceDown(); //show back card in oponent hand
      newCard.disableInteractive();
    } else {
      this.context.controls.setupCardInteractions(newCard);
    }

    newCard.setLocation("HAND");

    newCard.setDepth(DEPTHS.HAND_CARDS);
    this.hand.push(newCard);

    EventBus.emit(GameEvent.CARD_DRAW, { card: newCard, side: this.side });

    this.animateCardEntry(newCard);
    this.reorganizeHand();
  }

  public getRandomCardData() {
    const keys = Object.keys(CARD_DATABASE);
    const randomKey = keys[Phaser.Math.Between(0, keys.length - 1)];
    return CARD_DATABASE[randomKey];
  }

  public animateCardEntry(card: Card) {
    const { DURATIONS } = THEME_CONFIG.ANIMATIONS;
    card.setAngle(-22); // buy card angle
    card.setAlpha(0);
    this.context.tweens.add({
      targets: card,
      alpha: 1,
      duration: DURATIONS.FAST,
    });
  }

  public reorganizeHand() {
    const { COMPONENTS, ANIMATIONS } = THEME_CONFIG;
    const { SCREEN, HAND } = LAYOUT_CONFIG;
    const spacing = HAND.SPACING; // cards gap between
    const centerX = SCREEN.CENTER_X; // center of the screen

    const totalHandWidth = (this.hand.length - 1) * spacing;
    const startX = centerX - totalHandWidth / 2;

    this.hand.forEach((card, index) => {
      const targetX = startX + index * spacing;
      const cardScale = COMPONENTS.CARD.SCALES;
      const finalScale =
        this.side == "PLAYER" ? cardScale.PLAYER_HAND : cardScale.DEFAULT_HAND;

      card.setDepth(100 + index);

      this.context.tweens.add({
        targets: card,
        x: targetX,
        y: this.currentHandY,
        angle: 0,
        scale: finalScale,
        duration: ANIMATIONS.DURATIONS.SLOW, // 0.5s
        // ease: "Power2",
        ease: ANIMATIONS.EASING.BOUNCE,
      });
    });
  }

  public isCardInHand(card: Card): boolean {
    return this.hand.includes(card);
  }

  public removeCard(card: Card): boolean {
    if (!this.isCardInHand(card)) {
      Logger.error(
        `[HandManager] attempt to remove a non-existent card from ${this.side}'s hand.`,
        { invalidTarget: card },
      );
      return false
    }
    this.hand = this.hand.filter((handCard) => handCard !== card);
    this.reorganizeHand();
    return true;
  }

  public addCardBack(card: Card) {
    this.context.tweens.killTweensOf(card);
    this.context.tweens.killTweensOf(card.visualElements);

    card.setHandVisuals();

    // reset internal scale
    card.visualElements.setScale(1);
    card.visualElements.setY(0);

    card.removeAllListeners();

    if (card.owner == "OPPONENT") {
      card.setFaceDown();
      card.disableInteractive();
    } else {
      this.context.controls.setupCardInteractions(card);
      card.setFaceUp();
    }

    this.hand.push(card);
    this.showHand();
  }
}
