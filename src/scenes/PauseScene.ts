import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { THEME_CONFIG } from "../constants/ThemeConfig";
import { TRANSLATIONS } from "../constants/Translations";
import { EventBus } from "../events/EventBus";
import { GameEvent } from "../events/GameEvents";
import { LanguageManager } from "../managers/language/LanguageManager";
import { ToonButton } from "../objects/ToonButton";

export class PauseScene extends Phaser.Scene {
  private mainPauseContainer!: Phaser.GameObjects.Container;
  private controlsContainer!: Phaser.GameObjects.Container;

  constructor() {
    super("PauseScene");
  }

  create() {
    const lang = LanguageManager.getInstance().currentLanguage;
    const currentTranslations = TRANSLATIONS[lang].pause_scene;

    const { CENTER_X, CENTER_Y, WIDTH, HEIGHT } = LAYOUT_CONFIG.SCREEN;
    const { COLORS, COMPONENTS, FONTS } = THEME_CONFIG;

    const overlay = this.add.rectangle(
      CENTER_X,
      CENTER_Y,
      WIDTH,
      HEIGHT,
      COLORS.OVERLAY_BLACK,
      0.7,
    );
    overlay.setInteractive();

    const panelWidth = 440;
    const panelHeight = 315;
    const cornerRadius = 16;
    const panelX = CENTER_X - panelWidth / 2;
    const panelY = CENTER_Y - panelHeight / 2;

    const panel = this.add.graphics();
    panel.fillStyle(0x1a1a1a, 1);
    panel.lineStyle(4, COLORS.GOLD_METAL, 1);

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

    //main menu (button list)
    this.mainPauseContainer = this.add.container(0, 0);

    const titleText = this.add
      .text(CENTER_X, panelY + 40, currentTranslations.paused, {
        fontSize: "28px",
        fontFamily: FONTS.FAMILY_DISPLAY,
        color: "#ddb63e",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const btnWidth = 240;
    const btnHeight = 44;

    const resumeButton = new ToonButton(this, {
      x: CENTER_X,
      y: panelY + 115,
      text: currentTranslations.resume,
      // textColor: "#ffffff",
      width: btnWidth,
      height: btnHeight,
    });

    const controlsButton = new ToonButton(this, {
      x: CENTER_X,
      y: panelY + 175,
      text: currentTranslations.controls_btn,
      fontSize: "16px",
      textColor: "#ffffff",
      color: 0x252830,
      hoverColor: 0x383c48,
      width: btnWidth,
      height: btnHeight,
    });

    const forfeitButton = new ToonButton(this, {
      x: CENTER_X,
      y: panelY + 235,
      text: currentTranslations.forfeit,
      textColor: "#ffffff",
      color: COMPONENTS.BUTTONS.SECONDARY.color,
      hoverColor: COMPONENTS.BUTTONS.SECONDARY.hoverColor,
      width: btnWidth,
      height: btnHeight,
    });

    forfeitButton.once("pointerdown", () => {
      this.handleForfeit();
    });

    resumeButton.once("pointerdown", () => {
      this.handleResume();
    });

    controlsButton.on("pointerdown", () => this.toggleControlsView(true));

    this.mainPauseContainer.add([
      titleText,
      resumeButton,
      controlsButton,
      forfeitButton,
    ]);

    //controls menu
    this.controlsContainer = this.add.container(0, 0);
    this.controlsContainer.setVisible(false);

    const controlsTitle = this.add
      .text(CENTER_X, panelY + 38, currentTranslations.controls_title, {
        fontSize: "20px",
        fontFamily: FONTS.FAMILY_DISPLAY,
        color: "#ddb63e",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const controlsList = this.add
      .text(
        panelX + 32,
        panelY + 75,
        currentTranslations.controls.join("\n\n"),
        {
          fontSize: "13px",
          fontFamily: FONTS.FAMILY_DISPLAY,
          color: "#d0d0d0",
          lineSpacing: 4,
          wordWrap: { width: panelWidth - 64 },
        },
      )
      .setOrigin(0, 0);

    const backBtn = new ToonButton(this, {
      x: CENTER_X,
      y: panelY + 275,
      text: currentTranslations.back,
      fontSize: "15px",
      textColor: "#ffffff",
      color: 0x252830,
      hoverColor: 0x383c48,
      width: 170,
      height: 40,
    });

    backBtn.on("pointerdown", () => this.toggleControlsView(false));

    this.controlsContainer.add([controlsTitle, controlsList, backBtn]);

    this.input.keyboard?.on("keydown-ESC", () => {
      if (this.controlsContainer.visible) {
        this.toggleControlsView(false);
      } else {
        this.handleResume();
      }
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

  private toggleControlsView(showControls: boolean): void {
    this.mainPauseContainer.setVisible(!showControls);
    this.controlsContainer.setVisible(showControls);
  }
}
