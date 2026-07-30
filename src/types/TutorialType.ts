import type { CameraFocusPayload } from "../events/TutorialEvents";

export interface TutorialStep {
  textKey: string;
  layoutMode: "NARRATIVE" | "TOOLTIP"
  focusTarget?: CameraFocusPayload;
  dialogSize?: { width: number; height: number };
}
