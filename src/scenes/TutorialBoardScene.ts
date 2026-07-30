import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { THEME_CONFIG } from "../constants/ThemeConfig";
import {
  TutorialEvent,
  type CameraFocusPayload,
} from "../events/TutorialEvents";
import type { GameSide } from "../types/GameTypes";
import { DeckView } from "../view/DeckView";

export class TutorialBoardScene extends Phaser.Scene {
  private overlay!: Phaser.GameObjects.Rectangle;
  private uiElements: Map<string, Phaser.GameObjects.Container> = new Map();

  constructor() {
    super("TutorialBoardScene");
  }

  create() {
    const { SCREEN, GAME_STATE } = LAYOUT_CONFIG;
    const { DEPTHS, COLORS } = THEME_CONFIG;

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

    this.createDummyDeck("PLAYER");
    this.createDummyDeck("OPPONENT");

    this.overlay = this.add
      .rectangle(
        SCREEN.CENTER_X,
        SCREEN.CENTER_Y,
        SCREEN.WIDTH,
        SCREEN.HEIGHT,
        COLORS.OVERLAY_BLACK,
        0.7,
      )
      .setDepth(DEPTHS.UI_BASE - 1)
      .setAlpha(0); //behind the dummies and invisible

    this.events.on(TutorialEvent.FOCUS_CAMERA, (data: CameraFocusPayload) => {
      this.handleCameraFocus(data);
    });
    this.events.on(TutorialEvent.RESET_CAMERA, () => {
      this.handleCameraReset();
    });

    this.events.once("shutdown", () => {
      this.events.off(TutorialEvent.FOCUS_CAMERA, this.handleCameraFocus, this);
      this.events.off(TutorialEvent.RESET_CAMERA, this.handleCameraReset, this);
    });
  }

  private createDummyDeck(side: GameSide): void {
    const { DECK } = LAYOUT_CONFIG;
    const position = DECK[side];

    const dummyDeck = new DeckView(this, {
      x: position.x,
      y: position.y,
    });
    dummyDeck.createDeckVisual(20);

    dummyDeck.container.setDepth(0);
    this.uiElements.set(`${side}_DECK`, dummyDeck.container);
  }

  private createDummyMana(side: GameSide, amount: number): void {
    const { FONTS } = THEME_CONFIG;
    const position = LAYOUT_CONFIG.UI.MANA[side];

    const container = this.add.container(position.x, position.y).setDepth(0);

    const icon = this.add.image(0, 0, "battle_ui", "mana_icon").setScale(0.4);

    const text = this.add
      .text(0, 0, `${amount}`, FONTS.STYLES.MANA_DISPLAY)
      .setOrigin(0.5);

    container.add([icon, text]);

    this.uiElements.set(`MANA_${side}`, container);
  }

  private createDummyLPBar(side: GameSide, initialHP: number): void {
    const { UI } = LAYOUT_CONFIG;
    const { COLORS, FONTS } = THEME_CONFIG;
    const { HEIGHT, RADIUS, WIDTH, X, Y_OPPONENT, Y_PLAYER } = UI.LP_BAR;
    const isPlayer = side == "PLAYER";

    const yPos = isPlayer ? Y_PLAYER : Y_OPPONENT;
    const xPos = X;
    const playerName = isPlayer ? "PLAYER" : "NPC";

    const container = this.add.container(xPos, yPos).setDepth(0);

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

    this.uiElements.set(`LP_BAR_${side}`, container);
  }

  private handleCameraFocus(targetData?: {
    id?: string;
    x: number;
    y: number;
  }): void {
    const { ANIMATIONS, DEPTHS } = THEME_CONFIG;

    //reset depth of all elements
    this.uiElements.forEach((container) => container.setDepth(0));

    //turns element front of the overlay
    if (targetData && targetData.id) {
      const element = this.uiElements.get(targetData.id);
      if (element) {
        element.setDepth(DEPTHS.UI_BASE);
      }
    }

    //show overlay to focus object
    this.tweens.add({
      targets: this.overlay,
      alpha: 1,
      duration: 1000,
      ease: ANIMATIONS.EASING.SMOOTH,
    });
  }

  private handleCameraReset(duration: number = 1000): void {
    const { ANIMATIONS } = THEME_CONFIG;

    //return all elements behind overlay
    this.uiElements.forEach((container) => container.setDepth(0));

    this.tweens.add({
      targets: this.overlay,
      alpha: 0,
      duration,
      ease: ANIMATIONS.EASING.SMOOTH,
    });
  }
}
