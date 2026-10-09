import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { THEME_CONFIG } from "../constants/ThemeConfig";
import { Card } from "./Card";
import { ToonButton } from "./ToonButton";
import type { CardData, CardLocation } from "../types/CardTypes";
import type { GameSide } from "../types/GameTypes";

interface CardDetailsData {
  cardData: CardData;
  owner: GameSide;
  originalOwner: GameSide;
  location: CardLocation;
}

export class CardDetailsModal extends Phaser.GameObjects.Container {
  private cardData!: CardData;
  private owner!: GameSide;
  private originalOwner!: GameSide;
  private typeBadgeBg!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, data: CardDetailsData) {
    super(scene, 0, 0);

    this.cardData = data.cardData;
    this.owner = data.owner;
    this.originalOwner = data.originalOwner;

    this.setDepth(THEME_CONFIG.DEPTHS.OVERLAY_BANNER || 3000);

    this.buildModal();

    scene.add.existing(this);
  }

  private buildModal() {
    const scene = this.scene;
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

    const overlay = this.scene.add
      .rectangle(
        SCREEN.CENTER_X,
        SCREEN.CENTER_Y,
        SCREEN.WIDTH,
        SCREEN.HEIGHT,
        COLORS.OVERLAY_BLACK,
        0.3,
      )
      .setInteractive();

    const panel = this.scene.add.graphics();
    this.typeBadgeBg = this.scene.add.graphics();
    panel.fillStyle(COLORS.PANEL_BG, 0.95);
    panel.lineStyle(4, borderColor, 1);

    //box
    panel.fillRoundedRect(startX, startY, DETAIL.WIDTH, DETAIL.HEIGHT, 20);
    panel.strokeRoundedRect(startX, startY, DETAIL.WIDTH, DETAIL.HEIGHT, 20);

    const displayCard = new Card(
      scene,
      startX + DETAIL.CARD_X_OFFSET,
      SCREEN.CENTER_Y,
      this.cardData,
      this.owner,
      this.originalOwner,
    );

    displayCard.disableInteractive();
    displayCard.input!.enabled = false;
    displayCard.setScale(1);

    const textStartX = startX + DETAIL.TEXT_X_OFFSET;
    const textWidth = DETAIL.WIDTH - DETAIL.TEXT_X_OFFSET - 40; // text width

    const titleText = this.scene.add.text(
      textStartX,
      startY + DETAIL.TEXT_START_Y,
      this.cardData.nameKey.toUpperCase(),
      FONTS.STYLES.CARD_NAME,
    );
    
    const badgeY = startY + DETAIL.TEXT_START_Y + 55;
    const paddingX = 14;
    const badgeHeight = 28;

    const typeText = this.scene.add
      .text(
        textStartX + paddingX,
        badgeY,
        this.formatTypeLabel(this.cardData.type),
        {
          fontSize: "14px",
          color: "#FFFFFF",
          fontStyle: "bold",
          fontFamily: FONTS.FAMILY_DISPLAY,
        },
      )
      .setOrigin(0, 0.5);

    const badgeWidth = typeText.width + paddingX * 2;
    const badgeX = textStartX;
    const badgeRectY = badgeY - badgeHeight / 2;

    this.typeBadgeBg.fillStyle(0x242424, 0.9);
    this.typeBadgeBg.fillRoundedRect(badgeX, badgeRectY, badgeWidth, badgeHeight, 12);

    this.typeBadgeBg.lineStyle(2, borderColor, 0.9);
    this.typeBadgeBg.strokeRoundedRect(badgeX, badgeRectY, badgeWidth, badgeHeight, 12);

    const descText = this.scene.add.text(
      textStartX,
      badgeY + 35,
      this.cardData.descriptionKey,
      {
        fontSize: "16px",
        fontFamily: FONTS.FAMILY_DISPLAY,
        color: "#DDDDDD",
        wordWrap: { width: textWidth },
        lineSpacing: 8,
      },
    );

    // this.scene.add.text(textStartX, startY + 350, '"Só o básico..."', {
    //   fontSize: "18px",
    //   fontStyle: "italic",
    //   color: "#888888",
    //   wordWrap: { width: textWidth },
    // });

    const closeBtn = new ToonButton(scene, {
      x: startX + DETAIL.WIDTH - 30,
      y: startY + 30,
      text: "X",
      width: 50,
      height: 50,
      textColor: `#${borderColor.toString(16)}`,
      alpha: 0,
      fontSize: "20px",
    }).on("pointerdown", () => this.closeModal());

    this.add([
      overlay,
      panel,
      this.typeBadgeBg,
      displayCard,
      titleText,
      typeText,
      descText,
      closeBtn,
    ]);
  }

  private closeModal() {
    const { DURATIONS, EASING } = THEME_CONFIG.ANIMATIONS;
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: DURATIONS.VERY_FAST,
      ease: EASING.SMOOTH,
      onComplete: () => {
        this.destroy();
      },
    });
  }

  private formatTypeLabel(type: string): string {
    //transform effect_monster into "effect monster" or remove underline
    return type.replace("_", " ");
  }
}
