import {
  AI_CONFIG,
  ASSUMED_DEF_WHEN_IS_FACEDOWN,
  DEFENSIVE_EFFECTS,
  EFFECTS_REQUIRING_TARGET,
  OFFENSIVE_EFFECTS,
} from "../../../constants/AIConfig";
import type { IBattleContext } from "../../../interfaces/IBattleContext";
import type { Card } from "../../../objects/Card";
import type { CardData } from "../../../types/CardTypes";
import type {
  ActionEffect,
  CardEffect,
  EffectTypes,
  NumericEffect,
} from "../../../types/EffectTypes";
import type {
  FieldSnapshot,
  SupportScorer,
} from "../../../types/StrategyTypes";
import { EffectAnalyzer } from "../analyzers/EffectAnalyzer";
import { FieldAnalyzer } from "../analyzers/FieldAnalyzer";
import { BaseEvaluator } from "../core/BaseEvaluator";
import { ActionScorer } from "../scorers/ActionScorer";
import { CombatScorer } from "../scorers/CombatScorer";
import { ResourceScorer } from "../scorers/ResourceScorer";

export class MediumEvaluator extends BaseEvaluator {
  private actionScorer: ActionScorer;
  private resourceScorer: ResourceScorer;
  private combatScorer: CombatScorer;

  private readonly supportScorers: Partial<Record<EffectTypes, SupportScorer>>;

  constructor(context: IBattleContext) {
    super(context);

    this.actionScorer = new ActionScorer(context);
    this.resourceScorer = new ResourceScorer(context);
    this.combatScorer = new CombatScorer(context);

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

  public override getBestTarget(
    effect: CardEffect,
    snapshot: FieldSnapshot,
  ): Card | null {
    const { npcMonsters } = snapshot;

    const category = this.getEffectCategory(effect.type);

    switch (category) {
      case "OFFENSIVE":
        return this.getOffensiveTarget(effect, snapshot);
      case "DEFENSIVE":
        return this.getDefensiveTarget(npcMonsters);
      case "REVIVE":
        return this.getReviveTarget(effect as ActionEffect, snapshot);
      default:
        return null;
    }
  }

  private getEffectCategory(
    type: EffectTypes,
  ): "OFFENSIVE" | "DEFENSIVE" | "REVIVE" | "NONE" {
    if (OFFENSIVE_EFFECTS.includes(type)) return "OFFENSIVE";
    if (DEFENSIVE_EFFECTS.includes(type)) return "DEFENSIVE";
    if (type == "REVIVE") return "REVIVE";
    return "NONE";
  }

  private getOffensiveTarget(
    effect: CardEffect,
    snapshot: FieldSnapshot,
  ): Card | null {
    const { playerMonsters, playerSupports, npcMonsters, advantage } = snapshot;

    if (playerMonsters.length == 0) return null;

    if (
      (effect.type == "DESTROY" || effect.type == "BOUNCE") &&
      (effect.targetType == "SPELL" || effect.targetType == "TRAP")
    ) {
      const validOptions = playerSupports.filter(
        (s) => s !== null && s.getType() == effect.targetType,
      );

      if (validOptions.length == 0) return null;

      //priorize face down cards
      return validOptions.sort((a, b) => (b.isFaceDown ? 1 : 0) - (a.isFaceDown ? 1 : 0))[0];
    }

    //npc best attacker
    const npcBestMonster = FieldAnalyzer.getStrongestMonsterTarget(
      npcMonsters,
      "ATK",
    );
    const npcMaxAtk = npcBestMonster?.getCardData().atk || 0;
    const effectValue = effect.value || 0;

    // enemy danger
    const sortedEnemies = [...playerMonsters].sort((a, b) => {
      const valA = a.isFaceDown
        ? ASSUMED_DEF_WHEN_IS_FACEDOWN
        : a.getCardData().atk || 0;
      const valB = b.isFaceDown
        ? ASSUMED_DEF_WHEN_IS_FACEDOWN
        : b.getCardData().atk || 0;

      return valB - valA;
    });

    if ((effect.type == "DESTROY" || effect.type == "BOUNCE") && effect.targetType?.includes("MONSTER")) {
      return sortedEnemies[0] || null;
    }

    if (effect.type == "CHANGE_POS") {
      for (const target of sortedEnemies) {
        //NPC with advantage and strong monster in field (proative action)
        if (target.isFaceDown && advantage.isWinning && npcMaxAtk >= 55) {
          return target;
        }

        //Enemy monster strong in attack but weak in def
        if (target.isAtkMode && (target.getCardData().def || 0) < npcMaxAtk) {
          return target;
        }

        //Enemy monster strong in def but weak in atk
        if (
          target.isDefMode &&
          !target.isFaceDown &&
          (target.getCardData().atk || 0) < npcMaxAtk
        ) {
          return target;
        }
      }
    }

    for (const target of sortedEnemies) {
      let targetPowerStat: number;

      if (target.isFaceDown) {
        targetPowerStat = ASSUMED_DEF_WHEN_IS_FACEDOWN;
      } else {
        const isDef = target.isDefMode;
        targetPowerStat = isDef
          ? target.getCardData().def || 0
          : target.getCardData().atk || 0;
      }

      if (
        targetPowerStat > npcMaxAtk &&
        targetPowerStat - effectValue < npcMaxAtk
      )
        return target;
    }

    return sortedEnemies[0];
  }

  private getDefensiveTarget(npcMonsters: Card[]) {
    return FieldAnalyzer.getStrongestMonsterTarget(npcMonsters, "ATK") || null;
  }

  private getReviveTarget(
    effect: ActionEffect,
    snapshot: FieldSnapshot,
  ): Card | null {
    const targetType = effect.targetType;
    const advantage = snapshot.advantage;

    let stat: "ATK" | "DEF" = "DEF";

    if (advantage.isWinning && !advantage.isThreatened) stat = "ATK";

    return (
      EffectAnalyzer.analyzeRevivePotential(
        this.context,
        effect.targetSide || "OWNER",
        targetType,
        stat,
      ) || null
    );
  }

  protected evaluateMonsterPlay(card: Card, snapshot: FieldSnapshot): number {
    const cardData = card.getCardData();
    const monsterStat: "ATK" | "DEF" = card.angle == 0 ? "ATK" : "DEF";

    //monster power
    const powerValue =
      monsterStat == "ATK" ? cardData.atk || 0 : cardData.def || 0;

    let actionScore = 15 + (powerValue * 0.6);

    actionScore += this.evaluateFieldUrgency(snapshot);
    actionScore += this.evaluateTacticalSynergy(card, snapshot, monsterStat);
    actionScore += this.evaluateThreatResponse(card, snapshot, monsterStat);

    //agressive potential
    if (monsterStat == "ATK" && snapshot.playerMonsters.length > 0) {
      const strongestEnemy = FieldAnalyzer.getStrongestMonsterTarget(
        snapshot.playerMonsters,
        "ATK",
      );
      if (
        strongestEnemy &&
        cardData.atk! > (strongestEnemy.getCardData().atk || 0)
      ) {
        const overPower = cardData.atk ?? 0 - (strongestEnemy.getCardData().atk || 0);

        //treatment to prevent overkill play
        if (overPower > 30) {
          actionScore += 15
        } else {
          actionScore += 35;
        }
      }
    }

    actionScore += this.evaluateManaEfficiency(cardData, snapshot, actionScore);

    return actionScore;
  }

  private evaluateManaEfficiency(
    data: CardData,
    snapshot: FieldSnapshot,
    currentScore: number,
  ): number {
    const { currentMana, synergies, advantage } = snapshot;
    const ratio = data.manaCost / currentMana;
    let value = 0;

    //reactive priority: if AI is not under threat, save mana resources
    if (!advantage.isThreatened) {

      //if card cost more than half mana available and own field is safe 
      if (ratio >= 0.5) {
        value -= 45;
      }

      //if is winning, save mana resources for other turns
      if (advantage.isWinning) {
        value -= 20;
      } else {
        if (ratio > 0.8 && currentScore < 40) value -= 10;
      }
    }

    if (currentMana - data.manaCost >= 2 && synergies.hasKillTraps) value += 15;

    return value;
  }

  private evaluateFieldUrgency(snapshot: FieldSnapshot): number {
    const { npcMonsters } = snapshot;

    if (npcMonsters.length == 0) return 25;
    if (npcMonsters.length == 3) return -20;

    return 0;
  }

  private evaluateThreatResponse(
    card: Card,
    snapshot: FieldSnapshot,
    mode: "ATK" | "DEF",
  ): number {
    const { advantage, playerMonsters } = snapshot;
    const cardData = card.getCardData();

    if (!advantage.isThreatened) return 0;

    if (mode === "DEF") {
      const threatPower = Math.abs(advantage.defensiveGap);
      return cardData.def! > threatPower ? 40 : 15;
    }

    //if mode is "ATK" verify if AI monster can destroy threat
    const strongestEnemy = FieldAnalyzer.getStrongestMonsterTarget(playerMonsters, "ATK");
    const enemyAtk = strongestEnemy?.getCardData().atk || 0;

    if ((cardData.atk ?? 0) > enemyAtk) {
      return 50;
    }

    return -25;
  }

  private evaluateTacticalSynergy(
    card: Card,
    snapshot: FieldSnapshot,
    mode: "ATK" | "DEF",
  ): number {
    const { synergies, playerMonsters } = snapshot;
    const cardData = card.getCardData();
    let finalScore = 0;

    //logic bait (try to bait player with weakness monster)
    if (synergies.hasKillTraps && mode === "ATK" && (cardData.atk || 0) < 35) {
      finalScore += 20;
    }

    if (mode !== "ATK") return finalScore;

    const strongestEnemy = FieldAnalyzer.getStrongestMonsterTarget(
      playerMonsters,
      "ATK",
    );

    if (!strongestEnemy || strongestEnemy.isFaceDown) return finalScore;

    const enemyAtk = strongestEnemy.getCardData().atk || 0;
    const enemyDef = strongestEnemy.getCardData().def || 0;
    const myAtk = cardData.atk || 0;

    // synergy with buffs and nerfs (atk)
    if (synergies.atkModifiers.length > 0) {
      const bestMod = Math.max(
        ...synergies.atkModifiers.map(
          (m) => m.getCardData().effects?.value || 0,
        ),
      );
      //if npc monster is weak against other card (but wins with buff/nerf)
      if (myAtk <= enemyAtk && myAtk + bestMod > enemyAtk) {
        finalScore += 45;
      }
    }

    //change position
    if (synergies.posModifiers.length > 0) {
      //npc monster is weak against player's monster DEF, but wins with change pos
      if (myAtk <= enemyAtk && myAtk > enemyDef) {
        finalScore += 50;
      }
    }

    return finalScore;
  }

  protected evaluateSupportPlay(
    card: Card,
    snapshot: FieldSnapshot,
    params?: { target?: Card | null },
  ): number {
    const effect = card.getCardData().effects;
    if (!effect) return 0;

    //dont apply effects in wrong situations
    if (EFFECTS_REQUIRING_TARGET.includes(effect.type) && !params?.target)
      return 0;

    const effectValue = effect.value || 0;

    const scorer = this.supportScorers[effect.type];

    return scorer
      ? scorer(effectValue, effect, snapshot, params)
      : AI_CONFIG.SCORES.BASE_MOVE;
  }

  protected evaluateAttack(attacker: Card, snapshot: FieldSnapshot, target?: Card | null): number {
    //direct attack
    if (!target) return AI_CONFIG.SCORES.GAME_CHANGER;

    const attackerValue = attacker.getCardData().atk || 0;
    const targetData = target.getCardData();

    const targetDef = target.isFaceDown
      ? ASSUMED_DEF_WHEN_IS_FACEDOWN
      : (targetData.def ?? 0);

    const targetValue = (target.isAtkMode ? targetData.atk : targetDef) ?? 0;

    if (target.isFaceDown) {
      const isWeakestAttacker = snapshot.npcMonsters.every(m => (m.getCardData().atk || 0) >= attackerValue);

      if (snapshot.npcMonsters.length > 1) {
        //use the weakest monster to test enemy def
        if (isWeakestAttacker) return 120;
        //attack with strongest monster is a high risk (target with effect or high defense) 
        else return -30;
      } else {
        //if npc has a unique monster in field, safe attack priority
        if (attackerValue < ASSUMED_DEF_WHEN_IS_FACEDOWN + 15) {
          return -20
        }
      }
    }

    const hasUnknownThreats = snapshot.playerSupports.length > 0;
    const trapFear = hasUnknownThreats && attackerValue >= 55 ? -40 : 0;

    //NPC monster with advantage against the player's monster (atk > atk || atk > def) and prevents overkill
    if (attackerValue > targetValue) {
      let score = 200;

      const overKillLimit = 40;
      if (attackerValue - targetValue > overKillLimit) {
        score -= 50;
      }

      return score + trapFear;
    }

    //equal 1x1 
    else if (attackerValue == targetValue) {
      const finalPrediction = FieldAnalyzer.continueWithAdvantageAfterCombatTrade(this.context, target.isDefMode);

      if (finalPrediction.hasAdvantage) {
        return 40
      } else if (finalPrediction.hasDisadvantage) {
        return -70
      } else {
        return -25
      }
    }

    return -100;
  }
}
