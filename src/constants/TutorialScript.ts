import type { TutorialStep } from "../types/TutorialType";
import { LAYOUT_CONFIG } from "./LayoutConfig";

const { UI, DECK, HAND } = LAYOUT_CONFIG;

export const TUTORIAL_STEPS: TutorialStep[] = [
  { textKey: "step_1", layoutMode: "NARRATIVE" },
  { textKey: "step_1b", layoutMode: "NARRATIVE" },
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
  {
    textKey: "step_5",
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: 400,
      y: HAND.PLAYER.NORMAL_Y,
      id: "HAND_CARD_TOON_KNIGHT",
    },
  },
  {
    textKey: "step_6",
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: 500,
      y: HAND.PLAYER.NORMAL_Y,
      id: "HAND_CARD_MAGE_APPRENTICE",
    },
  },
  {
    textKey: "step_7",
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: 650,
      y: HAND.PLAYER.NORMAL_Y,
      id: "HAND_CARD_FIRE_BALL",
    },
  },
  {
    textKey: "step_8",
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: 750,
      y: HAND.PLAYER.NORMAL_Y,
      id: "HAND_CARD_DARK_TRAP",
    },
  },
];
