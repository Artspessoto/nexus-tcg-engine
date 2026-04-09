import type { GameSide, Move } from "../types/GameTypes";
import type { FieldSnapshot } from "../types/StrategyTypes";
import type { IBattleContext } from "./IBattleContext";

export interface IAIStrategy {
  readonly context: IBattleContext;
  readonly side: GameSide;
  playMainPhase(): Promise<void>;
  playBattlePhase(): Promise<void>;
  generateMoves(data?: FieldSnapshot): Move[];
  mainPhaseAvailableMoves(data?: FieldSnapshot): Move[];
  battlePhaseAvailableMoves(): Move[];
  evaluateMove(move: Move, data?: FieldSnapshot): number;
  executeMove(move: Move): Promise<void>;
  delay(ms: number): Promise<Phaser.Time.TimerEvent>;
  //  TODO: move by card score
}
