import type { IBattleContext } from "../interfaces/IBattleContext";
import { Card } from "../objects/Card";
import { CARD_DATABASE } from "../constants/CardDatabase";
import type { GameSide } from "../types/GameTypes";
import type { IHandManager } from "../interfaces/IHandManager";
import { LAYOUT_CONFIG } from "../constants/LayoutConfig";

export class HandManager implements IHandManager {
  private context: IBattleContext;
  public hand: Card[] = [];
  private side: GameSide;

  private currentHandY: number; //hand position
  private readonly hiddenY: number; //hidden hand cards
  private readonly normalY: number;
  private readonly maxHandSize: number;

  constructor(context: IBattleContext, side: GameSide) {
    this.context = context;
    this.side = side;

    const config = LAYOUT_CONFIG.HAND[side];
    this.normalY = config.NORMAL_Y;
    this.hiddenY = config.HIDDEN_Y;
    this.maxHandSize = LAYOUT_CONFIG.HAND.MAX_CARDS;

    this.currentHandY = this.normalY;
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
    if (this.hand.length >= this.maxHandSize) return;

    const cardData = this.getRandomCardData();

    const newCard = new Card(
      this.context.engine,
      deckPosition.x,
      deckPosition.y,
      cardData,
      this.side,
    );

    if (this.side == "OPPONENT") {
      newCard.setFaceDown(); //show back card in oponent hand
      newCard.disableInteractive();
    } else {
      this.context.controls.setupCardInteractions(newCard);
    }

    newCard.setLocation("HAND");

    newCard.setDepth(200);
    this.hand.push(newCard);
    this.animateCardEntry(newCard);
    this.reorganizeHand();
  }

  private getRandomCardData() {
    const keys = Object.keys(CARD_DATABASE);
    const randomKey = keys[Phaser.Math.Between(0, keys.length - 1)];
    return CARD_DATABASE[randomKey];
  }

  public animateCardEntry(card: Card) {
    card.setAngle(-22); // buy card angle
    card.setAlpha(0);
    this.context.tweens.add({ targets: card, alpha: 1, duration: 100 });
  }

  public reorganizeHand() {
    const { SCREEN, HAND } = LAYOUT_CONFIG;
    const spacing = HAND.SPACING; // cards gap between
    const centerX = SCREEN.CENTER_X; // center of the screen

    const totalHandWidth = (this.hand.length - 1) * spacing;
    const startX = centerX - totalHandWidth / 2;

    this.hand.forEach((card, index) => {
      const targetX = startX + index * spacing;
      card.setDepth(100 + index);

      this.context.tweens.add({
        targets: card,
        x: targetX,
        y: this.currentHandY,
        angle: 0,
        scale: this.side == "PLAYER" ? 0.45 : 0.35,
        duration: 500, // 0.5s
        // ease: "Power2",
        ease: "Back.easeOut",
      });
    });
  }

  public removeCard(card: Card) {
    this.hand = this.hand.filter((handCard) => handCard !== card);
    this.reorganizeHand();
  }

  public addCardBack(card: Card) {
    this.hand.push(card);
    this.showHand();
    this.reorganizeHand();
  }
}
