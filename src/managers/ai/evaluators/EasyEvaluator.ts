import {
  DEFENSIVE_EFFECTS,
  OFFENSIVE_EFFECTS,
} from "../../../constants/AIConfig";
import { LAYOUT_CONFIG } from "../../../constants/LayoutConfig";
import type { Card } from "../../../objects/Card";
import type { BurnAnalysis } from "../../../types/AnalyzerTypes";
import type { CardEffect } from "../../../types/EffectTypes";
import type { Move } from "../../../types/GameTypes";
import type { FieldSnapshot } from "../../../types/StrategyTypes";
import { EffectAnalyzer } from "../analyzers/EffectAnalyzer";
import { FieldAnalyzer } from "../analyzers/FieldAnalyzer";
import { BaseEvaluator } from "../core/BaseEvaluator";

export class EasyEvaluator extends BaseEvaluator {
  public override evaluateMove(move: Move, snapshot: FieldSnapshot): number {
    let score = super.evaluateMove(move, snapshot);

    if (move.type === "PASS") return score;

    const cardInvolved = this.getCardFromMove(move);
    if (cardInvolved) {
      score += cardInvolved.getCardData().manaCost * 10;
    }

    return score;
  }

  public override getBestTarget(
    effect: CardEffect,
    snapshot: FieldSnapshot,
  ): Card | null {
    const { playerMonsters, playerSupports, npcMonsters } = snapshot;

    if (OFFENSIVE_EFFECTS.includes(effect.type)) {
      const targetStat = effect.type === "CHANGE_POS" ? "DEF" : "ATK";

      const monsterTarget = FieldAnalyzer.getStrongestMonsterTarget(
        playerMonsters,
        targetStat,
      );

      return monsterTarget
        ? monsterTarget
        : playerMonsters.filter((m) => m !== null)[0];
    }

    if (DEFENSIVE_EFFECTS.includes(effect.type)) {
      return (
        FieldAnalyzer.getStrongestMonsterTarget(npcMonsters, "ATK") || null
      );
    }

    if (effect.type == "DESTROY") {
      if (effect.targetType == "SPELL" || effect.targetType == "TRAP") {
        const validTargets = playerSupports.filter(
          (s) => s !== null && s.getType() == effect.targetType,
        );

        return validTargets[0] || null;
      }

      return (
        FieldAnalyzer.getStrongestMonsterTarget(playerMonsters, "ATK") || null
      );
    }

    if (effect.type == "REVIVE") {
      const targetType = effect.targetType;

      return (
        EffectAnalyzer.analyzeRevivePotential(
          this.context,
          effect.targetSide || "OWNER",
          targetType,
        ) || null
      );
    }

    return null;
  }

  protected override evaluateMonsterPlay(
    card: Card,
    snapshot: FieldSnapshot,
  ): number {
    const { currentMana, npcHandCards } = snapshot;
    let actionScore: number = 80;

    const mostEfficient = FieldAnalyzer.getMostEfficientMonster(
      npcHandCards,
      currentMana,
    );
    const strongestOption = FieldAnalyzer.getStrongestMonsterOptionOnHand(
      npcHandCards,
      currentMana,
      "ATK",
    );
    const numericMonstersAdvantage = FieldAnalyzer.hasNumericMonstersAdvantage(
      this.context,
    );

    //efficient cost (atk + def / mana cost)
    if (
      mostEfficient &&
      !numericMonstersAdvantage &&
      card.getCardData().id == mostEfficient.getCardData().id
    ) {
      actionScore += 50;
    }

    //atk value
    if (
      strongestOption &&
      !numericMonstersAdvantage &&
      card.getCardData().id == strongestOption.getCardData().id
    ) {
      actionScore += 40;
    }

    //field analyze advantage
    const advantage = FieldAnalyzer.getSimpleFieldSideAdvantage(this.context);

    //NPC being at a disadvantage => monster with high defense priority
    if (advantage < 0 || !numericMonstersAdvantage) {
      actionScore += (card.getCardData().def || 0) * 0.5;
    }

    return actionScore;
  }

  protected override evaluateSupportPlay(
    card: Card,
    snapshot: FieldSnapshot,
    params?: { target?: Card | null },
  ): number {
    const { currentMana } = snapshot;
    const effect = card.getCardData().effects;
    if (!effect) return 0;

    const needTarget = [
      "DESTROY",
      "BOUNCE",
      "NERF_ATK",
      "BOOST_ATK",
      "REVIVE",
      "CHANGE_POS",
    ];

    if (needTarget.includes(effect.type) && !params?.target) return 0;

    let baseScore = 0;
    const effectValue = effect.value || 0;
    const totalLP = LAYOUT_CONFIG.GAME_STATE.BASE_LP;

    switch (effect.type) {
      case "BURN": {
        const burn: BurnAnalysis = EffectAnalyzer.analyzeBurnImpact(
          this.context,
          effect.value,
        );
        if (burn.isLethal) return 9999;
        baseScore +=
          EffectAnalyzer.getRelativeImpact(effectValue, totalLP) * 1000;

        if (burn.damagePotential > totalLP * 0.5) baseScore += 30;
        break;
      }
      case "HEAL": {
        const healPriority = EffectAnalyzer.analyzeHealUrgency(this.context);
        baseScore +=
          EffectAnalyzer.getRelativeImpact(healPriority, totalLP) * 200;
        break;
      }
      case "BOOST_ATK": {
        const buff = EffectAnalyzer.analyzeCombatStatShiftPotential(
          this.context,
          effectValue,
          "atk",
          true,
          currentMana,
          "STRONGEST",
        );
        if (buff.isGameChanger) baseScore += 150;
        baseScore += buff.targetValue * 2;
        break;
      }
      case "DRAW_CARD": {
        const neededCards = EffectAnalyzer.analyzeCardUrgency(this.context);
        baseScore += neededCards * 25;
        break;
      }
      case "DESTROY": {
        if (
          effect.targetType == "MONSTER" ||
          effect.targetType == "EFFECT_MONSTER"
        ) {
          const destructionValue =
            EffectAnalyzer.analyzeMonsterDestructionValue(this.context);
          baseScore += destructionValue * 1.5;
        } else {
          baseScore += 20;
        }

        break;
      }
      case "BOUNCE": {
        // const bounce: BounceAnalysis = EffectAnalyzer.analyzeBouncePotential(this.context);
        // medium strategy => baseScore += bounce.targetAtk * 0.05 + bounce.manaCost * 20;
        baseScore += 10;
        break;
      }
      case "REVIVE": {
        const emptySlots = this.context.field.monsterSlots.OPPONENT.filter(
          (m) => m === null,
        ).length;

        if (!emptySlots) return -500;

        const targetType = effect.targetType;
        const bestCard = EffectAnalyzer.analyzeRevivePotential(
          this.context,
          effect.targetSide || "OWNER",
          targetType,
        );

        if (bestCard) {
          const reviveValuation = bestCard.getCardData().atk || 0;
          baseScore += reviveValuation * 1.2;
        } else {
          baseScore = -500;
        }
        break;
      }
    }

    return baseScore;
  }

  protected override evaluateAttack(
    attacker: Card,
    target?: Card | null,
  ): number {
    if (!target) return 150;

    const attackerAtk = attacker.getCardData().atk || 0;
    const targetData = target.getCardData();
    const isDefenseMode = target.angle === -90 || target.isFaceDown;

    if (target.isFaceDown) {
      //impulsive action, ignores the enemy support and other problems
      return 200;
    }

    const targetValue = isDefenseMode
      ? targetData.def || 0
      : targetData.atk || 0;

    //NPC monster with advantage against the player's monster (atk > atk || atk > def)
    if (attackerAtk > targetValue) {
      return 100 + (attackerAtk - targetValue);
    }
    // equal 1x1
    else if (attackerAtk == targetValue) {
      return 60;
      //predicition implements into medium strategy
      // const finalPrediction =
      //   FieldAnalyzer.continueWithAdvantageAfterCombatTrade(
      //     this.context,
      //     isDefenseMode,
      //   );

      // if (finalPrediction.hasDisadvantage) {
      //   baseScore -= 70;
      // } else if (finalPrediction.hasAdvantage) {
      //   baseScore += 40;
      // } else {
      //   baseScore -= 20;
      // }
    }

    return -50;
  }

  private getCardFromMove(move: Move): Card | null {
    if (move.type === "PLAY_MONSTER" || move.type === "PLAY_SPELL")
      return move.card;
    if (move.type === "ATTACK") return move.attacker;
    if (move.type === "ACTIVATE_EFFECT") return move.card;
    return null;
  }
}
