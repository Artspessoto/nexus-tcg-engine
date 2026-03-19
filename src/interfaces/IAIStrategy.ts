import type { IBattleContext } from "./IBattleContext";

export interface IAIStrategy {
  context: IBattleContext;
  playMainPhase(): Promise<void>;
  playBattlePhase(): Promise<void>;
  //  TODO: move by card score
}
