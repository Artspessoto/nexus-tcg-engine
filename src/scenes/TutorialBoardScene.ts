import { CARD_DATABASE } from "../constants/CardDatabase";
import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { THEME_CONFIG } from "../constants/ThemeConfig";
import {
  TutorialEvent,
  type CameraFocusPayload,
} from "../events/TutorialEvents";
import { Card } from "../objects/Card";
import type { GameSide } from "../types/GameTypes";
import { DeckView } from "../view/DeckView";

export class TutorialBoardScene extends Phaser.Scene {
  private overlay!: Phaser.GameObjects.Rectangle;
  private uiElements: Map<
    string,
    Phaser.GameObjects.Container | Phaser.GameObjects.Graphics
  > = new Map();
  private dummyCards: Map<string, Card> = new Map();
  private currentFocusedCard: Card | null = null;

  constructor() {
    super("TutorialBoardScene");
  }

  create() {
    const { SCREEN, GAME_STATE } = LAYOUT_CONFIG;
    const { DEPTHS, COLORS } = THEME_CONFIG;

    const bg = this.add.image(
      SCREEN.CENTER_X,
      SCREEN.CENTER_Y,
      "battle-scene-background",
    );
    bg.setDisplaySize(SCREEN.WIDTH, SCREEN.HEIGHT).setDepth(DEPTHS.BACKGROUND);

    this.createDummyMana("PLAYER", GAME_STATE.BASE_MANA);
    this.createDummyMana("OPPONENT", GAME_STATE.BASE_MANA);

    this.createDummyLPBar("PLAYER", GAME_STATE.BASE_LP);
    this.createDummyLPBar("OPPONENT", GAME_STATE.BASE_LP);

    this.createDummyDeck("PLAYER");
    this.createDummyDeck("OPPONENT");

    this.createDummyHand();

    this.createDummyField();

    this.overlay = this.add
      .rectangle(
        SCREEN.CENTER_X,
        SCREEN.CENTER_Y,
        SCREEN.WIDTH,
        SCREEN.HEIGHT,
        COLORS.OVERLAY_BLACK,
        0.7,
      )
      .setDepth(DEPTHS.UI_BASE - 1)
      .setAlpha(0); //behind the dummies and invisible

    this.events.on(TutorialEvent.FOCUS_CAMERA, (data: CameraFocusPayload) => {
      this.handleCameraFocus(data);
    });
    this.events.on(TutorialEvent.RESET_CAMERA, () => {
      this.handleCameraReset();
    });

    this.events.once("shutdown", () => {
      this.events.off(TutorialEvent.FOCUS_CAMERA, this.handleCameraFocus, this);
      this.events.off(TutorialEvent.RESET_CAMERA, this.handleCameraReset, this);
    });
  }

  private createDummyDeck(side: GameSide): void {
    const { DECK } = LAYOUT_CONFIG;
    const position = DECK[side];

    const dummyDeck = new DeckView(this, {
      x: position.x,
      y: position.y,
    });
    dummyDeck.createDeckVisual(20);

    dummyDeck.container.setDepth(0);
    this.uiElements.set(`${side}_DECK`, dummyDeck.container);
  }

  private createDummyMana(side: GameSide, amount: number): void {
    const { FONTS } = THEME_CONFIG;
    const position = LAYOUT_CONFIG.UI.MANA[side];

    const container = this.add.container(position.x, position.y).setDepth(0);

    const icon = this.add.image(0, 0, "battle_ui", "mana_icon").setScale(0.4);

    const text = this.add
      .text(0, 0, `${amount}`, FONTS.STYLES.MANA_DISPLAY)
      .setOrigin(0.5);

    container.add([icon, text]);

    this.uiElements.set(`MANA_${side}`, container);
  }

  private createDummyLPBar(side: GameSide, initialHP: number): void {
    const { UI } = LAYOUT_CONFIG;
    const { COLORS, FONTS } = THEME_CONFIG;
    const { HEIGHT, RADIUS, WIDTH, X, Y_OPPONENT, Y_PLAYER } = UI.LP_BAR;
    const isPlayer = side == "PLAYER";

    const yPos = isPlayer ? Y_PLAYER : Y_OPPONENT;
    const xPos = X;
    const playerName = isPlayer ? "PLAYER" : "NPC";

    const container = this.add.container(xPos, yPos).setDepth(0);

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.OVERLAY_BLACK, 0.5);
    bg.fillRoundedRect(4, 4, WIDTH, HEIGHT, RADIUS);

    bg.fillStyle(COLORS.STONE_DARK, 1);
    bg.fillRoundedRect(0, 0, WIDTH, HEIGHT, RADIUS);

    bg.lineStyle(4, COLORS.GOLD_METAL, 1);
    bg.strokeRoundedRect(0, 0, WIDTH, HEIGHT, RADIUS);

    bg.lineStyle(2, COLORS.OVERLAY_BLACK, 0.3);
    bg.strokeRoundedRect(3, 3, WIDTH - 6, HEIGHT - 6, RADIUS - 2);
    container.add(bg);

    const nameText = this.add
      .text(20, 8, playerName, {
        fontFamily: THEME_CONFIG.FONTS.FAMILY_DISPLAY,
        fontSize: "16px",
        color: "#EAEAEA",
      })
      .setOrigin(0.0);
    container.add(nameText);

    const labelLP = this.add
      .text(20, 45, "LP", {
        fontFamily: FONTS.FAMILY_DISPLAY,
        fontSize: "18px",
        color: COLORS.GOLD_GLOW,
      })
      .setOrigin(0, 0.5);
    container.add(labelLP);

    const textStyle = {
      fontFamily: FONTS.FAMILY_DISPLAY,
      fontSize: "36px",
      color: COLORS.GOLD_GLOW,
    };

    const hpText = this.add
      .text(55, 45, `${initialHP}`, textStyle)
      .setOrigin(0, 0.5)
      .setShadow(2, 2, "#000000", 4, true, false);

    container.add(hpText);

    if (isPlayer) {
      container.setY(yPos - 10);
    }

    this.uiElements.set(`LP_BAR_${side}`, container);
  }

  private createDummyHand(): void {
    const { SCREEN, HAND } = LAYOUT_CONFIG;
    const { COMPONENTS } = THEME_CONFIG;

    const tutorialCards = [
      "TOON_KNIGHT",
      "MAGE_APPRENTICE",
      "FIRE_BALL",
      "DARK_TRAP",
    ];

    const spacing = HAND.SPACING;
    const centerX = SCREEN.CENTER_X;

    const totalHandWidth = (tutorialCards.length - 1) * spacing; //460
    const startX = centerX - totalHandWidth / 2; //410

    tutorialCards.forEach((card, index) => {
      const cardData = CARD_DATABASE[card];
      const targetX = startX + index * spacing;

      const dummyCard = new Card(
        this,
        targetX,
        HAND.PLAYER.NORMAL_Y,
        cardData,
        "PLAYER",
        "PLAYER",
      );

      dummyCard.setScale(COMPONENTS.CARD.SCALES.PLAYER_HAND);
      dummyCard.setInteractive({ draggable: true });

      this.uiElements.set(`HAND_CARD_${card}`, dummyCard);
      this.dummyCards.set(`HAND_CARD_${card}`, dummyCard);
    });
  }

  private hideDummyHand(): void {
    const { HAND } = LAYOUT_CONFIG;
    const { ANIMATIONS } = THEME_CONFIG;

    this.dummyCards.forEach((card, key) => {
      if (key.includes("HAND_CARD")) {
        this.tweens.killTweensOf(card);
        this.tweens.add({
          targets: card,
          y: HAND.PLAYER.HIDDEN_Y,
          duration: ANIMATIONS.DURATIONS.SLOW,
          ease: ANIMATIONS.EASING.SMOOTH,
        });
      }
    });
  }

  private showDummyHand(): void {
    const { HAND } = LAYOUT_CONFIG;
    const { ANIMATIONS } = THEME_CONFIG;

    this.dummyCards.forEach((card, key) => {
      if (key.includes("HAND_CARD")) {
        this.tweens.killTweensOf(card);
        this.tweens.add({
          targets: card,
          y: HAND.PLAYER.NORMAL_Y,
          duration: ANIMATIONS.DURATIONS.SLOW,
          ease: ANIMATIONS.EASING.BOUNCE,
        });
      }
    });
  }

  private createDummyField(): void {
    const monsterZonesContainer = this.dummyMonsterField();
    const spellZonesContainer = this.dummySpellField();
    const graveyardGraphics = this.dummyGraveyardField();

    this.uiElements.set("FIELD_MONSTER_ZONES", monsterZonesContainer);
    this.uiElements.set("FIELD_SPELL_ZONES", spellZonesContainer);
    this.uiElements.set("FIELD_GRAVEYARD_ZONE", graveyardGraphics);
  }

  private dummyMonsterField(): Phaser.GameObjects.Container {
    const { FIELD } = LAYOUT_CONFIG;
    const { COLORS } = THEME_CONFIG;

    //rectangle config
    const shrinkW = 10;
    const shrinkH = 15;
    const finalWidth = FIELD.ZONE_SIZE.W - shrinkW;
    const finalHeight = FIELD.ZONE_SIZE.H - shrinkH;

    const visualOffsetX = 0.5;
    const visualOffsetY = 0;

    const monsterZonesContainer = this.add
      .container(0, 0)
      .setDepth(0)
      .setAlpha(0);

    const monsterGraphics = this.add.graphics();
    monsterGraphics.lineStyle(
      4,
      Phaser.Display.Color.HexStringToColor(COLORS.GOLD_GLOW).color,
      1,
    );
    monsterZonesContainer.add(monsterGraphics);

    FIELD.PLAYER.MONSTER.forEach((pos, i) => {
      const zone = this.add
        .zone(pos.x, pos.y, FIELD.ZONE_SIZE.W, FIELD.ZONE_SIZE.H)
        .setRectangleDropZone(FIELD.ZONE_SIZE.W, FIELD.ZONE_SIZE.H)
        .setData("type", "MONSTER")
        .setData("index", i);

      monsterZonesContainer.add(zone);

      monsterGraphics.strokeRoundedRect(
        pos.x - finalWidth / 2 + visualOffsetX,
        pos.y - finalHeight / 2 + visualOffsetY,
        finalWidth,
        finalHeight,
        6, //radius
      );
    });

    return monsterZonesContainer;
  }

  private dummyGraveyardField(): Phaser.GameObjects.Graphics {
    const { FIELD } = LAYOUT_CONFIG;

    const graveyardGraphics = this.add.graphics().setAlpha(0);
    graveyardGraphics.lineStyle(4, 0x00ffff, 1);

    //rectangle config
    const shrinkW = 10;
    const shrinkH = 15;
    const finalWidth = FIELD.ZONE_SIZE.W - shrinkW;
    const finalHeight = FIELD.ZONE_SIZE.H - shrinkH;

    const visualOffsetX = 0.5;
    const visualOffsetY = 0;

    const graveyardX = FIELD.PLAYER.GRAVEYARD.x;
    const graveyardY = FIELD.PLAYER.GRAVEYARD.y;

    graveyardGraphics.strokeRoundedRect(
      graveyardX - finalWidth / 2 + visualOffsetX,
      graveyardY - finalHeight / 2 + visualOffsetY,
      finalWidth,
      finalHeight,
      6,
    );

    return graveyardGraphics;
  }

  private dummySpellField(): Phaser.GameObjects.Container {
    const { FIELD } = LAYOUT_CONFIG;

    const finalWidth = FIELD.ZONE_SIZE.W - 10;
    const finalHeight = FIELD.ZONE_SIZE.H - 15;

    const spellZonesContainer = this.add
      .container(0, 0)
      .setDepth(0)
      .setAlpha(0);

    const spellGraphics = this.add.graphics();
    spellGraphics.lineStyle(
      4,
      Phaser.Display.Color.HexStringToColor("#55aaff").color,
      1,
    );
    spellZonesContainer.add(spellGraphics);

    //spell slot config (w x h)
    const spellShrinkW = 12;
    const spellShrinkH = 15;
    const spellFinalWidth = FIELD.ZONE_SIZE.W - spellShrinkW;
    const spellFinalHeight = FIELD.ZONE_SIZE.H - spellShrinkH;

    const spellOffsetX = 1.5;
    const spellOffsetY = 5;

    FIELD.PLAYER.SPELL.forEach((pos, i) => {
      const zone = this.add
        .zone(pos.x, pos.y, FIELD.ZONE_SIZE.W, FIELD.ZONE_SIZE.H)
        .setRectangleDropZone(FIELD.ZONE_SIZE.W, FIELD.ZONE_SIZE.H)
        .setData("type", "SPELL")
        .setData("index", i);

      spellZonesContainer.add(zone);

      spellGraphics.strokeRoundedRect(
        pos.x - finalWidth / 2 + spellOffsetX,
        pos.y - finalHeight / 2 + spellOffsetY,
        spellFinalWidth,
        spellFinalHeight,
        6,
      );
    });

    return spellZonesContainer;
  }

  private handleDummyHover(dummyCard: Card): void {
    const { COMPONENTS, ANIMATIONS, DEPTHS } = THEME_CONFIG;

    this.tweens.add({
      targets: dummyCard.visualElements,
      y: COMPONENTS.CARD.OFFSETS.HOVER_Y,
      scale: COMPONENTS.CARD.SCALES.ZOOM,
      duration: ANIMATIONS.DURATIONS.PREVIEW,
      ease: ANIMATIONS.EASING.BOUNCE,
    });
    dummyCard.setDepth(DEPTHS.UI_BASE + 1);
  }

  private handleDummyOut(dummyCard: Card): void {
    const { ANIMATIONS, DEPTHS } = THEME_CONFIG;

    this.tweens.add({
      targets: dummyCard.visualElements,
      y: 0,
      scale: 1,
      duration: ANIMATIONS.DURATIONS.PREVIEW,
      ease: ANIMATIONS.EASING.SMOOTH,
    });

    dummyCard.setDepth(DEPTHS.UI_BASE);
  }

  private handleCameraFocus(targetData?: {
    id?: string;
    x: number;
    y: number;
  }): void {
    const { ANIMATIONS, DEPTHS } = THEME_CONFIG;

    if (this.currentFocusedCard) {
      this.handleDummyOut(this.currentFocusedCard);
      this.currentFocusedCard = null;
    }

    //reset depth of all elements
    this.uiElements.forEach((container, key) => {
      container.setDepth(0);

      if (key.includes("FIELD") && key !== targetData?.id) {
        this.tweens.killTweensOf(container);
        this.tweens.add({
          targets: container,
          alpha: 0,
          duration: ANIMATIONS.DURATIONS.SLOW,
          ease: ANIMATIONS.EASING.SMOOTH,
        });
      }
    });

    //turns element front of the overlay
    if (targetData && targetData.id) {
      if (targetData.id == "PLAYER_HAND") {
        this.dummyCards.forEach((card) => {
          card.setDepth(DEPTHS.UI_BASE);
        });
      } else {
        const element = this.uiElements.get(targetData.id);
        if (element) {
          element.setDepth(DEPTHS.UI_BASE);

          if (targetData.id.includes("FIELD")) {
            this.tweens.killTweensOf(element);
            this.hideDummyHand();

            this.tweens.add({
              targets: element,
              alpha: 1,
              duration: ANIMATIONS.DURATIONS.SLOW,
              ease: ANIMATIONS.EASING.SMOOTH,
            });
          }
        }

        //if element is card, apply hover effect
        const card = this.dummyCards.get(targetData.id);
        if (card) {
          this.handleDummyHover(card);
          this.currentFocusedCard = card;
        }
      }
    }

    //show overlay to focus object
    this.tweens.add({
      targets: this.overlay,
      alpha: 1,
      duration: 1000,
      ease: ANIMATIONS.EASING.SMOOTH,
    });
  }

  private handleCameraReset(duration: number = 1000): void {
    const { ANIMATIONS } = THEME_CONFIG;

    if (this.currentFocusedCard) {
      this.handleDummyOut(this.currentFocusedCard);
      this.currentFocusedCard = null;
    }

    //return all elements behind overlay
    this.uiElements.forEach((container, key) => {
      container.setDepth(0);

      if (key.includes("FIELD")) {
        this.tweens.killTweensOf(container);
        this.showDummyHand();

        this.tweens.add({
          targets: container,
          alpha: 0,
          duration: ANIMATIONS.DURATIONS.SLOW,
          ease: ANIMATIONS.EASING.SMOOTH,
        });
      }
    });

    this.tweens.add({
      targets: this.overlay,
      alpha: 0,
      duration,
      ease: ANIMATIONS.EASING.SMOOTH,
    });
  }
}
