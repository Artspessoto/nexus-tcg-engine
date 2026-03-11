import type { GamePhase, GameSide } from "../types/GameTypes";

export enum GameEvent {
  PHASE_CHANGED = "PHASE_CHANGED",
}

export type PhaseChangedPayload = { 
  newPhase: GamePhase; 
  activePlayer: GameSide 
};