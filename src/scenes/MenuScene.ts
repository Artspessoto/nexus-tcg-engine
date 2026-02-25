import Phaser from "phaser";
import { ToonButton } from "../objects/ToonButton";
import { LanguageManager } from "../managers/LanguageManager";
import { TRANSLATIONS } from "../constants/Translations";
import { LAYOUT_CONFIG } from "../constants/LayoutConfig";

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export class MenuScene extends Phaser.Scene {
  private selectedDifficulty: Difficulty = "MEDIUM";
  private diffButtons: Map<Difficulty, Phaser.GameObjects.Text> = new Map();
  private diffBgs: Map<Difficulty, Phaser.GameObjects.Graphics> = new Map();

  constructor() {
    super("MenuScene");
  }

  preload() {
    this.load.image("background", "assets/menu_background.jpg");
  }

  create() {
    const { SCREEN, MENU } = LAYOUT_CONFIG;
    const lang = LanguageManager.getInstance().currentLanguage;
    const strings = TRANSLATIONS[lang].menu;

    const bg = this.add.image(SCREEN.CENTER_X, SCREEN.CENTER_Y, "background");
    bg.setDisplaySize(SCREEN.WIDTH, 900);
    this.add.rectangle(
      SCREEN.CENTER_X,
      SCREEN.CENTER_Y,
      SCREEN.WIDTH,
      SCREEN.HEIGHT,
      0x000000,
      0.5,
    );

    this.add
      .text(SCREEN.CENTER_X, MENU.TITLE_Y, "TOON CASTLE", {
        fontSize: "80px",
        color: "#ffcc00",
        fontStyle: "bold",
        stroke: "#000",
        strokeThickness: 8,
        shadow: { offsetX: 5, offsetY: 5, color: "#000", blur: 2, fill: true },
      })
      .setOrigin(0.5);

    this.add
      .text(SCREEN.CENTER_X, MENU.SUBTITLE_Y, strings.select_diff, {
        fontSize: "22px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const diffs: { id: Difficulty; label: string; color: string }[] = [
      { id: "EASY", label: strings.easy, color: "#00ff00" },
      { id: "MEDIUM", label: strings.medium, color: "#ffff00" },
      { id: "HARD", label: strings.hard, color: "#ff0000" },
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
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      btn.on("pointerdown", () => this.updateDifficulty(diff.id, diff.color));

      this.diffButtons.set(diff.id, btn);
    });

    this.updateDifficulty("MEDIUM", "#ffff00");

    const startBtn = new ToonButton(this, {
      x: SCREEN.CENTER_X,
      y: MENU.ACTIONS.START_Y,
      text: strings.start,
    });

    startBtn.on("pointerdown", () => {
      this.scene.start("NameScene", { difficulty: this.selectedDifficulty });
    });

    const guideBtn = new ToonButton(this, {
      x: SCREEN.CENTER_X,
      y: MENU.ACTIONS.GUIDE_Y,
      text: strings.guide,
      fontSize: "1.2rem",
      textColor: "#fff",
      color: 0x333333,
      hoverColor: 0x222222,
    });

    guideBtn.on("pointerdown", () => {
      this.scene.pause();
      this.scene.launch("GuideScene");
    });

    const btnPT = this.add
      .text(MENU.LANG_PICKER.PT_X, 50, "PT", {
        fontSize: "20px",
        color: "#fff",
      })
      .setInteractive({ useHandCursor: true });

    const btnEN = this.add
      .text(MENU.LANG_PICKER.EN_X, 50, "EN", {
        fontSize: "20px",
        color: "#fff",
      })
      .setInteractive({ useHandCursor: true });

    btnPT.on("pointerdown", () => {
      LanguageManager.getInstance().setLanguage("pt-br");
      this.scene.restart();
    });

    btnEN.on("pointerdown", () => {
      LanguageManager.getInstance().setLanguage("en");
      this.scene.restart();
    });
  }

  private updateDifficulty(difficulty: Difficulty, activeColor: string) {
    const { DIFF_BUTTONS } = LAYOUT_CONFIG.MENU;
    this.selectedDifficulty = difficulty;

    this.diffButtons.forEach((btn, id) => {
      const graphics = this.diffBgs.get(id)!;
      const isSelected = id === difficulty;

      graphics.clear();

      if (isSelected) {
        graphics.lineStyle(
          3,
          Phaser.Display.Color.HexStringToColor(activeColor).color,
          1,
        );
        graphics.fillStyle(0x111111, 0.9);
        btn.setStyle({ color: activeColor }).setScale(1.0);
      } else {
        graphics.lineStyle(2, 0x000000, 0.5);
        graphics.fillStyle(0x111111, 0.7);
        btn.setStyle({ color: "#666" }).setScale(1.0);
      }

      graphics.fillRoundedRect(
        btn.x - DIFF_BUTTONS.WIDTH / 2,
        btn.y - DIFF_BUTTONS.HEIGHT / 2,
        DIFF_BUTTONS.WIDTH,
        DIFF_BUTTONS.HEIGHT,
        10,
      );
      graphics.strokeRoundedRect(
        btn.x - DIFF_BUTTONS.WIDTH / 2,
        btn.y - DIFF_BUTTONS.HEIGHT / 2,
        DIFF_BUTTONS.WIDTH,
        DIFF_BUTTONS.HEIGHT,
        10,
      );
    });
  }
}
