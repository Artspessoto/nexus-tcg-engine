export enum TutorialEvent {
  FOCUS_CAMERA = "FOCUS_CAMERA",
  ADVANCE_DIALOG = "ADVANCE_DIALOG",
  HIGHLIGHT_ZONE = "HIGHLIGHT_ZONE",
}

export type CameraFocusPayload = { x: number; y: number; zoom: number };

export interface TutorialEventMap {
  [TutorialEvent.FOCUS_CAMERA]: CameraFocusPayload;
}
