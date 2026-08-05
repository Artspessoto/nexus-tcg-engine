import { CARD_DATABASE } from "../constants/CardDatabase";
import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { THEME_CONFIG } from "../constants/ThemeConfig";
import { TRANSLATIONS } from "../constants/Translations";
import {
  TutorialEvent,
  type AdvanceDialogPayload,
  type CameraFocusPayload,
} from "../events/TutorialEvents";
import { LanguageManager } from "../managers/language/LanguageManager";
import { Card } from "../objects/Card";
import { ToonButton } from "../objects/ToonButton";
import type { GameSide, TranslationStructure } from "../types/GameTypes";
import type { TutorialElementId, ZoneConfig } from "../types/TutorialType";
import { DeckView } from "../view/DeckView";

export class TutorialBoardScene extends Phaser.Scene {
  private translationText!: TranslationStructure;
  private overlay!: Phaser.GameObjects.Rectangle;
  private uiElements: Map<
    TutorialElementId,
    Phaser.GameObjects.Container | Phaser.GameObjects.Graphics
  > = new Map();
  private dummyCards: Map<string, Card> = new Map();
  private currentFocusedCard: Card | null = null;
  private updateHandlers: Partial<
    Record<TutorialElementId, (textKey: string) => void>
  > = {
    PHASE_BUTTON: (textKey) => this.handlePhaseTextBtn(textKey),
    HAND_CARD_TOON_KNIGHT: () => this.setupDragCard(),
  };

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

    const lang = LanguageManager.getInstance().currentLang;
    this.translationText = TRANSLATIONS[lang];

    this.createDummyMana("PLAYER", GAME_STATE.BASE_MANA);
    this.createDummyMana("OPPONENT", GAME_STATE.BASE_MANA);

    this.createDummyLPBar("PLAYER", GAME_STATE.BASE_LP);
    this.createDummyLPBar("OPPONENT", GAME_STATE.BASE_LP);

    this.createDummyDeck("PLAYER");
    this.createDummyDeck("OPPONENT");

    this.createDummyHand();

    this.createDummyField();

    this.createDummyPhaseButton();

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

    this.events.on(
      TutorialEvent.ADVANCE_DIALOG,
      (data: AdvanceDialogPayload) => {
        if (!data.targetId) return;

        const handler = this.updateHandlers[data.targetId];

        if (handler) {
          handler(data.textKey);
        }
      },
    );
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

  public reorganizeDummyHand() {
    const { COMPONENTS, ANIMATIONS } = THEME_CONFIG;
    const { SCREEN, HAND } = LAYOUT_CONFIG;
    const spacing = HAND.SPACING; // cards gap between
    const centerX = SCREEN.CENTER_X; // center of the screen

    const tutorialCards = [
      "TOON_KNIGHT",
      "MAGE_APPRENTICE",
      "FIRE_BALL",
      "DARK_TRAP",
    ];

    const totalHandWidth = (tutorialCards.length - 1) * spacing; //460
    const startX = centerX - totalHandWidth / 2; //410

    tutorialCards.forEach((cardKey, index) => {
      const card = this.dummyCards.get(`HAND_CARD_${cardKey}`);
      if (!card) return;

      const targetX = startX + index * spacing;
      const cardScale = COMPONENTS.CARD.SCALES;

      this.tweens.add({
        targets: card,
        x: targetX,
        y: HAND.PLAYER.NORMAL_Y,
        angle: 0,
        scale: cardScale.PLAYER_HAND,
        duration: ANIMATIONS.DURATIONS.SLOW, // 0.5s
        // ease: "Power2",
        ease: ANIMATIONS.EASING.BOUNCE,
      });
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
    const { FIELD } = LAYOUT_CONFIG;
    const { COLORS } = THEME_CONFIG;

    const monsterZonesContainer = this.createZoneGroup({
      type: "MONSTER",
      positions: FIELD.PLAYER.MONSTER,
      color: COLORS.GOLD_GLOW,
      shrinkW: 10,
      shrinkH: 15,
      offsetX: 0.5,
      offsetY: 0,
    });

    const spellZonesContainer = this.createZoneGroup({
      type: "SPELL",
      positions: FIELD.PLAYER.SPELL,
      color: "#55aaff",
      shrinkW: 12,
      shrinkH: 15,
      offsetX: 1.5,
      offsetY: 5,
    });

    const graveyardContainer = this.createZoneGroup({
      type: "GRAVEYARD",
      positions: [FIELD.PLAYER.GRAVEYARD],
      color: 0x00ffff,
      shrinkW: 10,
      shrinkH: 15,
      offsetX: 0.5,
      offsetY: 0,
    });

    this.uiElements.set("FIELD_MONSTER_ZONES", monsterZonesContainer);
    this.uiElements.set("FIELD_SPELL_ZONES", spellZonesContainer);
    this.uiElements.set("FIELD_GRAVEYARD_ZONE", graveyardContainer);
  }

  private createZoneGroup(config: ZoneConfig): Phaser.GameObjects.Container {
    const { FIELD } = LAYOUT_CONFIG;
    const {
      type,
      positions,
      color,
      shrinkW,
      shrinkH,
      offsetX = 0,
      offsetY = 0,
    } = config;

    const container = this.add.container(0, 0).setDepth(0).setAlpha(0);
    const graphics = this.add.graphics();

    const lineColor =
      typeof color === "string"
        ? Phaser.Display.Color.HexStringToColor(color).color
        : color;

    graphics.lineStyle(4, lineColor, 1);
    container.add(graphics);

    const finalWidth = FIELD.ZONE_SIZE.W - shrinkW;
    const finalHeight = FIELD.ZONE_SIZE.H - shrinkH;

    positions.forEach((pos, index) => {
      //graveyard dont need zone
      if (type !== "GRAVEYARD") {
        const zone = this.add
          .zone(pos.x, pos.y, FIELD.ZONE_SIZE.W, FIELD.ZONE_SIZE.H)
          .setRectangleDropZone(FIELD.ZONE_SIZE.W, FIELD.ZONE_SIZE.H)
          .setData("type", type)
          .setData("index", index);

        container.add(zone);
      }

      graphics.strokeRoundedRect(
        pos.x - finalWidth / 2 + offsetX,
        pos.y - finalHeight / 2 + offsetY,
        finalWidth,
        finalHeight,
        6, // radius
      );
    });

    return container;
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

  private createDummyPhaseButton(): void {
    const { BATTLE } = LAYOUT_CONFIG;
    const { COMPONENTS } = THEME_CONFIG;

    const dummyPhaseBtn = new ToonButton(this, {
      x: BATTLE.PHASE_BUTTON.x,
      y: BATTLE.PHASE_BUTTON.y,
      text: "DRAW",
      fontSize: "18px",
      textColor: "#fff",
      color: COMPONENTS.BUTTONS.PHASE.color,
      hoverColor: COMPONENTS.BUTTONS.PHASE.color,
      width: BATTLE.PHASE_BUTTON.width,
      height: BATTLE.PHASE_BUTTON.height,
    });

    dummyPhaseBtn.updatePhase(
      `${this.translationText.battle_scene.turn_label} 1`,
      "DRAW",
      COMPONENTS.BUTTONS.PHASE.color,
    );

    dummyPhaseBtn.disableInteractive();

    this.uiElements.set("PHASE_BUTTON", dummyPhaseBtn);
  }

  private handlePhaseTextBtn(textKey: string): void {
    const dummyPhaseBtn = this.uiElements.get("PHASE_BUTTON") as ToonButton;
    if (!dummyPhaseBtn) return;

    const { COMPONENTS } = THEME_CONFIG;
    const turnLabel = `${this.translationText.battle_scene.turn_label} 1`;

    switch (textKey) {
      case "step_7":
      case "step_7a":
        dummyPhaseBtn.updatePhase(
          turnLabel,
          "DRAW",
          COMPONENTS.BUTTONS.PHASE.color,
        );
        break;
      case "step_7b":
      case "step_7c":
      case "step_8":
        dummyPhaseBtn.updatePhase(
          turnLabel,
          this.translationText.battle_scene.main_phase,
          COMPONENTS.BUTTONS.PHASE.color,
        );
        break;
      case "step_7d":
        dummyPhaseBtn.updatePhase(
          turnLabel,
          this.translationText.battle_scene.battle_buttons.to_battle,
          COMPONENTS.BUTTONS.PHASE.color,
        );
        break;
      case "step_7e":
        dummyPhaseBtn.updatePhase(
          turnLabel,
          this.translationText.battle_scene.battle_buttons.end_turn,
          COMPONENTS.BUTTONS.PHASE.color,
        );
    }
  }

  private setupDragCard(): void {
    const cardName = "HAND_CARD_TOON_KNIGHT";
    const card = this.dummyCards.get(cardName);
    if (!card) return;

    card.setInteractive({ draggable: true });
    this.input.setDraggable(card);

    //hover effect
    card.on("pointerover", () => this.handleDummyHover(card));
    card.on("pointerout", () => this.handleDummyOut(card));

    this.setupDragEvents(card);
  }

  private setupDragEvents(card: Card): void {
    const { ANIMATIONS, DEPTHS, COMPONENTS } = THEME_CONFIG;

    card.off("dragstart");
    card.off("drag");
    card.off("dragend");
    card.off("drop");

    card.on("dragstart", (_pointer: Phaser.Input.Pointer) => {
      //remove overlay
      this.handleCameraReset(300);

      const monsterZones = this.uiElements.get("FIELD_MONSTER_ZONES");
      if (monsterZones) {
        this.tweens.add({
          targets: monsterZones,
          alpha: 1,
          duration: 300,
        });
      }

      card.off("pointerover");
      card.off("pointerout");

      this.tweens.killTweensOf(card);
      this.tweens.killTweensOf(card.visualElements);
      card.visualElements.setY(0);

      this.tweens.add({
        targets: card,
        scale: COMPONENTS.CARD.SCALES.DEFAULT_HAND,
        duration: ANIMATIONS.DURATIONS.UI_POP,
        ease: ANIMATIONS.EASING.SMOOTH,
      });
      card.setDepth(DEPTHS.DRAGGING_CARD);
    });

    card.on(
      "drag",
      (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        card.visualElements.setY(0);
        card.visualElements.setScale(1);
        card.setPosition(dragX, dragY);
      },
    );

    const returnToHand = () => {
      card.setDepth(DEPTHS.UI_BASE);
      this.reorganizeDummyHand();

      this.handleCameraFocus({
        x: 200,
        y: 600,
        id: "HAND_CARD_TOON_KNIGHT",
        disabled_hover: true,
      });

      card.on("pointerover", () => this.handleDummyHover(card));
      card.on("pointerout", () => this.handleDummyOut(card));
    };

    card.on(
      "dragend",
      (
        _pointer: Phaser.Input.Pointer,
        _dragX: number,
        _dragY: number,
        dropped: boolean,
      ) => {
        if (!dropped) {
          //if drops outside of zone apply hover
          returnToHand();
        }
      },
    );

    card.on(
      "drop",
      (_pointer: Phaser.Input.Pointer, targetZone: Phaser.GameObjects.Zone) => {
        if (targetZone.getData("type") === "MONSTER") {
          card.x = targetZone.x;
          card.y = targetZone.y;

          card.visualElements.setY(0);
          card.visualElements.setScale(1);

          card.disableInteractive();

          card.off("dragstart");
          card.off("drag");
          card.off("dragend");
          card.off("drop");

          card.off("pointerover");
          card.off("pointerout");

          this.events.emit(TutorialEvent.ADVANCE_DIALOG, {
            targetId: "MANA_PLAYER",
            textKey: "step_3",
          });
        } else {
          returnToHand();
        }
      },
    );
  }

  private handleCameraFocus(targetData?: CameraFocusPayload): void {
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
        this.showDummyHand();
      } else {
        const element = this.uiElements.get(targetData.id);
        if (element) {
          element.setDepth(DEPTHS.UI_BASE);

          if (
            targetData.id.includes("FIELD") ||
            targetData.id == "PHASE_BUTTON"
          ) {
            this.tweens.killTweensOf(element);
            this.hideDummyHand();

            this.tweens.add({
              targets: element,
              alpha: 1,
              duration: ANIMATIONS.DURATIONS.SLOW,
              ease: ANIMATIONS.EASING.SMOOTH,
            });
          }
        } else {
          this.showDummyHand();
        }

        //if element is card, apply hover effect
        const card = this.dummyCards.get(targetData.id);
        if (card) {
          if (!targetData.disabled_hover) {
            this.handleDummyHover(card);
            this.currentFocusedCard = card;
          }
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
