import { AI_CONFIG } from "../../../constants/AIConfig";
import { LAYOUT_CONFIG } from "../../../constants/LayoutConfig";
import type { BurnAnalysis } from "../../../types/AnalyzerTypes";
import { EffectAnalyzer } from "../analyzers/EffectAnalyzer";
import { BaseScorer } from "../core/BaseScorer";

export class ResourceScorer extends BaseScorer {
  public scoreBurnEffect(value: number): number {
    const burn: BurnAnalysis = EffectAnalyzer.analyzeBurnImpact(this.context, value);

    if (burn.isLethal) return AI_CONFIG.SCORES.LETHAL_BURN;

    const totalLP = LAYOUT_CONFIG.GAME_STATE.BASE_LP;
    let score = EffectAnalyzer.getRelativeImpact(value, totalLP) * 1000;

    if (burn.damagePotential > totalLP * 0.5) {
      score += AI_CONFIG.TACTICS.KILL_POTENTIAL;
    }
    return score;
  }

  public scoreHealEffect(): number {
    const healPriority = EffectAnalyzer.analyzeHealUrgency(this.context);
    if (healPriority === 0) return 0;
    
    return EffectAnalyzer.getRelativeImpact(
      healPriority,
      LAYOUT_CONFIG.GAME_STATE.BASE_LP
    ) * 200;
  }

  public scoreDrawEffect(): number {
    const priority = EffectAnalyzer.analyzeCardUrgency(this.context);
    return priority * AI_CONFIG.TACTICS.DRAW_URGENCY;
  }

  public scoreManaEffect(value: number): number {
    const urgency = EffectAnalyzer.analyzeManaUrgency(this.context);
    return value * 5 + urgency * AI_CONFIG.TACTICS.MANA_RESERVE;
  }
}