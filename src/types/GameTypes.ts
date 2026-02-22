import { TRANSLATIONS } from "../constants/Translations";

export type GamePhase = "DRAW" | "MAIN" | "BATTLE" | "CHANGE_TURN";
export type PlacementMode = "ATK" | "DEF" | "FACE_UP" | "SET";

type Languages = keyof typeof TRANSLATIONS;
export type TranslationStructure = (typeof TRANSLATIONS)[Languages];
export type GameSide = "PLAYER" | "OPPONENT";
export type Lang = "pt-br" | "en";
export type Notice = "PHASE" | "WARNING" | "TURN" | "NEUTRAL";
export type BattleTranslations = TranslationStructure["battle_scene"];

