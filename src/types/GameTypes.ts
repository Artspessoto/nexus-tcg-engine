import { TRANSLATIONS } from "../constants/Translations";
import type { Card } from "../objects/Card";

export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type GamePhase = "DRAW" | "MAIN" | "BATTLE" | "CHANGE_TURN";
export type PlacementMode = "ATK" | "DEF" | "FACE_UP" | "SET";

type Languages = keyof typeof TRANSLATIONS;
export type TranslationStructure = (typeof TRANSLATIONS)[Languages];
export type GameSide = "PLAYER" | "OPPONENT";
export type Lang = "pt-br" | "en";
export type Notice = "PHASE" | "WARNING" | "TURN" | "NEUTRAL";
export type BattleTranslations = TranslationStructure["battle_scene"];

export type Slot = {
  index: number;
  x: number;
  y: number;
};

export type Move =
  | { type: "PLAY_MONSTER"; card: Card; slot: Slot; mode: "ATK" | "DEF" }
  | {
      type: "PLAY_SPELL";
      card: Card;
      slot: Slot;
      mode: "FACE_UP" | "SET";
      params?: { target?: Card, value?: number}
    }
  | { type: "ACTIVATE_EFFECT"; card: Card; target?: Card }
  | { type: "ATTACK"; attacker: Card; target?: Card }
  | { type: "PASS" };
