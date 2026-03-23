import type { IAIManager } from "../../interfaces/IAIManager";
import type { IAIStrategy } from "../../interfaces/IAIStrategy";
import type { IBattleContext } from "../../interfaces/IBattleContext";
import type { Difficulty } from "../../types/GameTypes";
import { EasyStrategy } from "./strategies/EasyStrategy";
import { HardStrategy } from "./strategies/HardStrategy";
import { MediumStrategy } from "./strategies/MediumStrategy";

export class AIManager implements IAIManager {
  private strategy!: IAIStrategy;
  public readonly context: IBattleContext;

  constructor(context: IBattleContext, difficulty: Difficulty) {
    this.context = context;

    const strategies = {
      EASY: EasyStrategy,
      MEDIUM: MediumStrategy,
      HARD: HardStrategy,
    };

    this.strategy = new strategies[difficulty || "EASY"](context);
  }

  public async executeTurn(): Promise<void> {
    await this.delay(1000);

    this.context.setPhase("MAIN");
    await this.strategy.playMainPhase();

    await this.delay(1500);

    if (this.context.gameState.currentTurn > 1) {
      this.context.setPhase("BATTLE");
      await this.delay(1500);
      await this.strategy.playBattlePhase();
    }

    this.context.setPhase("CHANGE_TURN");
  }

  private delay(ms: number) {
    return new Promise((resolve) => this.context.time.delayedCall(ms, resolve));
  }
}
