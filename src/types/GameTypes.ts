import { TRANSLATIONS } from "../constants/Translations";
import type { Card } from "../objects/Card";

export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type GamePhase = "DRAW" | "MAIN" | "BATTLE" | "CHANGE_TURN";
export type PlacementMode = "ATK" | "DEF" | "FACE_UP" | "SET";

type Languages = keyof typeof TRANSLATIONS;
export type TranslationStructure = (typeof TRANSLATIONS)[Languages];
export type Lang = "pt-br" | "en";
export type NameTranslations = TranslationStructure["name_scene"];
export type TutorialTranslations = TranslationStructure["tutorial"];
export type BattleTranslations = TranslationStructure["battle_scene"];
export type DeckPreviewTranslations = TranslationStructure["deck_preview"];

export type GameSide = "PLAYER" | "OPPONENT";
export type Notice = "PHASE" | "WARNING" | "TURN" | "NEUTRAL";

export type Slot = {
  index: number;
  x: number;
  y: number;
};

export type EffectInstructions = {
  target: Card | null;
  mode?: PlacementMode;
};

export type Move =
  | { type: "PLAY_MONSTER"; card: Card; slot: Slot; mode: "ATK" | "DEF" }
  | {
      type: "PLAY_SPELL";
      card: Card;
      slot: Slot;
      mode: "FACE_UP" | "SET";
      params?: EffectInstructions;
    }
  | { type: "ACTIVATE_EFFECT"; card: Card; target: Card | null }
  | { type: "CHANGE_POS"; card: Card; newMode: PlacementMode; isFlip: boolean }
  | { type: "ATTACK"; attacker: Card; target: Card | null }
  | { type: "PASS" };
