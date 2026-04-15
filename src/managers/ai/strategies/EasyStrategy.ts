import { EFFECTS_REQUIRING_TARGET } from "../../../constants/AIConfig";
import type { IBattleContext } from "../../../interfaces/IBattleContext";
import type { Card } from "../../../objects/Card";
import type { Move } from "../../../types/GameTypes";
import type { FieldSnapshot } from "../../../types/StrategyTypes";
import { FieldAnalyzer } from "../analyzers/FieldAnalyzer";
import { BaseStrategy } from "../core/BaseStrategy";
import { EasyEvaluator } from "../evaluators/EasyEvaluator";

export class EasyStrategy extends BaseStrategy {
  constructor(context: IBattleContext) {
    super(context, new EasyEvaluator(context));
  }

  public override async playMainPhase(): Promise<void> {
    let safetyBreak = 0; //security lock (preventing bugs)

    //limit AI to 10 moves
    while (safetyBreak < 10) {
      const snapshot = this.createFieldSnapshot();
      const moves = this.generateMoves(snapshot);

      const betterChoice = this.chooseBestMove(moves, snapshot);

      if (!betterChoice || betterChoice.type == "PASS") {
        break;
      }

      await this.delay(1200);
      await this.executeMove(betterChoice);

      safetyBreak++;
    }
  }

  public override mainPhaseAvailableMoves(data: FieldSnapshot): Move[] {
    const playableCards = FieldAnalyzer.getPlayableCards(
      data.npcHandCards,
      data.currentMana,
    );

    const moves: Move[] = [];

    moves.push(...this.getHandMoves(playableCards, data));

    return moves;
  }

  protected getHandMoves(
    playableCards: Card[],
    snapshot: FieldSnapshot,
  ): Move[] {
    const moves: Move[] = [];

    //monster options
    for (const card of playableCards) {
      if (card.getType().includes("MONSTER")) {
        const slot = this.context.field.getFirstAvailableSlot(
          this.side,
          "MONSTER",
        );

        if (slot !== null) {
          moves.push({
            card,
            mode: this.determineOptimalPlacementMode(),
            slot,
            type: "PLAY_MONSTER",
          });
        }
      }
    }

    //spell and trap options
    for (const card of playableCards) {
      if (card.getType() == "SPELL" || card.getType() == "TRAP") {
        const effect = card.getCardData().effects;
        if (!effect) continue;

        const slot = this.context.field.getFirstAvailableSlot(
          this.side,
          "SPELL",
        );

        const target = this.evaluator.getBestTarget(effect!, snapshot);

        if (EFFECTS_REQUIRING_TARGET.includes(effect.type) && !target) {
          continue;
        }

        if (slot !== null) {
          const mode = card.getType() === "SPELL" ? "FACE_UP" : "SET";
          const revivalMonsterPlacementMode: "ATK" | "DEF" =
            this.determineOptimalPlacementMode();

          moves.push({
            card,
            mode,
            type: "PLAY_SPELL",
            params: { target, mode: revivalMonsterPlacementMode },
            slot,
          });
        }
      }
    }

    return moves;
  }

  protected override determineOptimalPlacementMode(): "ATK" | "DEF" {
    return "ATK";
  }
}
