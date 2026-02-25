import Phaser from "phaser";
import { ToonButton } from "../objects/ToonButton";
import { LanguageManager } from "../managers/LanguageManager";
import { TRANSLATIONS } from "../constants/Translations";
import { LAYOUT_CONFIG } from "../constants/LayoutConfig";

export class GuideScene extends Phaser.Scene {
  constructor() {
    super("GuideScene");
  }

  create() {
    const { SCREEN, MODAL } = LAYOUT_CONFIG;
    const lang = LanguageManager.getInstance().currentLang;
    const text = TRANSLATIONS[lang].guide;
    const boxWidth = MODAL.DEFAULT_WIDTH;
    const boxHeight = MODAL.DEFAULT_HEIGHT;
    const x = (SCREEN.WIDTH - boxWidth) / 2;
    const y = (SCREEN.HEIGHT - boxHeight) / 2;
    const content = `${text.lore}\n\n${text.rules}\n\n${text.footer}`;

    this.add.rectangle(
      SCREEN.CENTER_X,
      SCREEN.CENTER_Y,
      SCREEN.WIDTH,
      SCREEN.HEIGHT,
      0x000000,
      0.7,
    );

    const panel = this.add.graphics();
    // panel.fillStyle(0x222222, 1);
    // panel.lineStyle(4, 0xffcc00, 1);
    // panel.fillRoundedRect(340, 110, 600, 500, 20);
    // panel.strokeRoundedRect(340, 110, 600, 500, 20);
    panel.fillStyle(0x0a0a0a, 1);
    panel.lineStyle(4, 0x996600, 1);

    //box
    panel.fillRoundedRect(x, y, boxWidth, boxHeight, 20);
    panel.strokeRoundedRect(x, y, boxWidth, boxHeight, 20);

    this.add
      .text(SCREEN.CENTER_X, MODAL.GUIDE.TITLE_Y, text.title, {
        fontSize: "32px",
        color: "#ffcc00",
        fontStyle: "bold",
        letterSpacing: 2,
      })
      .setOrigin(0.5);

    this.add
      .text(SCREEN.CENTER_X, MODAL.GUIDE.CONTENT_Y, content, {
        fontSize: "1.4rem",
        color: "#fff",
        align: "center",
        wordWrap: { width: boxWidth - 100 },
      })
      .setOrigin(0.5);

    const closeBtn = new ToonButton(this, {
      x: SCREEN.CENTER_X,
      y: MODAL.GUIDE.CLOSE_Y,
      text: text.close,
      width: 150,
      height: 70,
      color: 0x1a1a1a,
      hoverColor: 0x2a2a2a,
      textColor: "#fff",
    });

    closeBtn.on("pointerdown", () => {
      this.scene.resume("MenuScene");
      this.scene.stop();
    });
  }
}
