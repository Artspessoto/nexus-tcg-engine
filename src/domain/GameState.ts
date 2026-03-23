import type { GamePhase, GameSide } from "../types/GameTypes";
import { LAYOUT_CONFIG } from "../constants/LayoutConfig";

export class GameState {
  private _currentPhase: GamePhase = "DRAW";
  private _isDragging: boolean = false;
  private _activePlayer: GameSide = "PLAYER";

  public playerHP: number = LAYOUT_CONFIG.GAME_STATE.BASE_LP;
  public opponentHP: number = LAYOUT_CONFIG.GAME_STATE.BASE_LP;
  public playerMana: number = LAYOUT_CONFIG.GAME_STATE.BASE_MANA;
  public opponentMana: number = LAYOUT_CONFIG.GAME_STATE.BASE_MANA;
  public currentTurn: number = 1;

  constructor() {}

  get activePlayer(): GameSide {
    return this._activePlayer;
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

  get currentPhase(): GamePhase {
    return this._currentPhase;
  }

  public setPhase(phase: GamePhase) {
    this._currentPhase = phase;
  }

  public nextTurn() {
    this._activePlayer =
      this._activePlayer === "PLAYER" ? "OPPONENT" : "PLAYER";
    this._currentPhase = "DRAW"; //reset to initial phase in next turn
  }

  public advanceTurnCount() {
    this.currentTurn++;
  }

  get isDragging(): boolean {
    return this._isDragging;
  }

  public setDragging(value: boolean) {
    this._isDragging = value;
  }
}
