import { AI_CONFIG } from "../../../constants/AIConfig";
import type { NumericEffect } from "../../../types/EffectTypes";
import type { FieldSnapshot } from "../../../types/StrategyTypes";
import type { Card } from "../../../objects/Card";
import { EffectAnalyzer } from "../analyzers/EffectAnalyzer";
import { FieldAnalyzer } from "../analyzers/FieldAnalyzer";
import { BaseScorer } from "../core/BaseScorer";

export class CombatScorer extends BaseScorer {
  public scoreAtkShift(
    effect: NumericEffect,
    snapshot: FieldSnapshot,
    target?: Card | null,
  ): number {
    if (!target) return 0;

    const isEnemy = target.owner !== this.side;

    if (!isEnemy && !target.isAtkMode) return 0;
    if (isEnemy && !target.isAtkMode) return 0; //no nerf enemy atk if is def mode

    const impact = EffectAnalyzer.analyzeCombatStatShiftPotential(
      this.context,
      effect.value,
      "atk",
      effect.type == "BOOST_ATK",
      snapshot.currentMana,
      "ALL",
    );

    let score = impact.isGameChanger
      ? AI_CONFIG.SCORES.GAME_CHANGER
      : AI_CONFIG.SCORES.BASE_MOVE;

    if (isEnemy && snapshot.advantage.isThreatened)
      score += AI_CONFIG.FIELD.THREAT_HIGH;

    return score;
  }

  public scoreDefShift(
    effect: NumericEffect,
    snapshot: FieldSnapshot,
    target?: Card | null,
  ): number {
    if (!target || target.owner == this.side || !target.isDefMode) return 0;

    const npcBestAtk =
      FieldAnalyzer.getStrongestMonsterTarget(
        snapshot.npcMonsters,
      )?.getCardData().atk || 0;
    const currentDef = target.getCardData().def || 0;

    if (
      currentDef > npcBestAtk &&
      currentDef - (effect.value || 0) <= npcBestAtk
    ) {
      return AI_CONFIG.TACTICS.KILL_POTENTIAL + 10;
    }

    return 0;
  }

  public scoreChangePosEffect(
    snapshot: FieldSnapshot,
    target?: Card | null,
  ): number {
    if (!target || target.owner == this.side) return 0;

    const npcBestAtk =
      FieldAnalyzer.getStrongestMonsterTarget(
        snapshot.npcMonsters,
        "ATK",
      )?.getCardData().atk ?? 0;

    const targetData = target.getCardData();
    const targetAk = targetData.atk ?? 0;
    const targetDef = targetData.def ?? 0;
    const advantage = snapshot.advantage;

    const currentEnemyStat = target.isAtkMode ? targetAk : targetDef;

    //security cure
    const goodHealSituation = snapshot.currentLP > 50;

    //1°: NPC monster can kill without change_pos
    if (npcBestAtk > currentEnemyStat) {
      return AI_CONFIG.SCORES.BASE_MOVE;
    }

    //2°: NPC with advantage and a strong monster in field priorize agressive action
    if (
      target.isFaceDown &&
      advantage.isWinning &&
      npcBestAtk >= 55 &&
      goodHealSituation
    ) {
      return (
        AI_CONFIG.TACTICS.POS_CHANGE + AI_CONFIG.TACTICS.KILL_POTENTIAL - 10
      );
    }

    //2°: Enemy monster is strong against NPC monster in attack, but your def is low
    if (target.isAtkMode && npcBestAtk > targetDef) {
      return (
        AI_CONFIG.TACTICS.POS_CHANGE + AI_CONFIG.TACTICS.KILL_POTENTIAL + 20
      );
    }

    //3°: Enemy monster with strong def against NPC monster atk, but your atk is low
    if (target.isDefMode && npcBestAtk > targetAk) {
      return (
        AI_CONFIG.TACTICS.POS_CHANGE + AI_CONFIG.TACTICS.KILL_POTENTIAL + 10
      );
    }

    //4°: Def urgency (enemy monster is invincible - lethal atk)
    if (target.isAtkMode && npcBestAtk < targetAk) {
      if (advantage.isThreatened) {
        return AI_CONFIG.TACTICS.POS_CHANGE + 15;
      }
    }

    return AI_CONFIG.SCORES.BASE_MOVE;
  }
}
