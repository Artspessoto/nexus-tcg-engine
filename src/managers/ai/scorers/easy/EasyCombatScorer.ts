import type { Card } from "../../../../objects/Card";
import type { NumericEffect } from "../../../../types/EffectTypes";
import type { FieldSnapshot } from "../../../../types/StrategyTypes";
import { EffectAnalyzer } from "../../analyzers/EffectAnalyzer";
import { CombatScorer } from "../CombatScorer";

export class EasyCombatScorer extends CombatScorer {
  //always buff/nerf the strongest monster, ignores if target is good
  // dont check target position before buff
  public override scoreAtkShift(
    effect: NumericEffect,
    snapshot: FieldSnapshot,
    target?: Card | null,
  ): number {
    const { currentMana } = snapshot;
    if (!target) return 0;

    const buff = EffectAnalyzer.analyzeCombatStatShiftPotential(
      this.context,
      effect.value,
      "atk",
      true,
      currentMana,
      "STRONGEST",
    );

    const score = buff.isGameChanger ? 150 : 40;

    return score + buff.targetValue * 2;
  }

  public override scoreDefShift(
    effect: NumericEffect,
    _snapshot: FieldSnapshot,
    target?: Card | null,
  ): number {
    if (!target || target.owner == this.side) return 0;

    return effect.value > 0 ? 30 : 0;
  }

  public override scoreChangePosEffect(
    _snapshot: FieldSnapshot,
    target?: Card | null,
  ): number {
    if (!target || target.owner == this.side) return 0;

    if (target.isFaceDown) return 100;

    if (!target.isAtkMode) return 60;

    return 10;
  }
}
