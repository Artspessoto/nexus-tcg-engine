import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { THEME_CONFIG } from "../constants/ThemeConfig";
import { Card } from "../objects/Card";
import { ToonButton } from "../objects/ToonButton";
import type { CardData, CardLocation } from "../types/CardTypes";
import type { GameSide } from "../types/GameTypes";

export class CardDetailScene extends Phaser.Scene {
  private cardData!: CardData;
  private owner!: GameSide;

  constructor() {
    super({ key: "CardDetailScene" });
  }

  init(data: { cardData: CardData; owner: GameSide; location: CardLocation }) {
    this.cardData = data.cardData;
    this.owner = data.owner;
  }

  create() {
    const { SCREEN, MODAL } = LAYOUT_CONFIG;
    const { COLORS, FONTS } = THEME_CONFIG;
    const { DETAIL } = MODAL;

    const startX = SCREEN.CENTER_X - DETAIL.WIDTH / 2;
    const startY = SCREEN.CENTER_Y - DETAIL.HEIGHT / 2;

    const typeColors: Record<string, number> = {
      SPELL: Phaser.Display.Color.HexStringToColor(COLORS.TYPE_SPELL).color,
      MONSTER: Phaser.Display.Color.HexStringToColor(COLORS.TYPE_MONSTER).color,
      TRAP: Phaser.Display.Color.HexStringToColor(COLORS.TYPE_TRAP).color,
    };
    const borderColor =
      typeColors[this.cardData.type] ||
      Phaser.Display.Color.HexStringToColor(COLORS.GOLD_GLOW).color;

    this.add
      .rectangle(
        SCREEN.CENTER_X,
        SCREEN.CENTER_Y,
        SCREEN.WIDTH,
        SCREEN.HEIGHT,
        COLORS.OVERLAY_BLACK,
        0.3,
      )
      .setInteractive();

    const panel = this.add.graphics();
    panel.fillStyle(COLORS.PANEL_BG, 0.95);
    panel.lineStyle(4, borderColor, 1);

    //box
    panel.fillRoundedRect(startX, startY, DETAIL.WIDTH, DETAIL.HEIGHT, 20);
    panel.strokeRoundedRect(startX, startY, DETAIL.WIDTH, DETAIL.HEIGHT, 20);

    const displayCard = new Card(
      this,
      startX + DETAIL.CARD_X_OFFSET,
      SCREEN.CENTER_Y,
      this.cardData,
      this.owner,
    );

    displayCard.disableInteractive();
    displayCard.input!.enabled = false;
    displayCard.setScale(1);

    const textStartX = startX + DETAIL.TEXT_X_OFFSET;
    const textWidth = DETAIL.WIDTH - DETAIL.TEXT_X_OFFSET - 40; // text width

    // Título
    this.add.text(
      textStartX,
      startY + DETAIL.TEXT_START_Y,
      this.cardData.nameKey.toUpperCase(),
      FONTS.STYLES.CARD_NAME,
    );

    this.add.text(textStartX, startY + 110, `[ ${this.cardData.type} ]`, {
      fontSize: "18px",
      color: `#${borderColor.toString(16)}`,
      fontStyle: "bold",
    });

    this.add.text(textStartX, startY + 160, this.cardData.descriptionKey, {
      fontSize: "18px",
      color: "#DDDDDD",
      wordWrap: { width: textWidth },
      lineSpacing: 8,
    });

    this.add.text(textStartX, startY + 350, '"Só o básico..."', {
      fontSize: "18px",
      fontStyle: "italic",
      color: "#888888",
      wordWrap: { width: textWidth },
    });

    new ToonButton(this, {
      x: startX + DETAIL.WIDTH - 30,
      y: startY + 30,
      text: "X",
      width: 50,
      height: 50,
      textColor: `#${borderColor.toString(16)}`,
      alpha: 0,
      fontSize: "20px",
    }).on("pointerdown", () => this.closeModal());
  }

  private closeModal() {
    this.scene.stop();
  }
}
