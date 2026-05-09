import Phaser from "phaser";
import { ToonButton } from "../objects/ToonButton";
import { LanguageManager } from "../managers/language/LanguageManager";
import { TRANSLATIONS } from "../constants/Translations";
import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { THEME_CONFIG } from "../constants/ThemeConfig";
import type { NameTranslations } from "../types/GameTypes";

export class NameScene extends Phaser.Scene {
  private difficulty: string = "";
  private warningText!: Phaser.GameObjects.Text;
  private readonly MAX_NAME_LENGTH = 12;

  constructor() {
    super("NameScene");
  }

  preload() {
    this.load.html("nameform", "assets/templates/name-input.html");
  }

  init(data: { difficulty: string }) {
    this.difficulty = data.difficulty;
  }

  create() {
    const lang = LanguageManager.getInstance().currentLang;
    const text: NameTranslations = TRANSLATIONS[lang].name_scene;

    const { SCREEN } = LAYOUT_CONFIG;
    const { COLORS } = THEME_CONFIG;

    this.add
      .image(SCREEN.CENTER_X, SCREEN.CENTER_Y, "background")
      .setDisplaySize(SCREEN.WIDTH, SCREEN.HEIGHT + 180)
      .setAlpha(0.6);
    this.add.rectangle(
      SCREEN.CENTER_X,
      SCREEN.CENTER_Y,
      SCREEN.WIDTH,
      SCREEN.HEIGHT,
      COLORS.OVERLAY_BLACK,
      0.7,
    );

    this.add
      .text(SCREEN.CENTER_X, 200, text.title, {
        fontSize: "40px",
        color: "#ffcc00",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const inputElement = this.add.dom(640, 350).createFromCache("nameform");

    this.warningText = this.add
      .text(SCREEN.CENTER_X, 400, "", {
        fontSize: "16px",
        color: "#ff4d4d",
        fontStyle: "bold",
        fontFamily: "Arial",
      })
      .setOrigin(0.5)
      .setAlpha(0); //"invisible"(transparent)

    const confirmBtn = new ToonButton(this, {
      x: 640,
      y: 480,
      text: text.confirm,
    });

    const backToMenuBtn = new ToonButton(this, {
      x: 640,
      y: 560,
      text: text.back_to_menu,
      fontSize: "22px",
      textColor: "#fff",
      color: 0x1a1a1a,
      hoverColor: 0x333333,
    });

    backToMenuBtn.on("pointerdown", () => {
      this.scene.start("MenuScene");
    });

    this.input.keyboard?.on("keydown-ESC", () => {
      this.scene.start("MenuScene");
    });

    this.input.keyboard?.on("keydown-ENTER", () => {
      this.callNextScene(text, inputElement);
    });

    confirmBtn.on("pointerdown", () => {
      this.callNextScene(text, inputElement);
    });
  }

  private callNextScene(
    translation: NameTranslations,
    element: Phaser.GameObjects.DOMElement,
  ) {
    const nameInput = element.getChildByName("nameField") as HTMLInputElement;
    const playerName = nameInput.value.trim();

    this.warningText.setAlpha(0);

    if (playerName.length == 0) {
      this.showWarning(translation.warnings.empty_name, element);
    } else if (playerName.length > this.MAX_NAME_LENGTH) {
      this.showWarning(
        translation.warnings.too_long_name.replace(
          "{max}",
          `${this.MAX_NAME_LENGTH}`,
        ),
        element,
      );
    } else {
      //Battle scene transition
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.start("DeckPreviewScene", {
          playerName: playerName,
          difficulty: this.difficulty,
        });
      });
    }
  }

  private showWarning(message: string, element: Phaser.GameObjects.DOMElement) {
    this.warningText.setText(message);
    this.warningText.setAlpha(1);

    this.tweens.add({
      targets: element,
      x: element.x + 10,
      duration: 50,
      yoyo: true,
      repeat: 3,
    });

    this.tweens.add({
      targets: this.warningText,
      x: this.warningText.x + 5,
      duration: 50,
      yoyo: true,
      repeat: 3,
    });
  }
}
