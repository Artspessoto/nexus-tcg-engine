import type { Card } from "../../../objects/Card";
import type { CardEffect } from "../../../types/EffectTypes";
import type { Move } from "../../../types/GameTypes";
import type { FieldSnapshot } from "../../../types/StrategyTypes";

export interface ITacticalEvaluator {
  evaluateMove(move: Move, snapshot: FieldSnapshot): number;

  //decide best target to apply effect
  getBestTarget(effect: CardEffect, snapshot: FieldSnapshot): Card | null;

  //decide if AI need stop play card in main phase
  shouldStopMainPhase(bestMove: Move, snapshot: FieldSnapshot): boolean;
}
