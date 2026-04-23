import Phaser from "phaser";
import { ToonButton } from "../objects/ToonButton";
import { LanguageManager } from "../managers/language/LanguageManager";
import { TRANSLATIONS } from "../constants/Translations";

export class NameScene extends Phaser.Scene {
  private difficulty: string = "";

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
    const text = TRANSLATIONS[lang].name_scene;

    this.add
      .image(640, 360, "background")
      .setDisplaySize(1280, 900)
      .setAlpha(0.6);
    this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.7);

    this.add
      .text(640, 200, text.title, {
        fontSize: "40px",
        color: "#ffcc00",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const inputElement = this.add.dom(640, 350).createFromCache("nameform");

    const confirmBtn = new ToonButton(this, {
      x: 640,
      y: 480,
      text: text.confirm,
    });

    const backToMenuBtn = new ToonButton(this, {
      x: 640,
      y: 560,
      text: text.back,
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
    })

    this.input.keyboard?.on("keydown-ENTER", () => {
      this.callNextScene(inputElement);
    })

    confirmBtn.on("pointerdown", () => {
      this.callNextScene(inputElement);
    });
  }

  private callNextScene(element: Phaser.GameObjects.DOMElement) {
    const nameInput = element.getChildByName(
      "nameField",
    ) as HTMLInputElement;
    const playerName = nameInput.value.trim();

    if (playerName.length > 0) {
      //Battle scene transition
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.start("BattleScene", {
          playerName: playerName,
          difficulty: this.difficulty,
        });
      });
    } else {
      this.tweens.add({
        targets: element,
        x: element.x + 10,
        duration: 50,
        yoyo: true,
        repeat: 3,
      });
    }
  }
}
