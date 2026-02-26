export const LAYOUT_CONFIG = {
  SCREEN: {
    WIDTH: 1280,
    HEIGHT: 720,
    CENTER_X: 640,
    CENTER_Y: 360,
    MAX_WIDTH: 2560,
    MAX_HEIGHT: 1440,
  },
  MENU: {
    TITLE_Y: 150,
    SUBTITLE_Y: 260,
    DIFF_BUTTONS: {
      Y: 360,
      SPACING: 180,
      WIDTH: 150,
      HEIGHT: 70,
    },
    ACTIONS: {
      START_Y: 520,
      GUIDE_Y: 590,
    },
    LANG_PICKER: {
      PT_X: 1150,
      EN_X: 1210,
      Y: 50,
    },
  },
  NAME_INPUT: {
    TITLE_Y: 200,
    DOM_Y: 350,
    CONFIRM_Y: 480,
    BACK_Y: 560,
  },
  BATTLE: {
    PHASE_BUTTON: { x: 1120, y: 420, width: 200, height: 60 },
    ACTIVATION_CENTER: { x: 640, y: 360 },
    OVERLAY_DEPTH: 20000,
  },
  HAND: {
    PLAYER: { NORMAL_Y: 710, HIDDEN_Y: 850 },
    OPPONENT: { NORMAL_Y: 10, HIDDEN_Y: -150 },
    MAX_CARDS: 6,
    SPACING: 115,
  },
  DECK: {
    PLAYER: { x: 1122, y: 542 },
    OPPONENT: { x: 1122, y: 170 },
  },
  FIELD: {
    ZONE_SIZE: { W: 110, H: 150 },
    PLAYER: {
      MONSTER: [
        { x: 505, y: 450 },
        { x: 645, y: 450 },
        { x: 787, y: 450 },
      ],
      SPELL: [
        { x: 505, y: 600 },
        { x: 645, y: 600 },
        { x: 787, y: 600 },
      ],
      GRAVEYARD: { x: 108, y: 450 },
    },
    OPPONENT: {
      MONSTER: [
        { x: 505, y: 270 },
        { x: 645, y: 270 },
        { x: 787, y: 270 },
      ],
      SPELL: [
        { x: 505, y: 120 },
        { x: 645, y: 120 },
        { x: 787, y: 120 },
      ],
      GRAVEYARD: { x: 108, y: 270 },
    },
  },
  UI: {
    MANA: {
      PLAYER: { x: 1232, y: 650 },
      OPPONENT: { x: 1232, y: 73 },
    },
    LP_BAR: {
      WIDTH: 180,
      HEIGHT: 60,
      RADIUS: 12,
      X: 30,
      Y_PLAYER: 630,
      Y_OPPONENT: 40,
    },
  },
  MODAL: {
    DEFAULT_WIDTH: 800,
    DEFAULT_HEIGHT: 550,
    GUIDE: {
      TITLE_Y: 160,
      CONTENT_Y: 360,
      CLOSE_Y: 580,
    },
    DETAIL: {
      WIDTH: 800,
      HEIGHT: 500,
      CARD_X_OFFSET: 200,
      TEXT_X_OFFSET: 380,
      TEXT_START_Y: 60,
    },
    LIST: {
      WIDTH: 800,
      HEIGHT: 600,
      GRID_WIDTH: 500,
      DETAIL_WIDTH: 300,
      COLS: 4,
      CELL_HEIGHT: 135,
      TEXT_Y_START: 380,
    },
  },
};
