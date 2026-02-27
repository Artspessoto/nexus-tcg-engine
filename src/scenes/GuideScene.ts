import Phaser from "phaser";
import { ToonButton } from "../objects/ToonButton";
import { LanguageManager } from "../managers/LanguageManager";
import { TRANSLATIONS } from "../constants/Translations";
import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { THEME_CONFIG } from "../constants/ThemeConfig";

export class GuideScene extends Phaser.Scene {
  constructor() {
    super("GuideScene");
  }

  create() {
    const { SCREEN, MODAL } = LAYOUT_CONFIG;
    const { COLORS, FONTS, COMPONENTS } = THEME_CONFIG;

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
      COLORS.OVERLAY_BLACK,
      0.7,
    );

    const panel = this.add.graphics();
    // panel.fillStyle(0x222222, 1);
    // panel.lineStyle(4, 0xffcc00, 1);
    // panel.fillRoundedRect(340, 110, 600, 500, 20);
    // panel.strokeRoundedRect(340, 110, 600, 500, 20);
    panel.fillStyle(COLORS.PANEL_BG_DARK, 1);
    panel.lineStyle(4, COLORS.GOLD_DARK, 1);

    //box
    panel.fillRoundedRect(x, y, boxWidth, boxHeight, 20);
    panel.strokeRoundedRect(x, y, boxWidth, boxHeight, 20);

    this.add
      .text(
        SCREEN.CENTER_X,
        MODAL.GUIDE.TITLE_Y,
        text.title,
        FONTS.STYLES.MODAL_TITLE,
      )
      .setOrigin(0.5);

    this.add
      .text(SCREEN.CENTER_X, MODAL.GUIDE.CONTENT_Y, content, {
        ...FONTS.STYLES.MODAL_CONTENT,
        wordWrap: { width: boxWidth - 100 },
      })
      .setOrigin(0.5);

    const closeBtn = new ToonButton(this, {
      x: SCREEN.CENTER_X,
      y: MODAL.GUIDE.CLOSE_Y,
      text: text.close,
      width: 150,
      height: 70,
      ...COMPONENTS.BUTTONS.SECONDARY,
    });

    closeBtn.on("pointerdown", () => {
      this.scene.resume("MenuScene");
      this.scene.stop();
    });
  }
}
