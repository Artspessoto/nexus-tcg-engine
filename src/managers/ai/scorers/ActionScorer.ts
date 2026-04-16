import { AI_CONFIG } from "../../../constants/AIConfig";
import type { ActionEffect } from "../../../types/EffectTypes";
import type { FieldSnapshot } from "../../../types/StrategyTypes";
import type { Card } from "../../../objects/Card";
import { EffectAnalyzer } from "../analyzers/EffectAnalyzer";
import { FieldAnalyzer } from "../analyzers/FieldAnalyzer";
import { BaseScorer } from "../core/BaseScorer";

export class ActionScorer extends BaseScorer {
  public scoreDestroyEffect(effect: ActionEffect): number {
    if (effect.targetType?.includes("MONSTER")) {
      const dangerousOnes = FieldAnalyzer.getInvincibleMonsters(
        this.context,
        this.playerSide,
      );
      return dangerousOnes.length * AI_CONFIG.TACTICS.KILL_POTENTIAL;
    }

    if (effect.targetType === "SPELL" || effect.targetType === "TRAP") {
      const targets = EffectAnalyzer.analyzeSupportDestructionCount(
        this.context,
      );
      return targets * 20;
    }

    return AI_CONFIG.SCORES.BASE_MOVE;
  }

  public scoreReviveEffect(
    effect: ActionEffect,
    snapshot: FieldSnapshot,
  ): number {
    //field fully
    if (snapshot.npcMonsters.length === 3) return 0;

    const potential = EffectAnalyzer.analyzeRevivePotential(
      this.context,
      effect.targetSide,
      effect.targetType,
      "ATK",
    );

    if (!potential) return -500;

    let score = 40 + (potential.getCardData().atk || 0);
    if (snapshot.npcMonsters.length === 0) score += AI_CONFIG.FIELD.EMPTY_BONUS;

    return score;
  }

  public scoreBounceEffect(
    snapshot: FieldSnapshot,
    target?: Card | null,
  ): number {
    if (!target) return 0;

    let score = AI_CONFIG.SCORES.BASE_MOVE;
    if (snapshot.advantage.isThreatened) score += AI_CONFIG.FIELD.THREAT_HIGH;

    return score + target.getCardData().manaCost * 5;
  }
}
