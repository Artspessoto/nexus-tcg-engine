import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { THEME_CONFIG } from "../constants/ThemeConfig";
import { TRANSLATIONS } from "../constants/Translations";
import { EventBus } from "../events/EventBus";
import { GameEvent } from "../events/GameEvents";
import { LanguageManager } from "../managers/language/LanguageManager";
import { ToonButton } from "../objects/ToonButton";

export class PauseScene extends Phaser.Scene {
  constructor() {
    super("PauseScene");
  }

  create() {
    const lang = LanguageManager.getInstance().currentLanguage;
    const currentTranslations = TRANSLATIONS[lang].pause_scene;

    const { CENTER_X, CENTER_Y, WIDTH, HEIGHT } = LAYOUT_CONFIG.SCREEN;
    const { COLORS, COMPONENTS } = THEME_CONFIG;

    const overlay = this.add.rectangle(
      CENTER_X,
      CENTER_Y,
      WIDTH,
      HEIGHT,
      COLORS.OVERLAY_BLACK,
      0.7,
    );
    overlay.setInteractive();

    const panelWidth = 320;
    const panelHeight = 250;
    const cornerRadius = 16;

    const panel = this.add.graphics();
    panel.fillStyle(0x1a1a1a, 1);
    panel.lineStyle(4, COLORS.GOLD_METAL, 1);

    const panelX = CENTER_X - panelWidth / 2;
    const panelY = CENTER_Y - panelHeight / 2;

    panel.fillRoundedRect(
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      cornerRadius,
    );
    panel.strokeRoundedRect(
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      cornerRadius,
    );

    this.add
      .text(CENTER_X, CENTER_Y - 60, currentTranslations.paused, {
        fontSize: "30px",
        fontFamily: "Arial Black",
        color: "#ddb63e",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const resumeButton = new ToonButton(this, {
      x: CENTER_X,
      y: CENTER_Y + 20,
      text: currentTranslations.resume,
      // textColor: "#ffffff",
      width: 200,
      height: 50,
    });

    const forfeitButton = new ToonButton(this, {
      x: CENTER_X,
      y: CENTER_Y + 80,
      text: currentTranslations.forfeit,
      textColor: "#ffffff",
      color: COMPONENTS.BUTTONS.SECONDARY.color,
      hoverColor: COMPONENTS.BUTTONS.SECONDARY.hoverColor,
      width: 200,
      height: 50,
    });

    forfeitButton.once("pointerdown", () => {
      this.handleForfeit();
    });

    resumeButton.once("pointerdown", () => {
      this.handleResume();
    });

    this.input.keyboard?.once("keydown-ESC", () => {
      this.handleResume();
    });
  }

  private handleResume(): void {
    this.scene.resume("BattleScene");
    this.scene.stop();

    EventBus.emit(GameEvent.GAME_RESUMED, { message: "resume" });
  }

  private handleForfeit(): void {
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.stop("PauseScene");
      this.scene.stop("BattleScene");
      this.scene.start("MenuScene");
    });
  }
}
