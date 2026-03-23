import type { Move } from "../types/GameTypes";
import type { IBattleContext } from "./IBattleContext";

export interface IAIStrategy {
  context: IBattleContext;
  playMainPhase(): Promise<void>;
  playBattlePhase(): Promise<void>;
  generateMoves(): Move[];
  //  TODO: move by card score
}
