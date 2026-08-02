import type { TutorialElementId } from "../types/TutorialType";

export enum TutorialEvent {
  FOCUS_CAMERA = "FOCUS_CAMERA",
  ADVANCE_DIALOG = "ADVANCE_DIALOG",
  HIGHLIGHT_ZONE = "HIGHLIGHT_ZONE",
  RESET_CAMERA = "RESET_CAMERA"
}

export type CameraFocusPayload = { x: number; y: number, id: TutorialElementId };

export interface TutorialEventMap {
  [TutorialEvent.FOCUS_CAMERA]: CameraFocusPayload;
}
