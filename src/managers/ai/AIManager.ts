import type { IAIManager } from "./interfaces/IAIManager";
import type { IAIStrategy } from "./interfaces/IAIStrategy";
import type { IBattleContext } from "../../interfaces/IBattleContext";
import type { Difficulty, Move } from "../../types/GameTypes";
import { EasyStrategy } from "./strategies/EasyStrategy";
import { HardStrategy } from "./strategies/HardStrategy";
import { MediumStrategy } from "./strategies/MediumStrategy";
import type { Card } from "../../objects/Card";

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

  public isGameOver(): boolean {
    const playerLP = this.context.gameState.getHP("PLAYER");
    const npcLP = this.context.gameState.getHP("OPPONENT");

    return playerLP <= 0 || npcLP <= 0;
  }

  public async executeTurn(): Promise<void> {
    await this.delay(1000);

    if (this.isGameOver()) return;

    this.context.setPhase("MAIN");
    await this.strategy.playMainPhase();

    await this.delay(1500);

    if (this.isGameOver()) return;

    if (this.context.gameState.currentTurn > 1) {
      this.context.setPhase("BATTLE");
      await this.delay(1500);

      if (this.isGameOver()) return;
      
      await this.strategy.playBattlePhase();
    }

    if (this.isGameOver()) return;

    this.context.setPhase("CHANGE_TURN");
  }

  public async getCombatResponse(attacker: Card): Promise<Move | null> {
    return await this.strategy.getCombatResponse(attacker);
  }

  private delay(ms: number) {
    return new Promise((resolve) => this.context.time.delayedCall(ms, resolve));
  }
}
