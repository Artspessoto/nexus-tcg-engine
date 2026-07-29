import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { THEME_CONFIG } from "../constants/ThemeConfig";
import {
  TutorialEvent,
  type CameraFocusPayload,
} from "../events/TutorialEvents";
import type { GameSide } from "../types/GameTypes";

export class TutorialBoardScene extends Phaser.Scene {
  constructor() {
    super("TutorialBoardScene");
  }

  create() {
    const { SCREEN, GAME_STATE } = LAYOUT_CONFIG;
    const { DEPTHS } = THEME_CONFIG;

    const bg = this.add.image(
      SCREEN.CENTER_X,
      SCREEN.CENTER_Y,
      "battle-scene-background",
    );
    bg.setDisplaySize(SCREEN.WIDTH, SCREEN.HEIGHT).setDepth(DEPTHS.BACKGROUND);

    this.createDummyMana("PLAYER", GAME_STATE.BASE_MANA);
    this.createDummyMana("OPPONENT", GAME_STATE.BASE_MANA);

    this.createDummyLPBar("PLAYER", GAME_STATE.BASE_LP);
    this.createDummyLPBar("OPPONENT", GAME_STATE.BASE_LP);

    this.events.on(
      TutorialEvent.FOCUS_CAMERA,
      (payload: CameraFocusPayload) => this.handleCameraFocus(payload),
      this,
    );
  }

  private createDummyMana(side: GameSide, amount: number): void {
    const { DEPTHS, FONTS } = THEME_CONFIG;
    const position = LAYOUT_CONFIG.UI.MANA[side];

    this.add
      .image(position.x, position.y, "battle_ui", "mana_icon")
      .setScale(0.4)
      .setDepth(DEPTHS.UI_BASE);

    this.add
      .text(position.x, position.y, `${amount}`, FONTS.STYLES.MANA_DISPLAY)
      .setOrigin(0.5)
      .setDepth(DEPTHS.UI_BASE + 1);
  }

  private createDummyLPBar(side: GameSide, initialHP: number): void {
    const { UI } = LAYOUT_CONFIG;
    const { COLORS, FONTS } = THEME_CONFIG;
    const { HEIGHT, RADIUS, WIDTH, X, Y_OPPONENT, Y_PLAYER } = UI.LP_BAR;
    const isPlayer = side == "PLAYER";

    const yPos = isPlayer ? Y_PLAYER : Y_OPPONENT;
    const xPos = X;
    const playerName = isPlayer ? "PLAYER" : "NPC";

    const container = this.add.container(xPos, yPos);

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.OVERLAY_BLACK, 0.5);
    bg.fillRoundedRect(4, 4, WIDTH, HEIGHT, RADIUS);

    bg.fillStyle(COLORS.STONE_DARK, 1);
    bg.fillRoundedRect(0, 0, WIDTH, HEIGHT, RADIUS);

    bg.lineStyle(4, COLORS.GOLD_METAL, 1);
    bg.strokeRoundedRect(0, 0, WIDTH, HEIGHT, RADIUS);

    bg.lineStyle(2, COLORS.OVERLAY_BLACK, 0.3);
    bg.strokeRoundedRect(3, 3, WIDTH - 6, HEIGHT - 6, RADIUS - 2);
    container.add(bg);

    const nameText = this.add
      .text(20, 8, playerName, {
        fontFamily: THEME_CONFIG.FONTS.FAMILY_DISPLAY,
        fontSize: "16px",
        color: "#EAEAEA",
      })
      .setOrigin(0.0);
    container.add(nameText);

    const labelLP = this.add
      .text(20, 45, "LP", {
        fontFamily: FONTS.FAMILY_DISPLAY,
        fontSize: "18px",
        color: COLORS.GOLD_GLOW,
      })
      .setOrigin(0, 0.5);
    container.add(labelLP);

    const textStyle = {
      fontFamily: FONTS.FAMILY_DISPLAY,
      fontSize: "36px",
      color: COLORS.GOLD_GLOW,
    };

    const hpText = this.add
      .text(55, 45, `${initialHP}`, textStyle)
      .setOrigin(0, 0.5)
      .setShadow(2, 2, "#000000", 4, true, false);

    container.add(hpText);

    if (isPlayer) {
      container.setY(yPos - 10);
    }
  }

  private handleCameraFocus(payload: CameraFocusPayload) {
    const { ANIMATIONS } = THEME_CONFIG;
    const duration = 1000;

    this.cameras.main.pan(
      payload.x,
      payload.y,
      duration,
      ANIMATIONS.EASING.SMOOTH,
    );
    this.cameras.main.zoomTo(payload.zoom, duration, ANIMATIONS.EASING.SMOOTH);
  }
}
