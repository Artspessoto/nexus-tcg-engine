import type { IAIStrategy } from "../../../interfaces/IAIStrategy";
import type { IBattleContext } from "../../../interfaces/IBattleContext";
import type { GameSide } from "../../../types/GameTypes";
import { FieldAnalyzer } from "../FieldAnalyzer";

export class EasyStrategy implements IAIStrategy {
  public readonly context: IBattleContext;

  constructor(context: IBattleContext) {
    this.context = context;
  }
  public async playMainPhase(): Promise<void> {
    const side: GameSide = "OPPONENT";
    let actionMoves = 5;

    while (actionMoves > 0) {
      const currentMana = this.context.gameState.getMana(side);
      const hand = this.context.getHand(side).hand;

      const bestMonsterToPlay = FieldAnalyzer.getStrongestMonsterOption(
        hand,
        currentMana,
        "ATK",
      );
      const monsterSlot = this.context.field.getFirstAvailableSlot(
        side,
        "MONSTER",
      );

      if (bestMonsterToPlay && monsterSlot) {
        await this.delay(1200);

        this.context.executePlay(
          bestMonsterToPlay,
          side,
          "MONSTER",
          monsterSlot,
          "ATK",
        );

        actionMoves--;
        continue;
      }

      const bestSupport = FieldAnalyzer.getBestSupportOption(hand, currentMana);
      const supportSlot = this.context.field.getFirstAvailableSlot(
        side,
        "SPELL",
      );

      if (bestSupport && supportSlot) {
        const mode = bestSupport.getType() == "SPELL" ? "FACE_UP" : "SET";

        await this.delay(1200);
        this.context.executePlay(bestSupport, side, "SPELL", supportSlot, mode);

        if (mode == "FACE_UP") {
          await this.delay(1200);
          this.context.cardActivation(bestSupport, side);
        }

        actionMoves--;
        continue;
      }

      break;
    }
  }

  public async playBattlePhase(): Promise<void> {}

  private delay(ms: number) {
    return new Promise((resolve) => this.context.time.delayedCall(ms, resolve));
  }
}
