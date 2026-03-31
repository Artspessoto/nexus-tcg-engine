import { Card } from "../objects/Card";
import type { CardData } from "../types/CardTypes";

export interface IHandManager {
  readonly hand: Card[];
  readonly currentHandY: number; //hand position
  readonly hiddenY: number; //hidden hand cards
  readonly normalY: number;
  readonly maxHandSize: number;

  drawCard(deckPosition: { x: number; y: number }, cardData: CardData): void;
  getRandomCardData(): void;
  isCardInHand(card: Card): boolean;
  removeCard(card: Card): boolean;
  addCardBack(card: Card): void;

  hideHand(): void;
  showHand(): void;
  reorganizeHand(): void;
}
