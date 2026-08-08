import type { CameraFocusPayload } from "../events/TutorialEvents";
import type { GameSide } from "./GameTypes";

export interface TutorialStep {
  textKey: string;
  layoutMode: "NARRATIVE" | "TOOLTIP";
  focusTarget?: CameraFocusPayload;
  requireAction?: boolean; //to block advance btn in some cases
  skipCameraSync?: boolean; //prevents UI interfering with board camera
}

export type LayoutTargetCategory =
  | "DEFAULT"
  | "FIELD"
  | "HAND"
  | "BUTTON"
  | "UI";

export type TutorialElementId =
  | "FIELD_MONSTER_ZONES"
  | "FIELD_SPELL_ZONES"
  | "FIELD_GRAVEYARD_ZONE"
  | `MANA_${GameSide}`
  | `LP_BAR_${GameSide}`
  | `HAND_CARD_${string}`
  | `${GameSide}_DECK`
  | "PLAYER_HAND"
  | "PHASE_BUTTON"
  | `FIELD_${string}`

export interface ZoneConfig {
  type: "MONSTER" | "SPELL" | "GRAVEYARD";
  positions: { x: number; y: number }[];
  color: string | number;
  shrinkW: number;
  shrinkH: number;
  offsetX?: number;
  offsetY?: number;
}
