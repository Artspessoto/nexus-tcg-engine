import type { GameSide, Move } from "../../../types/GameTypes";
import type { FieldSnapshot } from "../../../types/StrategyTypes";
import type { IBattleContext } from "../../../interfaces/IBattleContext";
import type { Card } from "../../../objects/Card";

export interface IAIStrategy {
  readonly context: IBattleContext;
  readonly side: GameSide;
  playMainPhase(): Promise<void>;
  playBattlePhase(): Promise<void>;
  generateMoves(data?: FieldSnapshot): Move[];
  mainPhaseAvailableMoves(data?: FieldSnapshot): Move[];
  battlePhaseAvailableMoves(): Move[];
  getCombatResponse(attacker: Card): Promise<Move | null>;
  evaluateMove(move: Move, data?: FieldSnapshot): number;
  executeMove(move: Move): Promise<void>;
  delay(ms: number): Promise<Phaser.Time.TimerEvent>;
}
