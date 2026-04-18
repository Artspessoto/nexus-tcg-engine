import type { Card } from "../../../../objects/Card";
import type { BounceAnalysis } from "../../../../types/AnalyzerTypes";
import type { ActionEffect } from "../../../../types/EffectTypes";
import type { FieldSnapshot } from "../../../../types/StrategyTypes";
import { EffectAnalyzer } from "../../analyzers/EffectAnalyzer";
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
  ): number {
    const slots = snapshot.npcMonsters.length;

    if (slots === 3) return -500;

    const targetType = effect.targetType;
    const bestCard = EffectAnalyzer.analyzeRevivePotential(
      this.context,
      effect.targetSide || "OWNER",
      targetType,
    );

    if (!bestCard) {
      return -500;
    }

    return (bestCard.getCardData().atk || 0) * 1.2;
  }
}
