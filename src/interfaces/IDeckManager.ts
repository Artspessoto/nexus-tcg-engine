import type { GameSide } from "../types/GameTypes";
import type { IBattleContext } from "./IBattleContext";

export interface IDeckManager {
  readonly position: { x: number; y: number };
  readonly side: GameSide;
  readonly context: IBattleContext;
  createDeckVisual(): void;
}
