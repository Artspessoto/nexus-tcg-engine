import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { THEME_CONFIG } from "../constants/ThemeConfig";
import { TRANSLATIONS } from "../constants/Translations";
import { LanguageManager } from "../managers/language/LanguageManager";
import { Card } from "../objects/Card";
import { CardGridPanel } from "../objects/CardGridPanel";
import { ToonButton } from "../objects/ToonButton";
import type { TranslationStructure } from "../types/GameTypes";

export interface GraveyardSceneConfig {
  cards: Card[];
  onSelect?: (card: Card) => void;
  isSelectionMode?: boolean;
}

export class GraveyardScene extends Phaser.Scene {
  private cardList: Card[] = [];
  private isSelectionMode: boolean = false;
  private onSelect?: (card: Card) => void;
  private translationText!: TranslationStructure;
  private selectedCard!: Card;

  constructor() {
    super({ key: "GraveyardScene" });
  }

  init(config: GraveyardSceneConfig | Card[]) {
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
    const { COLORS } = THEME_CONFIG;
    const { LIST } = MODAL;

    //black overlay to block outside clicks
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

    //modal position
    const startX = (SCREEN.WIDTH - MODAL.LIST.WIDTH) / 2;
    const startY = (SCREEN.HEIGHT - MODAL.LIST.HEIGHT) / 2;

    if (this.cardList.length > 0) this.selectedCard = this.cardList[0];

    new CardGridPanel(this, startX, startY, {
      cards: this.cardList,
      width: MODAL.LIST.WIDTH,
      height: MODAL.LIST.HEIGHT,
      cols: MODAL.LIST.COLS,
      onCardSelect: (_, cardInstance) => {
        if (cardInstance) {
          this.selectedCard = cardInstance;
        }
      },
    });

    const detailCenterX = startX + LIST.GRID_WIDTH + LIST.DETAIL_WIDTH / 2;

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
      textColor: COLORS.GOLD_GLOW,
      alpha: 0,
      fontSize: "20px",
    }).on("pointerdown", () => this.closeModal());
  }

  private closeModal() {
    this.scene.stop();
  }
}
