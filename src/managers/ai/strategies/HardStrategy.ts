import type { IAIStrategy } from "../../../interfaces/IAIStrategy";
import type { IBattleContext } from "../../../interfaces/IBattleContext";
import type { Move } from "../../../types/GameTypes";

export class HardStrategy implements IAIStrategy {
  public readonly context: IBattleContext;

  constructor(context: IBattleContext) {
    this.context = context;
  }
  public async playMainPhase(): Promise<void> {}

  public generateMoves(): Move[] {
    return [];
  }

  public async playBattlePhase(): Promise<void> {}
}
