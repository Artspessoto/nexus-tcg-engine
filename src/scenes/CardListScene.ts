import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { THEME_CONFIG } from "../constants/ThemeConfig";
import { TRANSLATIONS } from "../constants/Translations";
import { LanguageManager } from "../managers/LanguageManager";
import { Card } from "../objects/Card";
import { ToonButton } from "../objects/ToonButton";
import type { CardData } from "../types/CardTypes";
import type { TranslationStructure } from "../types/GameTypes";

export interface CardListConfig {
  cards: Card[];
  onSelect?: (card: Card) => void;
  isSelectionMode?: boolean;
}

export class CardListScene extends Phaser.Scene {
  private cardList: Card[] = [];
  private isSelectionMode: boolean = false;
  private onSelect?: (card: Card) => void;
  private translationText!: TranslationStructure;
  private cardDetailView!: Card;
  private selectedCard!: Card;
  private detailNameText!: Phaser.GameObjects.Text;
  private detailTypeText!: Phaser.GameObjects.Text;
  private detailDescText!: Phaser.GameObjects.Text;
  private selectionHighlight!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: "CardListScene" });
  }

  init(config: CardListConfig | Card[]) {
    if (Array.isArray(config)) {
      this.cardList = config;
      this.isSelectionMode = false;
    } else {
      this.cardList = config.cards;
      this.onSelect = config.onSelect;
      this.isSelectionMode = config.isSelectionMode || false;
    }
  }

  create() {
    const lang = LanguageManager.getInstance().currentLanguage;
    const currentTranslations = TRANSLATIONS[lang];
    this.translationText = currentTranslations;

    const { SCREEN, MODAL } = LAYOUT_CONFIG;
    const { COLORS, FONTS, DEPTHS } = THEME_CONFIG;
    const { LIST } = MODAL;

    const border = COLORS.GOLD_GLOW;
    const borderConvert = Phaser.Display.Color.HexStringToColor(border).color;

    const startX = (SCREEN.WIDTH - LIST.WIDTH) / 2; //240 margin left and right
    const startY = (SCREEN.HEIGHT - LIST.HEIGHT) / 2; //60 margin top and bottom

    const panel = this.add.graphics();

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

    //panel (background and border)
    panel.fillStyle(COLORS.PANEL_BG, 0.95);
    panel.lineStyle(4, borderConvert, 1);

    //box
    panel.fillRoundedRect(startX, startY, LIST.WIDTH, LIST.HEIGHT, 20);
    panel.strokeRoundedRect(startX, startY, LIST.WIDTH, LIST.HEIGHT, 20);

    //vertical line divisor between the zones
    const dividerX = startX + LIST.GRID_WIDTH;
    panel.lineBetween(
      dividerX,
      startY + 20,
      dividerX,
      startY + LIST.HEIGHT - 20,
    );

    const cols = LIST.COLS; // card columns qtd
    const cellWidth = LIST.GRID_WIDTH / cols; //125px (4 cols into 500px width)
    const cellHeight = LIST.CELL_HEIGHT; // 5 lines x 135 height (card scale -> card height 450h x 0.30 = 135px)

    this.selectionHighlight = this.add.graphics();
    this.selectionHighlight.setDepth(DEPTHS.UI_BASE + 1);

    //util var to mark the first card of list. cardList[0] set the graphics border into battle scene
    let firstCardItem: Card | undefined;

    this.cardList.forEach((card, i) => {
      //decides which column the card's set. Ex: i = 0 --> 0 / 4 = 0. remainder = 0 (column 0)
      const column = i % cols;

      //decides which row the card's set. Ex: i = 2 --> 2 / 4 = 0.5. Math.floor result -> 0 (row 0)
      const row = Math.floor(i / cols);

      //all cards in the same column have the same vertical align. Ex: all cards in column 0 starts on 312.5px
      const x = startX + column * cellWidth + cellWidth / 2;

      // all cards in the same row have the same horizontal alignment. Ex: all cards in row 0 will be at Y = 160px.
      const y = startY + row * cellHeight + 100; // +100 to margin top

      const cardItem = new Card(
        this,
        x,
        y,
        card.getCardData(),
        card.owner,
        card.originalOwner
      ).setScale(0.3);

      cardItem.setData("originalReference", card);

      if (i === 0) firstCardItem = cardItem;

      cardItem.on("pointerdown", () => {
        this.selectedCard = cardItem.getData("originalReference");
        this.updateDetailView(cardItem.getCardData());
        this.updateHighlight(cardItem.x, cardItem.y);
      });
    });

    if (firstCardItem) {
      this.updateHighlight(firstCardItem.x, firstCardItem.y);
    }

    const defaultCardView = this.cardList[0];
    this.selectedCard = defaultCardView;
    const detailCenterX = startX + LIST.GRID_WIDTH + LIST.DETAIL_WIDTH / 2;
    const textPaddingY = startY + LIST.TEXT_Y_START;

    const { nameKey, descriptionKey, type } = defaultCardView.getCardData();
    const initialColor = this.getTypeColor(type);

    this.cardDetailView = new Card(
      this,
      detailCenterX,
      startY + 200,
      defaultCardView.getCardData(),
      defaultCardView.owner,
      defaultCardView.originalOwner
    ).setScale(0.75);

    this.detailNameText = this.add
      .text(detailCenterX, textPaddingY, nameKey.toUpperCase(), {
        ...FONTS.STYLES.CARD_NAME,
        wordWrap: { width: LIST.DETAIL_WIDTH - 40 },
      })
      .setOrigin(0.5);

    this.detailTypeText = this.add
      .text(detailCenterX, textPaddingY + 30, `[ ${type} ]`, {
        fontSize: "16px",
        color: initialColor,
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0);

    this.detailDescText = this.add
      .text(detailCenterX, textPaddingY + 60, descriptionKey, {
        ...FONTS.STYLES.MODAL_CONTENT,
        fontSize: "14px",
        wordWrap: { width: LIST.DETAIL_WIDTH - 40 },
      })
      .setOrigin(0.5, 0);

    if (this.isSelectionMode) {
      const confirmBtn = new ToonButton(this, {
        x: detailCenterX,
        y: startY + LIST.HEIGHT - 60,
        text: this.translationText.battle_scene.revive,
        width: 180,
        height: 50,
      });

      confirmBtn.on("pointerdown", () => {
        if (this.selectedCard && this.onSelect) {
          this.onSelect(this.selectedCard);
          this.scene.stop();
        }
      });
    }

    new ToonButton(this, {
      x: startX + LIST.WIDTH - 30,
      y: startY + 30,
      text: "X",
      width: 50,
      height: 50,
      textColor: border,
      alpha: 0,
      fontSize: "20px",
    }).on("pointerdown", () => this.closeModal());
  }

  private closeModal() {
    this.scene.stop();
  }

  private updateDetailView(data: CardData) {
    this.cardDetailView.updateData(data);

    this.detailNameText.setText(data.nameKey.toUpperCase());
    this.detailDescText.setText(data.descriptionKey);

    this.detailTypeText.setText(`[ ${data.type} ]`);
    this.detailTypeText.setColor(this.getTypeColor(data.type));
  }

  private updateHighlight(x: number, y: number) {
    const { COLORS } = THEME_CONFIG;
    const border = COLORS.GOLD_GLOW;
    const borderConvert = Phaser.Display.Color.HexStringToColor(border).color;

    this.selectionHighlight.clear();

    this.selectionHighlight.lineStyle(4, borderConvert, 1);

    const w = 320 * 0.3; //w = 96px
    const h = 450 * 0.3; //h * card scale = 135px
    const offsetY = 5;

    this.selectionHighlight.strokeRoundedRect(
      x - w / 2,
      y - h / 2 + offsetY,
      w,
      h,
      10,
    );
    this.selectionHighlight.fillStyle(borderConvert, 0.2);
    this.selectionHighlight.fillRoundedRect(
      x - w / 2,
      y - h / 2 + offsetY,
      w,
      h,
      10,
    );
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
}
