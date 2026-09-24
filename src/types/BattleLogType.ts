import type { GameSide } from "./GameTypes";

export type LogType =
  | "PLAY_CARD"
  | "EFFECT"
  | "ATTACK"
  | "CHANGE_POS"
  | "DAMAGE"
  | "TURN_START";

export interface BattleLogEntry {
  id: string;
  turn: number;
  type: LogType;
  side: GameSide;
  actor?: string;
  cardNameKey?: string;
  targetNameKey?: string;
  amount?: number;
  messageKey: string;
  timeStamp: number;
}
