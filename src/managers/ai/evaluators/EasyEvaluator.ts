import {
  AI_CONFIG,
  DEFENSIVE_EFFECTS,
  EFFECTS_REQUIRING_TARGET,
  OFFENSIVE_EFFECTS,
} from "../../../constants/AIConfig";
import type { IBattleContext } from "../../../interfaces/IBattleContext";
import type { Card } from "../../../objects/Card";
import type {
  ActionEffect,
  CardEffect,
  EffectTypes,
  NumericEffect,
} from "../../../types/EffectTypes";
import type { Move } from "../../../types/GameTypes";
import type {
  FieldSnapshot,
  SupportScorer,
} from "../../../types/StrategyTypes";
import { EffectAnalyzer } from "../analyzers/EffectAnalyzer";
import { FieldAnalyzer } from "../analyzers/FieldAnalyzer";
import { BaseEvaluator } from "../core/BaseEvaluator";
import { EasyActionScorer } from "../scorers/easy/EasyActionScorer";
import { EasyCombatScorer } from "../scorers/easy/EasyCombatScorer";
import { ResourceScorer } from "../scorers/ResourceScorer";

export class EasyEvaluator extends BaseEvaluator {
  private actionScorer: EasyActionScorer;
  private resourceScorer: ResourceScorer;
  private combatScorer: EasyCombatScorer;

  private readonly supportScorers: Partial<Record<EffectTypes, SupportScorer>>;

  constructor(context: IBattleContext) {
    super(context);

    this.actionScorer = new EasyActionScorer(context);
    this.resourceScorer = new ResourceScorer(context);
    this.combatScorer = new EasyCombatScorer(context);

    this.supportScorers = {
      BURN: (val) => this.resourceScorer.scoreBurnEffect(val),
      HEAL: () => this.resourceScorer.scoreHealEffect(),
      DRAW_CARD: () => this.resourceScorer.scoreDrawEffect(),
      GAIN_MANA: (val) => this.resourceScorer.scoreManaEffect(val),

      DESTROY: (_, eff) =>
        this.actionScorer.scoreDestroyEffect(eff as ActionEffect),
      REVIVE: (_, eff, snap) =>
        this.actionScorer.scoreReviveEffect(eff as ActionEffect, snap),
      BOUNCE: (_, __, snap, p) =>
        this.actionScorer.scoreBounceEffect(snap, p?.target),

      CHANGE_POS: (_, __, snap, p) =>
        this.combatScorer.scoreChangePosEffect(snap, p?.target),
      BOOST_ATK: (_, eff, snap, p) =>
        this.combatScorer.scoreAtkShift(eff as NumericEffect, snap, p?.target),
      NERF_ATK: (_, eff, snap, p) =>
        this.combatScorer.scoreAtkShift(eff as NumericEffect, snap, p?.target),
      BOOST_DEF: (_, eff, snap, p) =>
        this.combatScorer.scoreDefShift(eff as NumericEffect, snap, p?.target),
      NERF_DEF: (_, eff, snap, p) =>
        this.combatScorer.scoreDefShift(eff as NumericEffect, snap, p?.target),
    };
  }

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
    const effect = card.getCardData().effects;
    if (!effect) return 0;

    if (EFFECTS_REQUIRING_TARGET.includes(effect.type) && !params?.target)
      return 0;

    const effectValue = effect.value || 0;

    const scorer = this.supportScorers[effect.type];

    return scorer
      ? scorer(effectValue, effect, snapshot, params)
      : AI_CONFIG.SCORES.BASE_MOVE;
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
