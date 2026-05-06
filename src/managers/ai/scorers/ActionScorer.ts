import {
  AI_CONFIG,
  ASSUMED_DEF_WHEN_IS_FACEDOWN,
} from "../../../constants/AIConfig";
import type { ActionEffect } from "../../../types/EffectTypes";
import type { FieldSnapshot } from "../../../types/StrategyTypes";
import type { Card } from "../../../objects/Card";
import { EffectAnalyzer } from "../analyzers/EffectAnalyzer";
import { FieldAnalyzer } from "../analyzers/FieldAnalyzer";
import { BaseScorer } from "../core/BaseScorer";

export class ActionScorer extends BaseScorer {
  public scoreDestroyEffect(
    effect: ActionEffect,
    target?: Card | null,
  ): number {
    if (effect.targetType?.includes("MONSTER")) {
      const dangerousOnes = FieldAnalyzer.getInvincibleMonsters(
        this.context,
        this.playerSide,
      );

      if (target) {
        const isTargetInvincible = dangerousOnes.includes(target);

        const targetPower = target.isAtkMode
          ? target.getCardData().atk || 0
          : target.isFaceDown
            ? ASSUMED_DEF_WHEN_IS_FACEDOWN
            : target.getCardData().def || 0;

        if (isTargetInvincible) {
          return AI_CONFIG.TACTICS.KILL_POTENTIAL + targetPower * 0.8;
        }

        return 20 + targetPower * 0.5;
      }

      if (dangerousOnes.length > 0) {
        return 60 + dangerousOnes.length * 10;
      }

      return 45;
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
    simulateEffect: (card: Card) => number,
  ): number {
    const { npcGraveyard, npcMonsters, npcSupports, advantage } = snapshot;

    //field fully
    if (npcGraveyard.length === 0) return -500;

    const validTargets = EffectAnalyzer.analyzeRevivePotential(
      this.context,
      effect.targetSide,
      effect.targetType,
    );

    if (!validTargets) return -500;

    if (effect.targetType?.includes("MONSTER")) {
      if (npcMonsters.length === 3) return -500;

      const bestMonster = EffectAnalyzer.getBestMonsterToRevive(
        validTargets,
        advantage,
      );

      if (!bestMonster) return -500;

      const isAgressive = advantage.isWinning && !advantage.isThreatened;
      const powerValue = isAgressive
        ? bestMonster.getCardData().atk || 0
        : bestMonster.getCardData().def || 0;

      let score = 40 + powerValue;
      if (npcMonsters.length === 0) score += AI_CONFIG.FIELD.EMPTY_BONUS;
      return score;
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
