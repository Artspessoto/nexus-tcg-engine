import type { Card } from "../../../../objects/Card";
import type { BounceAnalysis } from "../../../../types/AnalyzerTypes";
import type { ActionEffect } from "../../../../types/EffectTypes";
import type { FieldSnapshot } from "../../../../types/StrategyTypes";
import { EffectAnalyzer } from "../../analyzers/EffectAnalyzer";
import { FieldAnalyzer } from "../../analyzers/FieldAnalyzer";
import { ActionScorer } from "../ActionScorer";

export class EasyActionScorer extends ActionScorer {
  public override scoreDestroyEffect(effect: ActionEffect): number {
    if (
      effect.targetType == "MONSTER" ||
      effect.targetType == "EFFECT_MONSTER"
    ) {
      const destructionValue = EffectAnalyzer.analyzeMonsterDestructionValue(
        this.context,
      );
      return destructionValue * 1.5;
    } else {
      return 20;
    }
  }

  public override scoreBounceEffect(
    _snapshot: FieldSnapshot,
    target?: Card | null,
  ): number {
    if (!target) return 0;
    const bounce: BounceAnalysis = EffectAnalyzer.analyzeBouncePotential(
      this.context,
    );
    return bounce.targetAtk * 0.05 + bounce.manaCost * 20;
  }

  public override scoreReviveEffect(
    effect: ActionEffect,
    snapshot: FieldSnapshot,
    simulateEffect: (card: Card) => number,
  ): number {
    const { npcGraveyard, npcMonsters, npcSupports } = snapshot;
    if (npcGraveyard.length == 0) return -500;

    const { targetSide, targetType } = effect;
    const validTargets = EffectAnalyzer.analyzeRevivePotential(
      this.context,
      targetSide,
      targetType,
    );

    if (!validTargets) return -500;

    if (effect.targetType?.includes("MONSTER")) {
      if (npcMonsters.length == 3) return -500;

      const bestMonster = FieldAnalyzer.getStrongestMonsterTarget(
        validTargets,
        "ATK",
      );

      if (!bestMonster) return -500;

      return (bestMonster.getCardData().atk || 0) * 1.2;
    } else {
      if (npcSupports.length == 3) return -500;

      let bestSupportScore = -500;

      for (const support of validTargets) {
        if (support.getType().includes("MONSTER")) continue;

        const supportEffect = support.getCardData().effects;
        if (!supportEffect) continue;

        const simulateScore = simulateEffect(support);

        if (simulateScore > bestSupportScore) {
          bestSupportScore = simulateScore;
        }
      }

      if (bestSupportScore <= 0) return -500;

      return bestSupportScore + 30;
    }
  }
}
