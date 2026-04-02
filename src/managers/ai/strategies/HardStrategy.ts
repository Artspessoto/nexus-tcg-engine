import type { IAIStrategy } from "../../../interfaces/IAIStrategy";
import type { IBattleContext } from "../../../interfaces/IBattleContext";
import type { Card } from "../../../objects/Card";
import type { GameSide, Move } from "../../../types/GameTypes";

export class HardStrategy implements IAIStrategy {
  public readonly context: IBattleContext;
  public readonly side: GameSide = "OPPONENT";

  constructor(context: IBattleContext) {
    this.context = context;
  }
  public async playMainPhase(): Promise<void> {}

  public generateMoves(): Move[] {
    return [];
  }

  public mainPhaseAvailableMoves(playableCards: Card[]): Move[] {
    console.log(playableCards);
    return [];
  }

  public battlePhaseAvailableMoves(): Move[] {
    return [];
  }

  public async playBattlePhase(): Promise<void> {}

  public evaluateMove(move: Move): number {
    console.log(move);
    return 1;
  }

  public async executeMove(move: Move): Promise<void> {
    console.log(move);
    await this.delay(200);
  }

  public async delay(ms: number): Promise<Phaser.Time.TimerEvent> {
    return new Promise((resolve) => this.context.time.delayedCall(ms, resolve));
  }
}
