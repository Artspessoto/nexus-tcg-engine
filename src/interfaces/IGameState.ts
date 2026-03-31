import type { CardData } from "../types/CardTypes";
import type { GameSide, GamePhase } from "../types/GameTypes";

export interface IGameState {
  readonly activePlayer: GameSide;
  readonly currentPhase: GamePhase;
  readonly currentTurn: number;
  readonly isDragging: boolean;

  getHP(side: GameSide): number;
  getMana(side: GameSide): number;

  // modify
  modifyHP(side: GameSide, amount: number): void;
  modifyMana(side: GameSide, amount: number): void;
  setPhase(phase: GamePhase): void;
  setPlayerName(name: string): void;
  nextTurn(): void;
  advanceTurnCount(): void;
  setDragging(value: boolean): void;
  setDeckState(side: GameSide): CardData | null;
  getDeckCount(side: GameSide): number;
  initializeDecks(playerDeck: string[], opponentDeck: string[]): void;
}
