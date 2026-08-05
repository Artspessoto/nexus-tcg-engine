import type { TutorialElementId } from "../types/TutorialType";

export enum TutorialEvent {
  FOCUS_CAMERA = "FOCUS_CAMERA",
  ADVANCE_DIALOG = "ADVANCE_DIALOG",
  HIGHLIGHT_ZONE = "HIGHLIGHT_ZONE",
  RESET_CAMERA = "RESET_CAMERA",
}

export type CameraFocusPayload = {
  x: number;
  y: number;
  id: TutorialElementId;
  disabled_hover?: boolean
};
export type AdvanceDialogPayload = { textKey: string, targetId?: TutorialElementId };

export interface TutorialEventMap {
  [TutorialEvent.FOCUS_CAMERA]: CameraFocusPayload;
  [TutorialEvent.ADVANCE_DIALOG]: AdvanceDialogPayload;
}
