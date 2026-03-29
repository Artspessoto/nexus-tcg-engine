import type { Card } from "../objects/Card";
import type { CardEffect } from "../types/EffectTypes";
import type { GamePhase, GameSide, PlacementMode } from "../types/GameTypes";

export enum GameEvent {
  //TURN AND PHASE
  TURN_STARTED = "TURN_STARTED",
  PHASE_CHANGED = "PHASE_CHANGED",

  //CARD
  CARD_PLAYED = "CARD_PLAYED",
  CARD_DRAW = "CARD_DRAW",

  //HAND
  HAND_FULL = "HAND_FULL",

  //FIELD
  CARD_SENT_TO_GRAVEYARD = "CARD_SENT_TO_GRAVEYARD",
  CARD_LEFT_FIELD = "CARD_LEFT_FIELD",
  FIELD_STATS_RESET = "FIELD_STATS_RESET",
  CARD_REMOVED_FROM_GRAVEYARD = "CARD_REMOVED_FROM_GRAVEYARD",

  //INPUT
  TARGETING_STARTED = "TARGETING_STARTED",
  TARGETING_CANCELED = "TARGETING_CANCELED",
  FIELD_CARD_CLICKED = "FIELD_CARD_CLICKED",

  //COMBAT
  ATTACK_DECLARED = "ATTACK_DECLARED",
  BATTLE_RESOLVED = "BATTLE_RESOLVED",
  DIRECT_ATTACK = "DIRECT_ATTACK",
  ATTACK_CANCELED = "ATTACK_CANCELED",

  //UI
  MANA_CHANGED = "MANA_CHANGED",
  LP_CHANGED = "LP_CHANGED",
  INSUFFICIENT_MANA = "INSUFFICIENT_MANA",
  ZONE_OCCUPIED = "ZONE_OCCUPIED",
  REQUEST_CARD_MENU = "REQUEST_CARD_MENU",
  ACTION_FINALIZED = "ACTION_FINALIZED",
  NOTICE_REQUESTED = "NOTICE_REQUESTED",

  //EFFECTS
  EFFECT_ACTIVATED = "EFFECT_ACTIVATED",
  EFFECT_RESOLVED = "EFFECT_RESOLVED",
  CARD_STATS_CHANGED = "CARD_STATS_CHANGED",
  CARD_POSITION_CHANGED = "CARD_POSITION_CHANGED",
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
export type TargetingStartedPayload = {
  source: Card;
  type: "ATTACK" | "EFFECT";
  message?: string;
};
export type TargetingCanceledPayload = {
  source: Card;
  type: "ATTACK" | "EFFECT";
};
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
export type LPChangedPayload = {
  side: GameSide;
  amount: number;
};
export type ErrorPayload = { side: GameSide };
export type TurnStartedPayload = { side: GameSide; turnCount: number };
export type CardDrawPayload = { card: Card; side: GameSide };
export type EffectActivatedPayload = { card: Card; effect: CardEffect };
export type EffectResolvedPayload = { source: Card; target: Card };
export type CardStatsChanged = {
  card: Card;
  statType: "atk" | "def";
  newValue: number;
  isBuff: boolean;
};
export type CardPositionChangedPayload = {
  card: Card;
  newMode: PlacementMode;
  isFlip: boolean;
};
export type FieldCardClickedPayload = {
  card: Card;
};
export type RequestCardMenuPayload = {
  card: Card;
  x: number;
  y: number;
};

export type ActionFinalizedPayload = {
  card: Card;
};

export type NoticeRequestedPayload = {
  message: string;
  type: "PHASE" | "WARNING" | "TURN" | "NEUTRAL";
};

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
  [GameEvent.CARD_DRAW]: CardDrawPayload;
  [GameEvent.HAND_FULL]: ErrorPayload;
  [GameEvent.TARGETING_STARTED]: TargetingStartedPayload;
  [GameEvent.TARGETING_CANCELED]: TargetingCanceledPayload;
  [GameEvent.LP_CHANGED]: LPChangedPayload;
  [GameEvent.EFFECT_ACTIVATED]: EffectActivatedPayload;
  [GameEvent.EFFECT_RESOLVED]: EffectResolvedPayload;
  [GameEvent.CARD_STATS_CHANGED]: CardStatsChanged;
  [GameEvent.CARD_POSITION_CHANGED]: CardPositionChangedPayload;
  [GameEvent.FIELD_CARD_CLICKED]: FieldCardClickedPayload;
  [GameEvent.REQUEST_CARD_MENU]: RequestCardMenuPayload;
  [GameEvent.ACTION_FINALIZED]: ActionFinalizedPayload;
  [GameEvent.NOTICE_REQUESTED]: NoticeRequestedPayload;
}
