import type { TutorialElementId } from "../types/TutorialType";

export enum TutorialEvent {
  FOCUS_CAMERA = "FOCUS_CAMERA",
  ADVANCE_DIALOG = "ADVANCE_DIALOG",
  FORCE_UI_STEP = "FORCE_UI_STEP",
  RESET_CAMERA = "RESET_CAMERA",
}

export type CameraFocusPayload = {
  x: number;
  y: number;
  id: TutorialElementId[];
  disabled_hover?: boolean
};
export type AdvanceDialogPayload = { textKey: string, targetId?: TutorialElementId[] };
export type ForceUIStepPayload = { targetTextKey: string };

export interface TutorialEventMap {
  [TutorialEvent.FOCUS_CAMERA]: CameraFocusPayload;
  [TutorialEvent.ADVANCE_DIALOG]: AdvanceDialogPayload;
  [TutorialEvent.FORCE_UI_STEP]: ForceUIStepPayload;
}
