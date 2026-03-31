import type { GamePhase, GameSide } from "../types/GameTypes";
import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import type { CardData } from "../types/CardTypes";
import { CARD_DATABASE } from "../constants/CardDatabase";

export class GameState {
  private _currentPhase: GamePhase = "DRAW";
  private _isDragging: boolean = false;
  private _activePlayer: GameSide = "PLAYER";
  private _playerDeck: string[] = [];
  private _opponentDeck: string[] = [];
  private _playerName!: string;

  public playerHP: number = LAYOUT_CONFIG.GAME_STATE.BASE_LP;
  public opponentHP: number = LAYOUT_CONFIG.GAME_STATE.BASE_LP;
  public playerMana: number = LAYOUT_CONFIG.GAME_STATE.BASE_MANA;
  public opponentMana: number = LAYOUT_CONFIG.GAME_STATE.BASE_MANA;
  public currentTurn: number = 1;

  constructor() {}

  get activePlayer(): GameSide {
    return this._activePlayer;
  }

  get currentPhase(): GamePhase {
    return this._currentPhase;
  }

  get playerName(): string {
    return this._playerName;
  }

  get isDragging(): boolean {
    return this._isDragging;
  }

  public initializeDecks(playerDeck: string[], opponentDeck: string[]) {
    this._playerDeck = playerDeck;
    this._opponentDeck = opponentDeck;
  }

  public getHP(side: GameSide): number {
    return side === "PLAYER" ? this.playerHP : this.opponentHP;
  }

  public getMana(side: GameSide): number {
    return side === "PLAYER" ? this.playerMana : this.opponentMana;
  }

  public modifyHP(side: GameSide, amount: number) {
    if (side === "PLAYER") this.playerHP += amount;
    else this.opponentHP += amount;
  }

  public modifyMana(side: GameSide, amount: number) {
    if (side === "PLAYER") this.playerMana += amount;
    else this.opponentMana += amount;
  }

  public setPhase(phase: GamePhase) {
    this._currentPhase = phase;
  }

  public setPlayerName(name: string) {
    return (this._playerName = name);
  }

  public setDeckState(side: GameSide): CardData | null {
    const deck = side == "PLAYER" ? this._playerDeck : this._opponentDeck;

    //deck out condition
    if (deck.length == 0) return null;

    const cardId = deck.pop();

    if (!cardId) return null;

    return CARD_DATABASE[cardId];
  }

  public getDeckCount(side: GameSide): number {
    return side == "PLAYER"
      ? this._playerDeck.length
      : this._opponentDeck.length;
  }

  public nextTurn() {
    this._activePlayer =
      this._activePlayer === "PLAYER" ? "OPPONENT" : "PLAYER";
    this._currentPhase = "DRAW"; //reset to initial phase in next turn
  }

  public advanceTurnCount() {
    this.currentTurn++;
  }

  public setDragging(value: boolean) {
    this._isDragging = value;
  }
}
