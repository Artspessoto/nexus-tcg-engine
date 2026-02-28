export const THEME_CONFIG = {
  COLORS: {
    GOLD_PRIMARY: "#ffcc00", // titles and main buttons
    GOLD_GLOW: "#FFD966", // Mana and LP
    GOLD_METAL: 0xcfb35d, // metal border
    GOLD_DARK: 0x996600, // panel border (guide/details)
    GOLD_UI_STROKE: "#4D2600", //mana counter stroke

    //states
    NOTICE_PHASE: 0xffcc00,
    NOTICE_WARNING: 0xcc0000,
    NOTICE_TURN: 0x0077ff,
    NOTICE_NEUTRAL: 0xbdc3c7,

    //background and panels
    PANEL_BG: 0x1a1a20,
    PANEL_BG_DARK: 0x0a0a0a,
    OVERLAY_BLACK: 0x000000,
    STONE_DARK: 0x262626,

    //card types
    TYPE_MONSTER: "#ddaa55",
    TYPE_SPELL: "#55aaff",
    TYPE_TRAP: "#bc55ff",

    TINT_DISABLED: 0x999999,
    TINT_IMPACT: 0xff0000,
    LP_DAMAGE: "#ff4d4d",
    LP_HEAL: "#4dff4d",
  },
  FONTS: {
    FAMILY_PRIMARY: "Arial",
    FAMILY_DISPLAY: "Arial Black",

    STYLES: {
      MAIN_TITLE: {
        fontSize: "80px",
        color: "#ffcc00",
        fontStyle: "bold",
        stroke: "#000",
        strokeThickness: 8,
        shadow: { offsetX: 5, offsetY: 5, color: "#000", blur: 2, fill: true },
      },
      MENU_SUBTITLE: {
        fontSize: "22px",
        color: "#ffffff",
        fontStyle: "bold",
      },
      MODAL_TITLE: {
        fontSize: "32px",
        color: "#ffcc00",
        fontStyle: "bold",
        letterSpacing: 2,
      },
      MODAL_CONTENT: {
        fontSize: "1.4rem",
        color: "#fff",
        align: "center",
      },
      CARD_NAME: {
        fontSize: "24px",
        fontFamily: "Arial Black",
        color: "#FFFFFF",
        stroke: "#000000",
        strokeThickness: 4,
      },
      MANA_DISPLAY: {
        fontSize: "32px",
        fontFamily: "Arial Black",
        color: "#FFD966",
        stroke: "#4D2600",
        strokeThickness: 5,
        align: "center",
      },
      BANNER_TEXT: {
        fontSize: "25px",
        color: "#FFFFFF",
        fontStyle: "bold italic",
        fontFamily: "Arial Black",
        stroke: "#000000",
        strokeThickness: 6,
      },
    },
  },
  ANIMATIONS: {
    DURATIONS: {
      FAST: 100,
      UI_POP: 150,
      PREVIEW: 200,
      FIELD_PLAY: 250,
      NORMAL: 300,
      ACTIVATION: 400,
      SLOW: 500,
      LP_ROLL: 1200,
      TURN_TRANSITION: 1500,
    },
    EASING: {
      BOUNCE: "Back.easeOut",
      QUART_OUT: "Quad.easeOut",
      POWER_OUT: "Power2.easeOut",
      EXPO_OUT: "Expo.easeOut",
      SMOOTH: "Power2",
    },
    SHAKES: {
      LIGHT: { duration: 100, intensity: 0.002 },
      MEDIUM: { duration: 100, intensity: 0.003 },
      STRONG: { duration: 200, intensity: 0.005 },
    },
  },
  COMPONENTS: {
    CARD: {
      SCALES: {
        PLAYER_HAND: 0.45,
        DEFAULT_HAND: 0.35,
        FIELD_ATK: 0.32,
        FIELD_DEF: 0.3,
        PREVIEW: 0.55,
        ZOOM: 1.5,
      },
      OFFSETS: {
        HOVER_Y: -280,
      },
    },
    BUTTONS: {
      PRIMARY: {
        color: 0x302b1f,
        textColor: "#FFD966",
        borderColor: 0xeee5ae,
        hoverColor: 0x4d4533,
      },
      SECONDARY: {
        color: 0x1a1a1a,
        textColor: "#ffffff",
        hoverColor: 0x333333,
      },
      PHASE: {
        color: 0x242424,
      },
    },
    UI: {
      BANNER_HEIGHT: 80,
    },
  },
  //z-index
  DEPTHS: {
    BACKGROUND: -100,
    DECK: 10,
    FIELD_CARDS: 10,
    UI_BASE: 100,
    HAND_CARDS: 200,
    DRAGGING_CARD: 2000,
    PHASE_BUTTON: 5000,
    PREVIEW_CARD: 5000,
    BANNERS: 10000,
    SELECTION_MENU: 10002,
    OVERLAY_ACTIVATION: 20000,
  },
};
