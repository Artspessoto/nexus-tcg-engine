import type { IAIStrategy } from "../../../interfaces/IAIStrategy";
import type { IBattleContext } from "../../../interfaces/IBattleContext";

export class HardStrategy implements IAIStrategy {
  public readonly context: IBattleContext;

  constructor(context: IBattleContext) {
    this.context = context;
  }
  public async playMainPhase(): Promise<void> {}

  public async playBattlePhase(): Promise<void> {}
}
