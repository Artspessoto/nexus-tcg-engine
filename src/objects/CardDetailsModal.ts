import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { THEME_CONFIG } from "../constants/ThemeConfig";
import { Card } from "./Card";
import { ToonButton } from "./ToonButton";
import type { CardData, CardLocation } from "../types/CardTypes";
import type { GameSide } from "../types/GameTypes";
import { LanguageManager } from "../managers/language/LanguageManager";
import { TRANSLATIONS } from "../constants/Translations";

interface CardDetailsData {
  cardData: CardData;
  owner: GameSide;
  originalOwner: GameSide;
  location: CardLocation;
  onClose?: () => void;
}

export class CardDetailsModal extends Phaser.GameObjects.Container {
  private cardData!: CardData;
  private owner!: GameSide;
  private originalOwner!: GameSide;
  private badgesContainer!: Phaser.GameObjects.Container;
  private onClose?: () => void;

  constructor(scene: Phaser.Scene, data: CardDetailsData) {
    super(scene, 0, 0);

    this.cardData = data.cardData;
    this.owner = data.owner;
    this.originalOwner = data.originalOwner;
    this.onClose = data.onClose;

    this.setDepth(THEME_CONFIG.DEPTHS.OVERLAY_BANNER || 3000);

    this.buildModal();

    scene.add.existing(this);
  }

  private buildModal() {
    const scene = this.scene;
    const { SCREEN, MODAL } = LAYOUT_CONFIG;
    const { COLORS, FONTS } = THEME_CONFIG;
    const { DETAIL } = MODAL;
    const { name, description } =
      LanguageManager.getInstance().getCardTranslation(this.cardData.id);

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
      name,
      FONTS.STYLES.CARD_NAME,
    );

    const badgeY = startY + DETAIL.TEXT_START_Y + 55;

    this.badgesContainer = this.scene.add.container(0, 0);
    this.renderBadges(textStartX, badgeY);

    const descText = this.scene.add.text(textStartX, badgeY + 35, description, {
      fontSize: "16px",
      fontFamily: FONTS.FAMILY_DISPLAY,
      color: "#DDDDDD",
      wordWrap: { width: textWidth },
      lineSpacing: 8,
    });

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
      this.badgesContainer,
      displayCard,
      titleText,
      descText,
      closeBtn,
    ]);
  }

  private renderBadges(startX: number, y: number) {
    const { FONTS, COLORS } = THEME_CONFIG;
    const lang = LanguageManager.getInstance().currentLang;
    const cardTypeTranslations = TRANSLATIONS[lang].battle_scene.card_types;

    const isEffect = this.cardData.type === "EFFECT_MONSTER";
    const primaryType = isEffect ? "MONSTER" : this.cardData.type;

    const typeColors: Record<string, string> = {
      SPELL: COLORS.TYPE_SPELL,
      MONSTER: COLORS.TYPE_MONSTER,
      TRAP: COLORS.TYPE_TRAP,
    };

    const primaryColorHex = typeColors[primaryType] || COLORS.GOLD_GLOW;
    const primaryColorNum =
      Phaser.Display.Color.HexStringToColor(primaryColorHex).color;

    const badges: { text: string; color: number }[] = [
      {
        text:
          cardTypeTranslations[
            primaryType as keyof typeof cardTypeTranslations
          ] || primaryType,
        color: primaryColorNum,
      },
    ];

    if (isEffect) {
      badges.push({
        text: cardTypeTranslations.EFFECT,
        color: 0x9c27b0,
      });
    }

    const badgeHeight = 26;
    const paddingX = 14;
    const gap = 10;
    let currentX = startX;

    badges.forEach(({ text, color }) => {
      const textObj = this.scene.add
        .text(currentX + paddingX, y, text, {
          fontSize: "13px",
          color: "#FFFFFF",
          fontStyle: "bold",
          fontFamily: FONTS.FAMILY_DISPLAY,
        })
        .setOrigin(0, 0.5);

      const chipWidth = textObj.width + paddingX * 2;
      const chipHeight = badgeHeight;
      const chipY = y - chipHeight / 2;

      const bg = this.scene.add.graphics();
      bg.fillStyle(0x242424, 0.95);
      bg.fillRoundedRect(currentX, chipY, chipWidth, chipHeight, 12);
      bg.lineStyle(2, color, 0.9);
      bg.strokeRoundedRect(currentX, chipY, chipWidth, chipHeight, 12);

      this.badgesContainer.add([bg, textObj]);

      currentX += chipWidth + gap;
    });
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
        this.onClose?.();
      },
    });
  }
}
