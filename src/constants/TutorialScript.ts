import type { TutorialStep } from "../types/TutorialType";
import { LAYOUT_CONFIG } from "./LayoutConfig";

const { UI, DECK } = LAYOUT_CONFIG;

export const TUTORIAL_STEPS: TutorialStep[] = [
  { textKey: "step_1", layoutMode: "NARRATIVE" },
  {
    textKey: "step_2",
    layoutMode: "TOOLTIP",
    focusTarget: { x: UI.LP_BAR.X, y: UI.LP_BAR.Y_PLAYER, id: "LP_BAR_PLAYER" },
  },
  {
    textKey: "step_3",
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: UI.MANA.PLAYER.x,
      y: UI.MANA.PLAYER.y,
      id: "MANA_PLAYER",
    },
  },
  {
    textKey: "step_4",
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: DECK.PLAYER.x,
      y: DECK.PLAYER.y,
      id: "PLAYER_DECK",
    },
  },
];
