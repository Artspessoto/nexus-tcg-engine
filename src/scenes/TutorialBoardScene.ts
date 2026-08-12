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
import { CardDetailsModal } from "../objects/CardDetailsModal";
import { ToonButton } from "../objects/ToonButton";
import type {
  GameSide,
  PlacementMode,
  TranslationStructure,
} from "../types/GameTypes";
import type { TutorialElementId, ZoneConfig } from "../types/TutorialType";
import { ActionMenuView, type MenuOption } from "../view/ActionMenuView";
import { DeckView } from "../view/DeckView";
import { PlayerStatsView } from "../view/PlayerStatsView";

export class TutorialBoardScene extends Phaser.Scene {
  private translationText!: TranslationStructure;
  private overlay!: Phaser.GameObjects.Rectangle;
  private uiElements: Map<
    TutorialElementId,
    Phaser.GameObjects.Container | Phaser.GameObjects.Graphics
  > = new Map();
  private dummyCards: Map<string, Card> = new Map();
  private currentFocusedCard: Card[] = [];

  private playerStatsView!: PlayerStatsView;
  private npcStatsView!: PlayerStatsView;
  private actionMenuView!: ActionMenuView;

  private stepHandlers: Record<string, () => void> = {
    step_8a: () => this.setupDragCard("TOON_KNIGHT"),
    step_11: () => this.setupFieldCardInteractions(),
    step_12: () => this.setupDragCard("FIRE_BALL"),
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

    this.playerStatsView = new PlayerStatsView({
      scene: this,
      side: "PLAYER",
      initialLP: GAME_STATE.BASE_LP,
      initialMana: GAME_STATE.BASE_MANA,
      playerName: "PLAYER",
    });

    this.npcStatsView = new PlayerStatsView({
      scene: this,
      side: "OPPONENT",
      initialLP: GAME_STATE.BASE_LP,
      initialMana: GAME_STATE.BASE_MANA,
      playerName: "CPU",
    });

    this.actionMenuView = new ActionMenuView(this);

    this.uiElements.set("LP_BAR_PLAYER", this.playerStatsView.lpContainer);
    this.uiElements.set("MANA_PLAYER", this.playerStatsView.manaContainer);

    this.uiElements.set("LP_BAR_OPPONENT", this.npcStatsView.lpContainer);
    this.uiElements.set("MANA_OPPONENT", this.npcStatsView.manaContainer);

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
        if (!data.targetId || !Array.isArray(data.targetId)) return;

        this.handlePhaseTextBtn(data.textKey);

        const handler = this.stepHandlers[data.textKey];

        if (handler) {
          handler();
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
        x: { from: card.x, to: targetX },
        y: { from: card.y, to: HAND.PLAYER.NORMAL_Y },
        angle: 0,
        scale: cardScale.PLAYER_HAND,
        duration: ANIMATIONS.DURATIONS.SLOW, // 0.5s
        // ease: "Power2",
        ease: ANIMATIONS.EASING.BOUNCE,
      });
    });
  }

  private hideDummyHand(excludeCard?: Card): void {
    const { HAND } = LAYOUT_CONFIG;
    const { ANIMATIONS } = THEME_CONFIG;

    this.dummyCards.forEach((card, key) => {
      if (key.includes("HAND_CARD") && card !== excludeCard) {
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

  private setupDragCard(cardKey: string): void {
    const cardName: TutorialElementId = `HAND_CARD_${cardKey}`;
    const card = this.dummyCards.get(cardName);
    if (!card) return;

    card.setInteractive({ draggable: true });
    this.input.setDraggable(card);

    //hover effect
    card.on("pointerover", () => this.handleDummyHover(card));
    card.on("pointerout", () => this.handleDummyOut(card));

    this.setupDragEvents(card, cardName);
  }

  private setupDragEvents(card: Card, cardName: TutorialElementId): void {
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
      this.input.setDraggable(card, false);

      card.setDepth(DEPTHS.UI_BASE);

      //TODO: find race condition problem (needed delayedCall uses for urgency)
      this.time.delayedCall(0, () => {
        this.reorganizeDummyHand();

        card.setInteractive({ draggable: true });
        this.input.setDraggable(card, true);
      });

      const targetZoneKey = card.getType().includes("MONSTER")
        ? "FIELD_MONSTER_ZONES"
        : "FIELD_SPELL_ZONES";

      this.handleCameraFocus({
        x: 200,
        y: 600,
        id: [cardName, targetZoneKey],
        disabled_hover: true,
      });

      card.on("pointerover", () => this.handleDummyHover(card));
      card.on("pointerout", () => this.handleDummyOut(card));

      this.scene
        .get("TutorialUIScene")
        .events.emit(TutorialEvent.FORCE_UI_STEP, { targetTextKey: "step_8a" });
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
        const expectedZoneType = card.getType().includes("MONSTER")
          ? "MONSTER"
          : "SPELL";
        if (targetZone.getData("type") === expectedZoneType) {
          this.showSelectMenu(card, targetZone, returnToHand);
        } else {
          returnToHand();
        }
      },
    );
  }

  private setupFieldCardInteractions(): void {
    const fieldCards: Card[] = [];

    this.uiElements.forEach((element, key) => {
      if (key.startsWith("FIELD_") && element instanceof Card) {
        fieldCards.push(element);
      }
    });

    if (fieldCards.length == 0) return;

    fieldCards.forEach((card) => {
      card.off("pointerdown");
      card.setInteractive({ useHandCursor: true });

      card.once("pointerdown", () => {
        const translationText =
          this.translationText.battle_scene.battle_buttons;

        const options: MenuOption[] = [
          {
            label: translationText.details,
            offsetX: -70,
            action: () => {
              this.scene
                .get("TutorialUIScene")
                .events.emit(TutorialEvent.FORCE_UI_STEP, {
                  targetTextKey: "step_11b",
                });
              const modal = new CardDetailsModal(this, {
                cardData: card.getCardData(),
                owner: "PLAYER",
                originalOwner: "PLAYER",
                location: "FIELD",
              });

              modal.once("destroy", () => {
                this.scene
                  .get("TutorialUIScene")
                  .events.emit(TutorialEvent.FORCE_UI_STEP, {
                    targetTextKey: "step_12",
                  });

                console.log("modal destroyed and calling step_12");
              });
            },
          },
        ];

        this.actionMenuView.renderMenu(card.x, card.y, options, () => {
          //if clicks outside listen the same method
          this.setupFieldCardInteractions();
        });

        this.scene
          .get("TutorialUIScene")
          .events.emit(TutorialEvent.FORCE_UI_STEP, {
            targetTextKey: "step_11a",
          });
      });
    });
  }

  private previewDummyPlacement(card: Card, targetX: number, targetY: number) {
    const { ANIMATIONS, COMPONENTS, DEPTHS } = THEME_CONFIG;

    this.tweens.killTweensOf(card);
    card.visualElements.setY(0);
    card.visualElements.setScale(1);

    //levitate card on field
    this.tweens.add({
      targets: card,
      x: targetX,
      y: targetY,
      scale: COMPONENTS.CARD.SCALES.PREVIEW,
      angle: 0,
      duration: ANIMATIONS.DURATIONS.PREVIEW,
      ease: ANIMATIONS.EASING.SMOOTH,
    });

    card.setDepth(DEPTHS.PREVIEW_CARD);
  }

  private showSelectMenu(
    card: Card,
    targetZone: Phaser.GameObjects.Zone,
    onCancel: () => void,
  ): void {
    this.previewDummyPlacement(card, targetZone.x, targetZone.y);

    //create manual overlay effect (because skipCameraSync prevents FOCUS_CAMERA event)
    this.tweens.add({
      targets: this.overlay,
      alpha: 1,
      duration: 300,
      ease: THEME_CONFIG.ANIMATIONS.EASING.SMOOTH,
    });

    this.hideDummyHand(card);

    const cardType = card.getType();
    const options: MenuOption[] = [];
    const translationText = this.translationText.battle_scene.battle_buttons;

    if (cardType.includes("MONSTER")) {
      //atk btn
      options.push({
        label: "",
        icon: "crossed-swords",
        width: 70,
        offsetX: -75,
        offsetY: -100,
        action: () => this.confirmTutorialPlacement(card, "ATK"),
      });
      //def btn
      options.push({
        label: "",
        icon: "round-shield",
        width: 70,
        offsetX: 75,
        offsetY: -100,
        action: () => this.confirmTutorialPlacement(card, "DEF"),
      });
    } else if (cardType === "SPELL") {
      options.push({
        label: translationText.active,
        width: 90,
        offsetX: -75,
        offsetY: -100,
        isLeft: true,
        action: () => this.confirmTutorialPlacement(card, "FACE_UP"),
      });
      options.push({
        label: translationText.set,
        width: 110,
        offsetX: 75,
        offsetY: -100,
        action: () => this.confirmTutorialPlacement(card, "SET"),
      });
    } else if (cardType === "TRAP") {
      options.push({
        label: translationText.set,
        width: 110,
        offsetX: 75,
        offsetY: -100,
        action: () => this.confirmTutorialPlacement(card, "SET"),
      });
    }

    this.actionMenuView.renderMenu(targetZone.x, targetZone.y, options, () => {
      this.actionMenuView.clearMenu();
      onCancel();
    });

    this.scene
      .get("TutorialUIScene")
      .events.emit(TutorialEvent.FORCE_UI_STEP, { targetTextKey: "step_9" });
  }

  private confirmTutorialPlacement(card: Card, mode: PlacementMode) {
    const { COMPONENTS, ANIMATIONS } = THEME_CONFIG;
    const { GAME_STATE } = LAYOUT_CONFIG;

    const isDefense = mode === "DEF";
    const isSet = mode === "SET";
    const cardType = card.getType();
    const cardId = card.getCardData().id;

    const finalAngle = isDefense ? 270 : 0;
    const finalScale = isDefense
      ? COMPONENTS.CARD.SCALES.FIELD_DEF
      : COMPONENTS.CARD.SCALES.FIELD_ATK;

    this.tweens.killTweensOf(card);
    card.setDepth(10);

    card.setFieldVisuals();

    if (isSet || (isDefense && cardType.includes("MONSTER"))) {
      card.setFaceDown();
    } else {
      card.setFaceUp();
    }

    // Slot animation movement
    this.tweens.add({
      targets: card,
      angle: finalAngle,
      scale: finalScale,
      duration: ANIMATIONS.DURATIONS.FIELD_PLAY,
      ease: ANIMATIONS.EASING.BOUNCE,
      onComplete: () => {
        // card impact animation effect
        this.cameras.main.shake(
          ANIMATIONS.SHAKES.LIGHT.duration,
          ANIMATIONS.SHAKES.LIGHT.intensity,
        );
        card.setDepth(10);
      },
    });

    //disable card interactions (drag and drop action)
    card.disableInteractive();
    card.off("dragstart");
    card.off("drag");
    card.off("dragend");
    card.off("drop");
    card.off("pointerover");
    card.off("pointerout");

    this.dummyCards.delete(`HAND_CARD_${cardId}`);
    this.uiElements.set(`FIELD_CARD_${cardId}`, card);

    this.scene
      .get("TutorialUIScene")
      .events.emit(TutorialEvent.FORCE_UI_STEP, { targetTextKey: "step_10" });
    this.playerStatsView.animateManaChange(
      GAME_STATE.BASE_MANA - card.getCardData().manaCost,
    );
  }

  private handleCameraFocus(targetData?: CameraFocusPayload): void {
    const { ANIMATIONS, DEPTHS } = THEME_CONFIG;
    const targets = targetData?.id || [];

    this.currentFocusedCard.forEach((card) => this.handleDummyOut(card));
    this.currentFocusedCard = [];

    const focusesHand =
      targets.includes("PLAYER_HAND") ||
      targets.some((id) => id.includes("HAND_CARD"));
    const focusesFieldOrPhase =
      targets.some((id) => id.includes("FIELD")) ||
      targets.includes("PHASE_BUTTON");

    if (focusesHand) {
      this.showDummyHand();
    } else if (focusesFieldOrPhase) {
      this.hideDummyHand();
    }

    //reset depth of all elements
    this.uiElements.forEach((container, key) => {
      container.setDepth(0);

      const isFieldZone = key.includes("FIELD") && !key.includes("FIELD_CARD");

      if (isFieldZone && !targets.includes(key)) {
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
    targets.forEach((id) => {
      if (id == "PLAYER_HAND") {
        this.dummyCards.forEach((card) => {
          card.setDepth(DEPTHS.UI_BASE);
        });
        return;
      }

      const element = this.uiElements.get(id);
      if (element) {
        element.setDepth(DEPTHS.UI_BASE);

        if (id.includes("FIELD") || id == "PHASE_BUTTON") {
          this.tweens.killTweensOf(element);
          this.tweens.add({
            targets: element,
            alpha: 1,
            duration: ANIMATIONS.DURATIONS.SLOW,
            ease: ANIMATIONS.EASING.SMOOTH,
          });
        }
      }

      //if element is card, apply hover effect
      const card = this.dummyCards.get(id);
      if (card) {
        if (!targetData?.disabled_hover) {
          this.handleDummyHover(card);
          this.currentFocusedCard.push(card);
        }
      }
    });

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

    this.currentFocusedCard.forEach((card) => this.handleDummyOut(card));
    this.currentFocusedCard = [];

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
