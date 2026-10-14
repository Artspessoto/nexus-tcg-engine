import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { THEME_CONFIG } from "../constants/ThemeConfig";
import { TRANSLATIONS } from "../constants/Translations";
import { LanguageManager } from "../managers/language/LanguageManager";
import type { CardData } from "../types/CardTypes";
import { Card } from "./Card";

export interface CardGridPanelConfig {
  cards: (Card | CardData)[];
  width: number;
  height: number;
  cols: number;
  onCardSelect?: (cardData: CardData, cardInstance?: Card) => void;
}

export class CardGridPanel extends Phaser.GameObjects.Container {
  private cardDetailView!: Card;
  private detailNameText!: Phaser.GameObjects.Text;
  private badgesContainer!: Phaser.GameObjects.Container;
  private detailDescText!: Phaser.GameObjects.Text;
  private selectionHighlight!: Phaser.GameObjects.Graphics;
  private panelConfig!: CardGridPanelConfig;
  private cardScale: number = 0.28;
  private languageManager: LanguageManager = LanguageManager.getInstance();

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: CardGridPanelConfig,
  ) {
    super(scene, x, y);

    this.panelConfig = config;

    this.buildPanel(config);
    this.scene.add.existing(this);
  }

  public updateCards(newCards: CardData[]) {
    this.panelConfig.cards = newCards;

    this.removeAll(true);

    this.buildPanel(this.panelConfig);
  }

  private buildPanel(config: CardGridPanelConfig) {
    const { MODAL } = LAYOUT_CONFIG;
    const { COLORS, FONTS, DEPTHS } = THEME_CONFIG;

    const border = COLORS.GOLD_GLOW;
    const borderConvert = Phaser.Display.Color.HexStringToColor(border).color;

    //width of area where the cards will be place
    //take the total width of component and subtract the fixed on details panel
    const gridWidth = config.width - MODAL.LIST.DETAIL_WIDTH;

    //divide total space of grid / column numbers
    const cellWidth = gridWidth / config.cols;
    const cellHeight = MODAL.LIST.CELL_HEIGHT;

    const panel = this.scene.add.graphics();

    //panel (background and border)
    panel.fillStyle(COLORS.PANEL_BG, 1); //0.95
    panel.lineStyle(4, borderConvert, 1);

    //box
    panel.fillRoundedRect(0, 0, config.width, config.height, 20);
    panel.strokeRoundedRect(0, 0, config.width, config.height, 20);

    //vertical line divisor between the zones
    panel.lineBetween(gridWidth, 20, gridWidth, config.height - 20);

    this.badgesContainer = this.scene.add.container(0, 0);

    this.add([panel, this.badgesContainer]);

    this.selectionHighlight = this.scene.add.graphics();
    this.selectionHighlight.setDepth(DEPTHS.UI_BASE + 1);
    this.add(this.selectionHighlight);

    //util var to capture the first card of list
    //the detail view panel and set the initial highlight
    let firstCardItem: CardData | undefined;

    config.cards.forEach((item, i) => {
      const isCardInstance = item instanceof Card;
      const cardData = isCardInstance
        ? (item as Card).getCardData()
        : (item as CardData);
      const owner = isCardInstance ? (item as Card).owner : "PLAYER";
      const originalOwner = isCardInstance
        ? (item as Card).originalOwner
        : "PLAYER";

      if (i === 0) firstCardItem = cardData;

      //decides which column the card's set. Ex: i = 0 --> 0 / 4 = 0. remainder = 0 (column 0)
      const column = i % config.cols;

      //decides which row the card's set. Ex: i = 2 --> 2 / 4 = 0.5. Math.floor result -> 0 (row 0)
      const row = Math.floor(i / config.cols);

      //x controls the horizontal alignment
      //all cards in the same column have the same x center. Ex: all cards in column 0 starts on 312.5px
      const x = column * cellWidth + cellWidth / 2;

      //y controls the vertical alignment
      // all cards in the same row have the same y height. Ex: all cards in row 0 will be at Y = 160px.
      const y = row * cellHeight + 100; // +100 to margin top

      const cardItem = new Card(
        this.scene,
        x,
        y,
        cardData,
        owner,
        originalOwner,
      ).setScale(this.cardScale);

      cardItem.on("pointerdown", () => {
        this.updateDetailView(cardData);
        this.updateHighlight(cardItem.x, cardItem.y);
        if (config.onCardSelect) {
          config.onCardSelect(
            cardData,
            isCardInstance ? (item as Card) : undefined,
          );
        }
      });

      this.add(cardItem);
    });

    if (firstCardItem) {
      const detailCenterX = gridWidth + MODAL.LIST.DETAIL_WIDTH / 2;
      const textPaddingY = MODAL.LIST.TEXT_Y_START;
      const { name, description } = this.languageManager.getCardTranslation(
        firstCardItem.id,
      );

      this.cardDetailView = new Card(
        this.scene,
        detailCenterX,
        200,
        firstCardItem,
        "PLAYER",
        "PLAYER",
      ).setScale(0.75);

      this.detailNameText = this.scene.add
        .text(detailCenterX, textPaddingY, name, {
          ...FONTS.STYLES.CARD_NAME,
          wordWrap: { width: MODAL.LIST.DETAIL_WIDTH },
        })
        .setOrigin(0.5);

      this.detailDescText = this.scene.add
        .text(detailCenterX, textPaddingY + 60, description || "", {
          ...FONTS.STYLES.MODAL_CONTENT,
          fontSize: "14px",
          fontFamily: FONTS.FAMILY_DISPLAY,
          wordWrap: { width: MODAL.LIST.DETAIL_WIDTH - 40 },
        })
        .setOrigin(0.5, 0);

      this.add([this.cardDetailView, this.detailNameText, this.detailDescText]);

      this.renderTypeBadges(firstCardItem);

      //marks first card as 'select' by default
      this.updateHighlight(cellWidth / 2, 100);
    }
  }

  private updateDetailView(data: CardData) {
    const { name, description } = this.languageManager.getCardTranslation(
      data.id,
    );
    this.cardDetailView.updateData(data);

    this.detailNameText.setText(name);
    this.detailDescText.setText(description);

    this.renderTypeBadges(data);
  }

  private updateHighlight(x: number, y: number) {
    const { COLORS } = THEME_CONFIG;
    const border = COLORS.GOLD_GLOW;
    const borderConvert = Phaser.Display.Color.HexStringToColor(border).color;

    this.selectionHighlight.clear();

    this.selectionHighlight.lineStyle(4, borderConvert, 1);

    const w = 320 * this.cardScale; //w = 89,60px
    const h = 430 * this.cardScale; //h * card scale = 120,4px

    this.selectionHighlight.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    this.selectionHighlight.fillStyle(borderConvert, 0.2);
    this.selectionHighlight.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
  }

  private getTypeColor(type: string): string {
    const { COLORS } = THEME_CONFIG;
    const colorMap: Record<string, string> = {
      SPELL: COLORS.TYPE_SPELL,
      MONSTER: COLORS.TYPE_MONSTER,
      TRAP: COLORS.TYPE_TRAP,
    };
    return colorMap[type] || COLORS.GOLD_GLOW;
  }

  private renderTypeBadges(cardData: CardData) {
    const { MODAL } = LAYOUT_CONFIG;
    const { FONTS } = THEME_CONFIG;

    this.badgesContainer.removeAll(true);

    const gridWidth = this.panelConfig.width - MODAL.LIST.DETAIL_WIDTH; //x - 300
    const centerX = gridWidth + MODAL.LIST.DETAIL_WIDTH / 2; //x + 150
    const badgeY = MODAL.LIST.TEXT_Y_START + 30; //380 + 30

    const lang = this.languageManager.currentLang;
    const cardTypeTranslations = TRANSLATIONS[lang].battle_scene.card_types;

    const isEffect = cardData.type == "EFFECT_MONSTER";
    const primaryType = isEffect ? "MONSTER" : cardData.type;
    console.log(gridWidth, centerX, badgeY);

    const badges: { text: string; color: number }[] = [
      {
        text:
          cardTypeTranslations[
            primaryType as keyof typeof cardTypeTranslations
          ] || primaryType,
        color: Phaser.Display.Color.HexStringToColor(
          this.getTypeColor(primaryType),
        ).color,
      },
    ];

    if (isEffect) {
      badges.push({
        text: cardTypeTranslations.EFFECT,
        color: 0x9c27b0,
      });
    }

    const badgeHeight = 24;
    const paddingX = 14;
    const gap = 10;

    //create the texts to calc a total group large
    const badgeElements = badges.map((badge) => {
      const text = this.scene.add.text(0, 0, badge.text, {
        fontSize: "12px",
        color: "#FFFFFF",
        fontStyle: "bold",
        fontFamily: FONTS.FAMILY_DISPLAY,
      });
      return { text, color: badge.color };
    });

    const totalWidth =
      badgeElements.reduce((acc, el) => acc + el.text.width + paddingX * 2, 0) +
      (badgeElements.length - 1) * gap;

    let currentX = centerX - totalWidth / 2;

    badgeElements.forEach(({ text, color }) => {
      const chipWidth = text.width + paddingX * 2;
      const chipHeight = badgeHeight;
      const chipX = currentX;
      const chipY = badgeY - chipHeight / 2;

      const bg = this.scene.add.graphics();
      bg.fillStyle(0x242424, 0.95);
      bg.fillRoundedRect(chipX, chipY, chipWidth, chipHeight, 12);
      bg.lineStyle(2, color, 0.9);
      bg.strokeRoundedRect(chipX, chipY, chipWidth, chipHeight, 12);

      text.setPosition(chipX + paddingX, badgeY);
      text.setOrigin(0, 0.5);

      this.badgesContainer.add([bg, text]);

      currentX += chipWidth + gap;
    });
  }
}
