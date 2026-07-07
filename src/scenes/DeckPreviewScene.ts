import { CARD_DATABASE } from "../constants/CardDatabase";
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
import type { DeckPreviewTranslations, Difficulty } from "../types/GameTypes";

export interface DeckPreviewConfig {
  playerName: string;
  difficulty: Difficulty;
}

export type FilterOption =
  | "ALL"
  | "MANA"
  | "ATK"
  | "DEF"
  | "TYPE_MONSTER"
  | "TYPE_EFFECT"
  | "TYPE_SPELL"
  | "TYPE_TRAP";

export const OrderByOption = ["MANA", "ATK", "DEF", "ALL"];

export interface FilterConfig {
  label: string;
  type: FilterOption;
}

export class DeckPreviewScene extends Phaser.Scene {
  private gameState!: IGameState;
  private playerName!: string;
  private difficulty!: string;

  private playerDeckIds!: string[];
  private playerDeckData!: CardData[];

  private currentFilter: FilterOption = "ALL";
  private currentSort: "ASC" | "DESC" = "DESC";

  private filterHanders: Record<FilterOption, (data: CardData[]) => CardData[]>;

  constructor() {
    super({ key: "DeckPreviewScene" });

    const sortAlpha = (data: CardData[]) =>
      data.sort((a, b) =>
        this.currentSort == "DESC"
          ? a.nameKey.localeCompare(b.nameKey)
          : b.nameKey.localeCompare(a.nameKey),
      );

    this.filterHanders = {
      ALL: (data) => sortAlpha(data),
      MANA: (data) =>
        data.sort((a, b) =>
          this.currentSort == "DESC"
            ? b.manaCost - a.manaCost
            : a.manaCost - b.manaCost,
        ),
      ATK: (data) =>
        data.sort((a, b) =>
          this.currentSort == "DESC"
            ? (b.atk || 0) - (a.atk || 0)
            : (a.atk || 0) - (b.atk || 0),
        ),
      DEF: (data) =>
        data.sort((a, b) =>
          this.currentSort == "DESC"
            ? (b.def || 0) - (a.def || 0)
            : (a.def || 0) - (b.def || 0),
        ),
      TYPE_MONSTER: (data) => data.filter((c) => c.type === "MONSTER"),
      TYPE_EFFECT: (data) => data.filter((c) => c.type === "EFFECT_MONSTER"),
      TYPE_SPELL: (data) => data.filter((c) => c.type === "SPELL"),
      TYPE_TRAP: (data) => data.filter((c) => c.type === "TRAP"),
    };
  }

  init(config: DeckPreviewConfig) {
    this.playerName = config.playerName;
    this.difficulty = config.difficulty;
    this.gameState = new GameState();

    this.playerDeckIds = [...PLAYER_INITIAL_DECK];
    this.gameState.initializeDecks(this.playerDeckIds);

    this.playerDeckData = this.getFilteredDeckDataList();
  }

  create() {
    const lang = LanguageManager.getInstance().currentLang;
    const { back } = TRANSLATIONS[lang].name_scene;
    const { start_duel, title, subtitle, cards } =
      TRANSLATIONS[lang].deck_preview;

    const { SCREEN } = LAYOUT_CONFIG;
    const { COLORS, FONTS, COMPONENTS } = THEME_CONFIG;

    const panelWidth = 1000;
    const panelHeight = 550;

    const startX = (SCREEN.WIDTH - panelWidth) / 2;
    const startY = 80;

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
      .text(SCREEN.CENTER_X, 25, title, {
        fontFamily: FONTS.FAMILY_DISPLAY,
        fontSize: "32px",
        color: COLORS.GOLD_GLOW,
      })
      .setOrigin(0.5);

    this.add
      .text(SCREEN.CENTER_X, 60, subtitle.replace("{name}", this.playerName), {
        fontFamily: FONTS.FAMILY_PRIMARY,
        fontSize: "16px",
        color: "#CCCCCC",
        fontStyle: "italic",
      })
      .setOrigin(0.5);

    this.add
      .text(startX, 25, `${this.gameState.getDeckCount("PLAYER")} ${cards}`, {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#FFFFFF",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    const deckPanel = new CardGridPanel(this, startX, startY, {
      cards: this.playerDeckData,
      width: panelWidth,
      height: panelHeight,
      cols: 5,
    });

    this.createFilterMenu(
      startX + panelWidth - 100,
      30,
      TRANSLATIONS[lang].deck_preview,
      deckPanel,
    );

    const buttonsY = startY + panelHeight + 45;

    const readyBtn = new ToonButton(this, {
      x: SCREEN.CENTER_X + 150,
      y: buttonsY,
      text: start_duel,
      width: 220,
    });

    const backBtn = new ToonButton(this, {
      x: SCREEN.CENTER_X - 100,
      y: buttonsY,
      ...COMPONENTS.BUTTONS.SECONDARY,
      text: back,
      width: 220,
    });

    readyBtn.on("pointerdown", () => {
      this.callNextScene();
    });

    backBtn.on("pointerdown", () => {
      this.scene.start("NameScene", {
        difficulty: this.difficulty,
      });
    });

    this.input.keyboard?.on("keydown-ENTER", () => {
      this.callNextScene();
    });
  }

  private callNextScene() {
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("BattleScene", {
        playerName: this.playerName,
        difficulty: this.difficulty,
        playerDeckIds: this.playerDeckIds,
      });
    });
  }

  public getFilteredDeckDataList(option: FilterOption = "ALL"): CardData[] {
    const deckIds = this.gameState.playerDeck;

    const cardDataArray = deckIds.map((id) => CARD_DATABASE[id]);

    const dataCopy: CardData[] = [...cardDataArray];

    const handler = this.filterHanders[option];

    return handler(dataCopy);
  }

  private createFilterMenu(
    x: number,
    y: number,
    translations: DeckPreviewTranslations,
    gridPanel: CardGridPanel,
  ) {
    const { COLORS, COMPONENTS, DEPTHS } = THEME_CONFIG;

    const filterBtn = new ToonButton(this, {
      x: x - 22.5,
      y: y,
      text: `☰ ${translations.labels.all}`,
      width: 135,
      height: 40,
      fontSize: "14px",
      ...COMPONENTS.BUTTONS.SECONDARY,
    });

    const sortToggleBtn = new ToonButton(this, {
      x: x + 70,
      y: y,
      text: "⬇", //start as "DESC"
      width: 40,
      height: 40,
      fontSize: "16px",
      ...COMPONENTS.BUTTONS.SECONDARY,
    });

    sortToggleBtn.on("pointerdown", () => {
      this.currentSort = this.currentSort == "DESC" ? "ASC" : "DESC";
      sortToggleBtn.setText(this.currentSort == "ASC" ? "⬆" : "⬇");

      const newCards = this.getFilteredDeckDataList(this.currentFilter);
      gridPanel.updateCards(newCards);
    });

    //menu container
    const dropDownMenu = this.add.container(x, y + 18); //position below button
    dropDownMenu.setDepth(DEPTHS.UI_BASE + 10);
    dropDownMenu.setVisible(false);

    //dropdown background
    const menuBg = this.add.graphics();
    menuBg.fillStyle(COLORS.PANEL_BG_DARK, 0.95);

    //background
    menuBg.fillRoundedRect(-90, 0, 180, 300, 6);
    dropDownMenu.add(menuBg);

    const filterOptions: FilterConfig[] = [
      { label: `${translations.labels.all}`, type: "ALL" },
      { label: `${translations.labels.mana}`, type: "MANA" },
      { label: "ATK", type: "ATK" },
      { label: "DEF", type: "DEF" },
      { label: `${translations.labels.monster}`, type: "TYPE_MONSTER" },
      { label: `${translations.labels.effect_monster}`, type: "TYPE_EFFECT" },
      { label: `${translations.labels.spells}`, type: "TYPE_SPELL" },
      { label: `${translations.labels.traps}`, type: "TYPE_TRAP" },
    ];

    filterOptions.forEach((option, i) => {
      const optionBtn = new ToonButton(this, {
        x: 0,
        y: 21 + i * 40,
        text: option.label,
        width: 176,
        height: 35,
        fontSize: "14px",
        ...COMPONENTS.BUTTONS.SECONDARY,
      });

      optionBtn.on("pointerdown", () => {
        filterBtn.setText(`☰ ${option.label}`);
        dropDownMenu.setVisible(false); //close menu after choice

        this.currentFilter = option.type;

        if (!OrderByOption.includes(this.currentFilter)) {
          sortToggleBtn.setVisible(false);
        } else {
          sortToggleBtn.setVisible(true);
        }

        const newCards = this.getFilteredDeckDataList(this.currentFilter);
        gridPanel.updateCards(newCards);
      });

      dropDownMenu.add(optionBtn);
    });

    filterBtn.on("pointerdown", () => {
      dropDownMenu.setVisible(!dropDownMenu.visible);
    });

    this.input.keyboard?.on("keydown-ESC", () => {
      if (dropDownMenu.visible) {
        dropDownMenu.setVisible(false);
        return;
      }
      this.scene.start("NameScene", {
        difficulty: this.difficulty,
      });
    });
  }
}
