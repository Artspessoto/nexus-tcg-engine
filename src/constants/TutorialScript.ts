import type { TutorialStep } from "../types/TutorialType";
import { LAYOUT_CONFIG } from "./LayoutConfig";

const { UI, DECK, HAND, SCREEN, BATTLE } = LAYOUT_CONFIG;

export const TUTORIAL_STEPS: TutorialStep[] = [
  { textKey: "step_1", layoutMode: "NARRATIVE" },
  { textKey: "step_1b", layoutMode: "NARRATIVE" },
  {
    textKey: "step_2", //LP_BAR focus
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: UI.LP_BAR.X,
      y: UI.LP_BAR.Y_PLAYER,
      id: ["LP_BAR_PLAYER"],
    },
  },
  {
    textKey: "step_3", //MANA_PLAYER focus
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: UI.MANA.PLAYER.x,
      y: UI.MANA.PLAYER.y,
      id: ["MANA_PLAYER"],
    },
  },
  {
    textKey: "step_4", //DECK focus
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: DECK.PLAYER.x,
      y: DECK.PLAYER.y,
      id: ["PLAYER_DECK"],
    },
  },
  {
    textKey: "step_5", //player hand focus
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: 200,
      y: HAND.PLAYER.NORMAL_Y,
      id: ["PLAYER_HAND"],
    },
  },
  {
    textKey: "step_5a", //monster card focus
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: 180,
      y: HAND.PLAYER.NORMAL_Y,
      id: ["HAND_CARD_TOON_KNIGHT"],
    },
  },
  {
    textKey: "step_5b", //effect monster card focus
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: 300,
      y: HAND.PLAYER.NORMAL_Y,
      id: ["HAND_CARD_MAGE_APPRENTICE"],
    },
  },
  {
    textKey: "step_5c", //spell card focus
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: 420,
      y: HAND.PLAYER.NORMAL_Y,
      id: ["HAND_CARD_FIRE_BALL"],
    },
  },
  {
    textKey: "step_5d", //trap card focus
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: 530,
      y: HAND.PLAYER.NORMAL_Y,
      id: ["HAND_CARD_DARK_TRAP"],
    },
  },
  {
    textKey: "step_6",
    layoutMode: "NARRATIVE",
  },
  {
    textKey: "step_6a", //field monster zones focus
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: 70,
      y: SCREEN.CENTER_Y + 50,
      id: ["FIELD_MONSTER_ZONES"],
    },
  },
  {
    textKey: "step_6b", //field spell zones focus
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: 70,
      y: SCREEN.CENTER_Y + 200,
      id: ["FIELD_SPELL_ZONES"],
    },
  },
  {
    textKey: "step_6c", //field graveyard zone focus
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: 150,
      y: SCREEN.CENTER_Y,
      id: ["FIELD_GRAVEYARD_ZONE"],
    },
  },
  {
    textKey: "step_7", //phase btn focus
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: BATTLE.PHASE_BUTTON.x,
      y: BATTLE.PHASE_BUTTON.y,
      id: ["PHASE_BUTTON"],
    },
  },
  {
    textKey: "step_7a", //draw phase focus
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: BATTLE.PHASE_BUTTON.x,
      y: BATTLE.PHASE_BUTTON.y,
      id: ["PHASE_BUTTON"],
    },
  },
  {
    textKey: "step_7b", //draw phase notes text focus
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: BATTLE.PHASE_BUTTON.x,
      y: BATTLE.PHASE_BUTTON.y,
      id: ["PHASE_BUTTON"],
    },
  },
  {
    textKey: "step_7c", //main phase focus
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: BATTLE.PHASE_BUTTON.x,
      y: BATTLE.PHASE_BUTTON.y,
      id: ["PHASE_BUTTON"],
    },
  },
  {
    textKey: "step_7d", //battle phase focus
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: BATTLE.PHASE_BUTTON.x,
      y: BATTLE.PHASE_BUTTON.y,
      id: ["PHASE_BUTTON"],
    },
  },
  {
    textKey: "step_7e", //end phase focus
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: BATTLE.PHASE_BUTTON.x,
      y: BATTLE.PHASE_BUTTON.y,
      id: ["PHASE_BUTTON"],
    },
  },
  {
    textKey: "step_8", //back to main phase
    layoutMode: "NARRATIVE",
    focusTarget: {
      x: 0,
      y: 0,
      id: ["PHASE_BUTTON"],
    },
  },
  {
    textKey: "step_8a", //send monster card to zone focus
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: 200,
      y: HAND.PLAYER.NORMAL_Y,
      id: ["HAND_CARD_TOON_KNIGHT", "FIELD_MONSTER_ZONES"],
      disabled_hover: true,
    },
    requireAction: true,
  },
  {
    textKey: "step_9", //monster battle position (attack or defense)
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: SCREEN.CENTER_X,
      y: SCREEN.CENTER_Y + 50,
      id: ["FIELD_MONSTER_ZONES"],
      disabled_hover: true,
    },
    requireAction: true,
    skipCameraSync: true,
  },
  {
    textKey: "step_10", //mana update
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: UI.MANA.PLAYER.x,
      y: UI.MANA.PLAYER.y,
      id: ["MANA_PLAYER"],
    },
  },
  {
    textKey: "step_11", //monster click action to open menu
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: SCREEN.CENTER_X - 50,
      y: SCREEN.CENTER_Y + 50,
      id: ["FIELD_CARD_TOON_KNIGHT"],
      disabled_hover: true,
    },
    requireAction: true,
  },
  {
    textKey: "step_11a", //monster details btn option
    layoutMode: "TOOLTIP",
    skipCameraSync: true,
    focusTarget: {
      x: SCREEN.CENTER_X - 50,
      y: SCREEN.CENTER_Y + 50,
      id: ["FIELD_CARD_TOON_KNIGHT"],
      disabled_hover: true,
    },
    requireAction: true,
  },
  {
    textKey: "step_11b", //details modal
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: SCREEN.CENTER_X - 50,
      y: SCREEN.CENTER_Y + 50,
      id: ["FIELD_CARD_TOON_KNIGHT"],
      disabled_hover: true,
    },
    requireAction: true,
  },
  {
    textKey: "step_12", //send spell card to zone (need drag)
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: 200,
      y: HAND.PLAYER.NORMAL_Y,
      id: ["HAND_CARD_FIRE_BALL", "FIELD_SPELL_ZONES"],
      disabled_hover: true,
    },
    requireAction: true,
  },
  {
    textKey: "step_12a", //spell card menu action (active)
    layoutMode: "TOOLTIP",
    skipCameraSync: true,
    focusTarget: {
      x: 200,
      y: HAND.PLAYER.NORMAL_Y,
      id: ["HAND_CARD_FIRE_BALL"],
      disabled_hover: true,
    },
  },
  {
    textKey: "step_13", //graveyard introduction (click on graveyard)
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: 150,
      y: SCREEN.CENTER_Y,
      id: ["FIELD_GRAVEYARD_ZONE", "GRAVEYARD_CARD_FIRE_BALL"],
      disabled_hover: true,
    },
    requireAction: true,
  },
  {
    textKey: "step_13a", //graveyard details btn
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: 180,
      y: SCREEN.CENTER_Y - 50,
      id: ["FIELD_GRAVEYARD_ZONE", "GRAVEYARD_CARD_FIRE_BALL"],
      disabled_hover: true,
    },
    requireAction: true,
  },
  {
    textKey: "step_13b", //graveyard modal list
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: 240,
      y: SCREEN.CENTER_Y + 70,
      id: ["FIELD_GRAVEYARD_ZONE"],
      disabled_hover: true,
    },
    requireAction: true,
  },
  {
    textKey: "step_13c", //change field monster pos to attack
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: 50,
      y: SCREEN.CENTER_Y + 50,
      id: ["FIELD_CARD_TOON_KNIGHT"],
      disabled_hover: true,
    },
    requireAction: true,
  },
  {
    textKey: "step_14",
    layoutMode: "NARRATIVE",
  },
  {
    textKey: "step_15", //advance to battle phase
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: BATTLE.PHASE_BUTTON.x,
      y: BATTLE.PHASE_BUTTON.y,
      id: ["PHASE_BUTTON"],
    },
    requireAction: true,
  },
  {
    textKey: "step_16", //npc's monster was summoned
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: SCREEN.CENTER_X - 40,
      y: 270,
      id: ["OPPONENT_FIELD_CARD_MAGE_APPRENTICE"],
      disabled_hover: true,
    },
  },
  {
    textKey: "step_16a", //select their own monster and declared an attack
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: 50,
      y: SCREEN.CENTER_Y + 50,
      id: ["FIELD_CARD_TOON_KNIGHT"],
      disabled_hover: true,
    },
    requireAction: true,
  },
  {
    textKey: "step_16b", //target enemy monster to execute attack
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: 50,
      y: 270,
      id: ["OPPONENT_FIELD_CARD_MAGE_APPRENTICE", "FIELD_CARD_TOON_KNIGHT"],
      disabled_hover: true,
    },
    requireAction: true,
  },
  {
    textKey: "step_16c", //own monster cannot attack 2x in same turn
    layoutMode: "TOOLTIP",
    skipCameraSync: true,
    focusTarget: {
      x: SCREEN.CENTER_X - 50,
      y: SCREEN.CENTER_Y + 50,
      id: ["FIELD_CARD_TOON_KNIGHT"],
      disabled_hover: true,
    },
  },
  {
    textKey: "step_17", //end player turn action
    layoutMode: "TOOLTIP",
    focusTarget: {
      x: BATTLE.PHASE_BUTTON.x,
      y: BATTLE.PHASE_BUTTON.y,
      id: ["PHASE_BUTTON"],
    },
    requireAction: true,
  },
  {
    textKey: "step_18",
    layoutMode: "NARRATIVE",
  },
];
