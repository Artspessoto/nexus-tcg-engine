import { PLAYER_INITIAL_DECK } from "../constants/DeckConfig";
import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { THEME_CONFIG } from "../constants/ThemeConfig";
import { TRANSLATIONS } from "../constants/Translations";
import { GameState } from "../domain/GameState";
import type { IGameState } from "../interfaces/IGameState";
import { LanguageManager } from "../managers/language/LanguageManager";
import { CardGridPanel } from "../objects/CardGridPanel";
import { ToonButton } from "../objects/ToonButton";
import type { CardData } from "../types/CardTypes";
import type { Difficulty } from "../types/GameTypes";

export interface DeckPreviewConfig {
  playerName: string;
  difficulty: Difficulty;
}

export class DeckPreviewScene extends Phaser.Scene {
  private gameState!: IGameState;
  private playerName!: string;
  private difficulty!: string;

  private playerDeckIds!: string[];
  private playerDeckData!: CardData[];

  constructor() {
    super({ key: "DeckPreviewScene" });
  }

  init(config: DeckPreviewConfig) {
    this.playerName = config.playerName;
    this.difficulty = config.difficulty;
    this.gameState = new GameState();

    this.playerDeckIds = [...PLAYER_INITIAL_DECK];
    this.gameState.initializeDecks(this.playerDeckIds);

    this.playerDeckData = this.gameState.getDeckDataList("PLAYER");
  }

  create() {
    const lang = LanguageManager.getInstance().currentLang;
    const text = TRANSLATIONS[lang].name_scene;

    const { SCREEN } = LAYOUT_CONFIG;
    const { COLORS, FONTS, COMPONENTS } = THEME_CONFIG;

    this.cameras.main.fadeIn(500, 0, 0, 0);

    this.add
      .image(SCREEN.CENTER_X, SCREEN.CENTER_Y, "background")
      .setDisplaySize(SCREEN.WIDTH, SCREEN.HEIGHT + 180);

    this.add.rectangle(
      SCREEN.CENTER_X,
      SCREEN.CENTER_Y,
      SCREEN.WIDTH,
      SCREEN.HEIGHT,
      COLORS.OVERLAY_BLACK,
      0.5,
    );

    this.add
      .text(SCREEN.CENTER_X, 30, `${this.playerName} DECK`, {
        fontFamily: FONTS.FAMILY_DISPLAY,
        fontSize: "32px",
        color: COLORS.GOLD_GLOW,
      })
      .setOrigin(0.5);

    const panelWidth = 1120;
    const panelHeight = 580;

    const startX = (SCREEN.WIDTH - panelWidth) / 2;
    const startY = 60;

    new CardGridPanel(this, startX, startY, {
      cards: this.playerDeckData,
      width: panelWidth,
      height: panelHeight,
      cols: 6,
      // onCardSelect: (cardData) => {
      //     // (Opcional) Tocar um som quando o jogador clica na carta
      // }
    });

    const buttonsY = startY + panelHeight + 45;

    const readyBtn = new ToonButton(this, {
      x: SCREEN.CENTER_X + 150,
      y: buttonsY,
      text: "INICIAR DUELO",
      width: 220,
    });

    const backBtn = new ToonButton(this, {
      x: SCREEN.CENTER_X - 100,
      y: buttonsY,
      ...COMPONENTS.BUTTONS.SECONDARY,
      text: text.back,
      width: 220,
    });

    readyBtn.on("pointerdown", () => {
      this.scene.start("BattleScene", {
        playerName: this.playerName,
        difficulty: this.difficulty,
        playerDeckIds: this.playerDeckIds,
      });
    });

    backBtn.on("pointerdown", () => {
      this.scene.start("NameScene", {
        difficulty: this.difficulty,
      });
    });
  }
}
