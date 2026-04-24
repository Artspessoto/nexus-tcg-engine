import { AI_CONFIG } from "../../../constants/AIConfig";
import type { IBattleContext } from "../../../interfaces/IBattleContext";
import type { Card } from "../../../objects/Card";
import type { CardEffect } from "../../../types/EffectTypes";
import type { Move } from "../../../types/GameTypes";
import type { FieldSnapshot } from "../../../types/StrategyTypes";
import { FieldAnalyzer } from "../analyzers/FieldAnalyzer";
import type { ITacticalEvaluator } from "../interfaces/ITacticalEvaluator";

export abstract class BaseEvaluator implements ITacticalEvaluator {
  constructor(protected readonly context: IBattleContext) {}

  public evaluateMove(move: Move, snapshot: FieldSnapshot): number {
    if (move.type === "PASS") return AI_CONFIG.SCORES.BASE_MOVE;

    switch (move.type) {
      case "PLAY_MONSTER":
        return this.evaluateMonsterPlay(move.card, snapshot);
      case "PLAY_SPELL":
        return this.evaluateSupportPlay(move.card, snapshot, move.params);
      case "ATTACK":
        return this.evaluateAttack(move.attacker, snapshot, move.target);
      case "ACTIVATE_EFFECT":
        return this.evaluateEffectActivation(move.card, snapshot, move.target);
      case "CHANGE_POS":
        return this.evaluatePositionChange(move.card, snapshot)
      default:
        return 0;
    }
  }

  public shouldStopMainPhase(bestMove: Move, snapshot: FieldSnapshot): boolean {
    const score = this.evaluateMove(bestMove, snapshot);
    return score < 5;
  }

  public abstract getBestTarget(
    effect: CardEffect,
    snapshot: FieldSnapshot,
  ): Card | null;

  protected evaluateEffectActivation(
    _card: Card,
    _snapshot: FieldSnapshot,
    _target?: Card | null,
  ): number {
    return 0;
  }

  protected evaluatePositionChange(
    _card: Card,
    _snapshot: FieldSnapshot,
  ): number {
    return 0;
  }

  protected abstract evaluateMonsterPlay(
    card: Card,
    snapshot: FieldSnapshot,
  ): number;

  protected abstract evaluateSupportPlay(
    card: Card,
    snapshot: FieldSnapshot,
    params?: { target?: Card | null },
  ): number;

  protected abstract evaluateAttack(
    attacker: Card,
    snapshot: FieldSnapshot,
    target?: Card | null,
  ): number;

  protected getManaEfficiency(cost: number, currentMana: number): number {
    if (currentMana === 0) return 0;
    return (cost / currentMana) * 10;
  }

  protected getStrongestEnemyAtk(snapshot: FieldSnapshot): number {
    const strongest = FieldAnalyzer.getStrongestMonsterTarget(
      snapshot.playerMonsters,
      "ATK",
    );
    return strongest?.getCardData().atk || 0;
  }

  protected isFieldFull(
    snapshot: FieldSnapshot,
    type: "MONSTER" | "SPELL",
  ): boolean {
    const count =
      type === "MONSTER"
        ? snapshot.npcMonsters.length
        : snapshot.npcSupports.length;
    return count == 3;
  }
}
