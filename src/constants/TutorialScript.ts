import type { TutorialStep } from "../types/TutorialType";
import { LAYOUT_CONFIG } from "./LayoutConfig";

const { UI, DECK, HAND, SCREEN } = LAYOUT_CONFIG;

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
      x: 200,
      y: HAND.PLAYER.NORMAL_Y,
      id: "PLAYER_HAND",
    },
  },
  {
    textKey: "step_5a",
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: 180,
      y: HAND.PLAYER.NORMAL_Y,
      id: "HAND_CARD_TOON_KNIGHT",
    },
  },
  {
    textKey: "step_5b",
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: 300,
      y: HAND.PLAYER.NORMAL_Y,
      id: "HAND_CARD_MAGE_APPRENTICE",
    },
  },
  {
    textKey: "step_5c",
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: 420,
      y: HAND.PLAYER.NORMAL_Y,
      id: "HAND_CARD_FIRE_BALL",
    },
  },
  {
    textKey: "step_5d",
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: 530,
      y: HAND.PLAYER.NORMAL_Y,
      id: "HAND_CARD_DARK_TRAP",
    },
  },
  {
    textKey: "step_6",
    layoutMode: "NARRATIVE",
  },
  {
    textKey: "step_6a",
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: 70,
      y: SCREEN.CENTER_Y + 50,
      id: "FIELD_MONSTER_ZONES",
    },
  },
  {
    textKey: "step_6b",
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: 70,
      y: SCREEN.CENTER_Y + 200,
      id: "FIELD_SPELL_ZONES",
    },
  },
    {
    textKey: "step_6c",
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: 150,
      y: SCREEN.CENTER_Y,
      id: "FIELD_GRAVEYARD_ZONE",
    },
  },
];
