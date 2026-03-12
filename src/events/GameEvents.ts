import type { Card } from "../objects/Card";
import type { GamePhase, GameSide, PlacementMode } from "../types/GameTypes";

export enum GameEvent {
  PHASE_CHANGED = "PHASE_CHANGED",
  CARD_PLAYED = "CARD_PLAYED",
  CARD_SENT_TO_GRAVEYARD = "CARD_SENT_TO_GRAVEYARD",
  CARD_LEFT_FIELD = "CARD_LEFT_FIELD",
  FIELD_STATS_RESET = "FIELD_STATS_RESET",
  CARD_REMOVED_FROM_GRAVEYARD = "CARD_REMOVED_FROM_GRAVEYARD",
  ATTACK_DECLARED = "ATTACK_DECLARED",
  BATTLE_RESOLVED = "BATTLE_RESOLVED",
  DIRECT_ATTACK = "DIRECT_ATTACK",
  ATTACK_CANCELED = "ATTACK_CANCELED",
  MANA_CHANGED = "MANA_CHANGED",
  INSUFFICIENT_MANA = "INSUFFICIENT_MANA",
  ZONE_OCCUPIED = "ZONE_OCCUPIED",
  TURN_STARTED = "TURN_STARTED",
}

export type PhaseChangedPayload = {
  newPhase: GamePhase;
  activePlayer: GameSide;
};
export type CardPlayedPayload = {
  card: Card;
  side: GameSide;
  mode: PlacementMode;
};
export type CardSentToGYPayload = { card: Card; side: GameSide };
export type CardLeftFieldPayload = { card: Card; side: GameSide };
export type CardRemovedFromGYPayload = { card: Card; side: GameSide };
export type FieldStatsResetPayload = { sides: GameSide[] };
export type AttackDeclaredPayload = { attacker: Card; target: Card };
export type BattleResolvedPayload = {
  attacker: Card;
  target: Card;
  winner: Card | null;
  damage: number;
};
export type DirectAttackPayload = {
  attacker: Card;
  targetSide: GameSide;
  damage: number;
};
export type AttackCanceledPayload = {
  attacker: Card;
};
export type ManaChangedPayload = {
  side: GameSide;
  amount: number; //gain or less mana
};
export type ErrorPayload = { side: GameSide };
export type TurnStartedPayload = { side: GameSide; turnCount: number };

export interface GameEventMap {
  [GameEvent.PHASE_CHANGED]: PhaseChangedPayload;
  [GameEvent.CARD_PLAYED]: CardPlayedPayload;
  [GameEvent.CARD_SENT_TO_GRAVEYARD]: CardSentToGYPayload;
  [GameEvent.CARD_LEFT_FIELD]: CardLeftFieldPayload;
  [GameEvent.FIELD_STATS_RESET]: FieldStatsResetPayload;
  [GameEvent.CARD_REMOVED_FROM_GRAVEYARD]: CardRemovedFromGYPayload;
  [GameEvent.ATTACK_DECLARED]: AttackDeclaredPayload;
  [GameEvent.BATTLE_RESOLVED]: BattleResolvedPayload;
  [GameEvent.DIRECT_ATTACK]: DirectAttackPayload;
  [GameEvent.ATTACK_CANCELED]: AttackCanceledPayload;
  [GameEvent.MANA_CHANGED]: ManaChangedPayload;
  [GameEvent.INSUFFICIENT_MANA]: ErrorPayload;
  [GameEvent.ZONE_OCCUPIED]: ErrorPayload;
  [GameEvent.TURN_STARTED]: TurnStartedPayload;
}
