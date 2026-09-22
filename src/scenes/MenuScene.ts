import Phaser from "phaser";
import { ToonButton } from "../objects/ToonButton";
import { LanguageManager } from "../managers/language/LanguageManager";
import { TRANSLATIONS } from "../constants/Translations";
import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { THEME_CONFIG } from "../constants/ThemeConfig";
import type { Difficulty, Lang } from "../types/GameTypes";

export class MenuScene extends Phaser.Scene {
  private selectedDifficulty: Difficulty = "MEDIUM";
  private diffButtons: Map<Difficulty, Phaser.GameObjects.Text> = new Map();
  private diffBgs: Map<Difficulty, Phaser.GameObjects.Graphics> = new Map();
  private currentLang!: Lang;

  constructor() {
    super("MenuScene");
  }

  preload() {
    this.load.image("background", "assets/system/menu_background.jpg");
    this.load.image(
      "versus_background",
      "assets/system/battle_transition_background.jpg",
    );
  }

  create() {
    this.load.pack("battle_pack", "assets/assets-pack.json", "battle_assets");
    this.load.start();

    const { SCREEN, MENU } = LAYOUT_CONFIG;
    const { COLORS, FONTS, COMPONENTS } = THEME_CONFIG;

    this.currentLang = LanguageManager.getInstance().currentLanguage;
    const strings = TRANSLATIONS[this.currentLang].menu;

    const bg = this.add.image(SCREEN.CENTER_X, SCREEN.CENTER_Y, "background");
    bg.setDisplaySize(SCREEN.WIDTH, 900);
    this.add.rectangle(
      SCREEN.CENTER_X,
      SCREEN.CENTER_Y,
      SCREEN.WIDTH,
      SCREEN.HEIGHT,
      COLORS.OVERLAY_BLACK,
      0.5,
    );

    this.add
      .text(
        SCREEN.CENTER_X,
        MENU.TITLE_Y,
        "TOON CASTLE",
        FONTS.STYLES.MAIN_TITLE,
      )
      .setOrigin(0.5);

    this.add
      .text(SCREEN.CENTER_X, MENU.SUBTITLE_Y, strings.select_diff, {
        fontFamily: FONTS.FAMILY_DISPLAY,
        ...FONTS.STYLES.MENU_SUBTITLE,
      })
      .setOrigin(0.5);

    const diffs: { id: Difficulty; label: string; color: string }[] = [
      { id: "EASY", label: strings.easy, color: "#4CAF50" },
      { id: "MEDIUM", label: strings.medium, color: "#ffff00" },
      // TODO: implement 100% hard difficulty
      // { id: "HARD", label: strings.hard, color: "#ff0000" },
    ];

    const totalWidth = (diffs.length - 1) * MENU.DIFF_BUTTONS.SPACING;
    const startX = SCREEN.CENTER_X - totalWidth / 2;

    diffs.forEach((diff, index) => {
      const xPos = startX + index * MENU.DIFF_BUTTONS.SPACING;
      const yPos = MENU.DIFF_BUTTONS.Y;

      const bgGraphics = this.add.graphics();
      this.diffBgs.set(diff.id, bgGraphics);

      const btn = this.add
        .text(xPos, yPos, diff.label, {
          fontSize: "26px",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      this.diffButtons.set(diff.id, btn);

      const hitZone = this.add
        .zone(xPos, yPos, MENU.DIFF_BUTTONS.WIDTH, MENU.DIFF_BUTTONS.HEIGHT)
        .setInteractive({ useHandCursor: true });

      hitZone.on("pointerdown", () =>
        this.updateDifficulty(diff.id, diff.color),
      );
    });

    this.updateDifficulty("MEDIUM", "#ffff00");

    const startBtn = new ToonButton(this, {
      x: SCREEN.CENTER_X,
      y: MENU.ACTIONS.START_Y,
      text: strings.start,
    });

    startBtn.once("pointerdown", () => {
      this.callNextScene(() => {
        this.scene.start("NameScene", { difficulty: this.selectedDifficulty });
      });
    });

    const tutorialBtn = new ToonButton(this, {
      x: SCREEN.CENTER_X,
      y: MENU.ACTIONS.GUIDE_Y,
      text: strings.tutorial,
      fontSize: "22px",
      ...COMPONENTS.BUTTONS.SECONDARY,
    });

    // guideBtn.on("pointerdown", () => {
    //   this.scene.pause();
    //   this.scene.launch("GuideScene");
    // });
    tutorialBtn.once("pointerdown", () => {
      this.callNextScene(() => {
        this.scene.launch("TutorialUIScene");
        this.scene.start("TutorialBoardScene");
      });
    });

    this.createLanguagePicker();
  }

  private updateDifficulty(difficulty: Difficulty, activeColor: string) {
    const { DIFF_BUTTONS } = LAYOUT_CONFIG.MENU;
    const { COLORS } = THEME_CONFIG;
    this.selectedDifficulty = difficulty;

    this.diffButtons.forEach((btn, id) => {
      const graphics = this.diffBgs.get(id)!;
      const isSelected = id === difficulty;

      graphics.clear();

      if (isSelected) {
        graphics.lineStyle(
          6,
          Phaser.Display.Color.HexStringToColor(activeColor).color,
          1,
        );
        graphics.fillStyle(COLORS.PANEL_BG_DARK, 0.9);
        btn.setStyle({ color: activeColor }).setScale(1.0);
      } else {
        graphics.lineStyle(5, COLORS.OVERLAY_BLACK, 0.5);
        graphics.fillStyle(COLORS.PANEL_BG_DARK, 0.7);
        btn.setStyle({ color: "#666" }).setScale(1.0);
      }

      graphics.fillRoundedRect(
        btn.x - DIFF_BUTTONS.WIDTH / 2,
        btn.y - DIFF_BUTTONS.HEIGHT / 2,
        DIFF_BUTTONS.WIDTH,
        DIFF_BUTTONS.HEIGHT,
        15,
      );
      graphics.strokeRoundedRect(
        btn.x - DIFF_BUTTONS.WIDTH / 2,
        btn.y - DIFF_BUTTONS.HEIGHT / 2,
        DIFF_BUTTONS.WIDTH,
        DIFF_BUTTONS.HEIGHT,
        15,
      );
    });
  }

  private createLanguagePicker(): void {
    const { MENU } = LAYOUT_CONFIG;
    const langPickerY = MENU.LANG_PICKER.Y;
    const isPT = this.currentLang === "pt-BR";

    const btnPT = this.add
      .text(MENU.LANG_PICKER.PT_X, langPickerY, "PT", {
        fontSize: "20px",
        color: isPT ? "#ffffff" : "#666666",
        fontStyle: isPT ? "bold" : "normal",
      })
      .setInteractive({ useHandCursor: true });

    this.add
      .text(
        (MENU.LANG_PICKER.PT_X + MENU.LANG_PICKER.EN_X) / 2 + 10,
        langPickerY,
        "|",
        {
          fontSize: "20px",
          color: "#444444",
        },
      )
      .setOrigin(0.5, 0);

    const btnEN = this.add
      .text(MENU.LANG_PICKER.EN_X, langPickerY, "EN", {
        fontSize: "20px",
        color: !isPT ? "#ffffff" : "#666666",
        fontStyle: !isPT ? "bold" : "normal",
      })
      .setInteractive({ useHandCursor: true });

    btnPT.on("pointerdown", () => {
      if (isPT) return;
      LanguageManager.getInstance().setLanguage("pt-BR");
      this.scene.restart();
    });

    btnEN.on("pointerdown", () => {
      if (!isPT) return;
      LanguageManager.getInstance().setLanguage("en");
      this.scene.restart();
    });
  }

  private callNextScene(fn: () => void) {
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      fn();
    });
  }
}
