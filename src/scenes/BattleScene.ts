import { TRANSLATIONS } from "../constants/Translations";
import { GameState } from "../domain/GameState";
import { HandManager } from "../managers/HandManager";
import { PhaseManager } from "../managers/PhaseManager";
import { Card } from "../objects/Card";
import { ToonButton } from "../objects/ToonButton";
import type {
  BattleTranslations,
  Difficulty,
  EffectInstructions,
  GamePhase,
  GameSide,
  PlacementMode,
  Slot,
} from "../types/GameTypes";
import { LanguageManager } from "../managers/LanguageManager";
import { FieldManager } from "../managers/FieldManager";
import { InputManager } from "../managers/InputManager";
import { DeckManager } from "../managers/DeckManager";
import { UIManager } from "../managers/UIManager";
import { CombatManager } from "../managers/CombatManager";
import { EffectManager } from "../managers/EffectManager";
import type { IBattleContext } from "../interfaces/IBattleContext";
import type { ICombatManager } from "../interfaces/ICombatManager";
import type { IDeckManager } from "../interfaces/IDeckManager";
import type { IEffectManager } from "../interfaces/IEffectManager";
import type { IFieldManager } from "../interfaces/IFieldManager";
import type { IHandManager } from "../interfaces/IHandManager";
import type { IInputManager } from "../interfaces/IInputManager";
import type { IPhaseManager } from "../interfaces/IPhaseManager";
import type { IUIManager } from "../interfaces/IUIManager";
import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { THEME_CONFIG } from "../constants/ThemeConfig";
import { EventBus } from "../events/EventBus";
import { GameEvent, type TurnStartedPayload } from "../events/GameEvents";
import type { IAIManager } from "../interfaces/IAIManager";
import { AIManager } from "../managers/ai/AIManager";
import { Logger } from "../utils/Logger";
import { PLAYER_INITIAL_DECK } from "../constants/DeckConfig";
import { DeckGenerator } from "../utils/DeckGenerator";
import type { IGameState } from "../interfaces/IGameState";

export class BattleScene extends Phaser.Scene implements IBattleContext {
  public engine = this;
  public gameState!: IGameState;
  public translationText!: BattleTranslations;
  public phaseManager!: IPhaseManager;
  public playerHand!: IHandManager;
  public opponentHand!: IHandManager;
  public field!: IFieldManager;
  public controls!: IInputManager;
  public playerDeck!: IDeckManager;
  public opponentDeck!: IDeckManager;
  public playerUI!: IUIManager;
  public opponentUI!: IUIManager;
  public combat!: ICombatManager;
  public effects!: IEffectManager;
  public npcAction!: IAIManager;

  public phaseButton!: ToonButton;
  private isChangingPhase: boolean = false;
  public selectedCard: Card | null = null;
  private overlayLayer!: Phaser.GameObjects.Container;
  private playerDisplayName!: string;
  private gameDifficulty: Difficulty = "EASY";

  constructor() {
    super("BattleScene");
  }

  init(data: { playerName: string; difficulty: Difficulty }) {
    this.playerDisplayName = data.playerName || "PLAYER 1";
    this.gameDifficulty = data.difficulty;

    this.gameState = new GameState();
    this.phaseManager = new PhaseManager(this);
    this.field = new FieldManager(this);
    this.controls = new InputManager(this);
    this.combat = new CombatManager(this);
    this.effects = new EffectManager(this);

    this.playerUI = new UIManager(this, "PLAYER");
    this.opponentUI = new UIManager(this, "OPPONENT");

    this.playerHand = new HandManager(this, "PLAYER");
    this.opponentHand = new HandManager(this, "OPPONENT");

    this.playerDeck = new DeckManager(this, "PLAYER");
    this.opponentDeck = new DeckManager(this, "OPPONENT");

    const playerDeckIds = Phaser.Utils.Array.Shuffle([...PLAYER_INITIAL_DECK]);
    const NPCDeckIds = DeckGenerator.generateNPCDeck(this.gameDifficulty);

    this.gameState.setPlayerName(this.playerDisplayName);
    this.gameState.initializeDecks(playerDeckIds, NPCDeckIds);
  }

  preload() {
    this.load.pack("battle_pack", "assets/assets-pack.json", "battle_assets");
  }

  create() {
    const { SCREEN, BATTLE } = LAYOUT_CONFIG;
    const { DEPTHS, COMPONENTS } = THEME_CONFIG;

    const lang = LanguageManager.getInstance().currentLanguage;
    const currentTranslations = TRANSLATIONS[lang];
    this.translationText = TRANSLATIONS[lang].battle_scene;
    this.npcAction = new AIManager(this, this.gameDifficulty);

    this.events.once("shutdown", () => {
      Logger.debug("SYSTEM", "Clean battle scene");
      EventBus.removeAllListeners();
    });

    const bg = this.add.image(
      SCREEN.CENTER_X,
      SCREEN.CENTER_Y,
      "battle-scene-background",
    );
    bg.setDisplaySize(SCREEN.WIDTH, SCREEN.HEIGHT).setDepth(DEPTHS.BACKGROUND);

    //global stage: temp container ensures activated cards always render on top
    this.overlayLayer = this.add
      .container(0, 0)
      .setDepth(DEPTHS.OVERLAY_ACTIVATION);

    this.playerUI.setTranslations(currentTranslations);
    this.opponentUI.setTranslations(currentTranslations);

    this.playerUI.setupUI();
    this.playerUI.setupLifePoints();
    this.opponentUI.setupUI();
    this.opponentUI.setupLifePoints();

    this.playerDeck.createDeckVisual();
    this.opponentDeck.createDeckVisual();

    this.field.setupFieldZones();

    // this.phaseTextBg = this.add.rectangle(640, 360, 500, 40, 0x000000, 0.8);
    this.phaseButton = new ToonButton(this, {
      x: BATTLE.PHASE_BUTTON.x,
      y: BATTLE.PHASE_BUTTON.y,
      text: "",
      fontSize: "18px",
      textColor: "#fff",
      color: COMPONENTS.BUTTONS.PHASE.color,
      hoverColor: COMPONENTS.BUTTONS.PHASE.color,
      width: BATTLE.PHASE_BUTTON.width,
      height: BATTLE.PHASE_BUTTON.height,
    });
    this.phaseButton.setVisible(false).setDepth(DEPTHS.PHASE_BUTTON - 1);

    this.phaseButton.on("pointerdown", () => {
      if (this.controls.isSelectionLocked()) return;

      this.handleNextPhase();
    });

    this.controls.setupGlobalInputs();

    this.setupEventListeners();

    this.startInitialDraw();
  }

  public get currentPhase(): GamePhase {
    return this.gameState.currentPhase;
  }

  private setupEventListeners(): void {
    EventBus.on(GameEvent.TURN_STARTED, (data) => {
      this.handleAITurnBasedAction(data);
    });

    EventBus.on(GameEvent.FIELD_CARD_CLICKED, (data) => {
      this.handleInteractionOrchestrator(data.card);
    });
  }

  private getManagerBySide<T>(
    side: GameSide,
    playerManager: T,
    opponentManager: T,
  ): T {
    return side === "PLAYER" ? playerManager : opponentManager;
  }

  //based on the target
  public getUI(side: GameSide): IUIManager {
    return this.getManagerBySide(side, this.playerUI, this.opponentUI);
  }

  public getHand(side: GameSide): IHandManager {
    return this.getManagerBySide(side, this.playerHand, this.opponentHand);
  }

  public getDeck(side: GameSide): IDeckManager {
    return this.getManagerBySide(side, this.playerDeck, this.opponentDeck);
  }

  //based on the current player
  public get currentDeck(): IDeckManager {
    return this.getDeck(this.gameState.activePlayer);
  }

  public get currentHand(): IHandManager {
    return this.getHand(this.gameState.activePlayer);
  }

  public get currentUI(): IUIManager {
    return this.getUI(this.gameState.activePlayer);
  }

  private startInitialDraw() {
    let delay = 0;
    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(delay, () => {
        const playerData = this.gameState.setDeckState("PLAYER");
        if (playerData) {
          this.playerHand.drawCard(this.playerDeck.position, playerData);
        }

        const opponentData = this.gameState.setDeckState("OPPONENT");
        if (opponentData) {
          this.opponentHand.drawCard(this.opponentDeck.position, opponentData);
        }
      });
      delay += 200;
    }
    this.time.delayedCall(delay, () => this.setPhase("MAIN"));
  }

  private handleAITurnBasedAction(data: TurnStartedPayload) {
    const isFirstTurn = data.turnCount == 1;
    const side = data.side;
    const drawnCardData = this.gameState.setDeckState("OPPONENT");

    if (!isFirstTurn) {
      const manaGain = 2;

      EventBus.emit(GameEvent.MANA_CHANGED, {
        side: this.gameState.activePlayer,
        amount: manaGain,
      });
    }

    if (side == "OPPONENT") {
      if (drawnCardData) {
        this.getHand(side).drawCard(
          this.getDeck("OPPONENT").position,
          drawnCardData,
        );
      } else {
        //deck out
        Logger.warn("SYSTEM", "Deck out");
      }

      this.time.delayedCall(1000, () => {
        this.npcAction.executeTurn();
      });
    }
  }

  public handlePlayerCard() {
    if (this.currentPhase == "DRAW" && this.gameState.currentTurn !== 1) {
      const activeSide = this.gameState.activePlayer;

      const cardData = this.gameState.setDeckState(activeSide);

      if (cardData) {
        this.setPhase("MAIN");

        this.currentHand.drawCard(this.currentDeck.position, cardData);
      } else {
        //deck out
        Logger.debug("SYSTEM", "Deck out");
      }
    }
  }

  public setPhase(newPhase: GamePhase) {
    this.gameState.setPhase(newPhase);

    if (newPhase === "CHANGE_TURN") {
      this.gameState.advanceTurnCount();
    }

    EventBus.emit(GameEvent.PHASE_CHANGED, {
      newPhase,
      activePlayer: this.gameState.activePlayer,
    });

    if (newPhase === "DRAW") {
      EventBus.emit(GameEvent.TURN_STARTED, {
        side: this.gameState.activePlayer,
        turnCount: this.gameState.currentTurn,
      });
    }
  }

  public finalizeTurnTransition() {
    this.gameState.nextTurn(); // change to oponent and reset to draw phase
    this.setPhase("DRAW");
  }

  private handleNextPhase() {
    if (this.isChangingPhase || this.combat.isAnimating) return;

    this.isChangingPhase = true;
    this.time.delayedCall(500, () => {
      this.isChangingPhase = false;
    });

    const currentTurn = this.gameState.currentTurn;
    if (this.currentPhase === "MAIN") {
      if (currentTurn == 1) {
        this.setPhase("CHANGE_TURN");
      } else {
        this.setPhase("BATTLE");
      }
    } else if (this.currentPhase === "BATTLE") {
      this.setPhase("CHANGE_TURN");
    }
  }

  public handleCardDrop(targetZone: Phaser.GameObjects.Zone, card: Card) {
    const result = this.field.validatePlay(card, targetZone);
    const slot = result.slot!;
    const activeSide = this.gameState.activePlayer;
    const zoneType: "MONSTER" | "SPELL" = targetZone.getData("type");

    if (!result.valid) {
      //mana or slot invalid
      if (result.reason == "MANA") {
        EventBus.emit(GameEvent.INSUFFICIENT_MANA, { side: activeSide });
      } else if (result.reason == "SLOT") {
        EventBus.emit(GameEvent.ZONE_OCCUPIED, { side: activeSide });
      }
      this.currentHand.reorganizeHand();
      return;
    }

    const removedSuccessfully = this.currentHand.removeCard(card);

    if (!removedSuccessfully) {
      this.currentHand.reorganizeHand();
      return;
    }

    this.gameState.setDragging(false);
    this.selectedCard = card;

    this.currentHand.hideHand();

    this.field.previewPlacement(card, slot.x, slot.y);
    this.currentUI.showSelectionMenu(
      slot.x,
      slot.y,
      card,
      (mode: PlacementMode) => {
        this.selectedCard = null; //apply null to drop card
        this.executePlay(card, activeSide, zoneType, slot, mode);

        if (mode == "FACE_UP") {
          this.cardActivation(card, activeSide);
        }
      },
      () => this.cancelPlacement(),
    );
  }

  public cancelPlacement() {
    this.currentUI.clearSelectionMenu();
    this.currentHand.showHand();

    if (!this.selectedCard) return;
    const card = this.selectedCard;

    const isRevivingTarget = this.effects.isSelectingTarget;

    this.tweens.killTweensOf(card);

    if (isRevivingTarget) {
      this.field.moveToGraveyard(card);
      this.effects.cancelTargeting();
    } else {
      //return card to hand
      this.currentHand.addCardBack(this.selectedCard);
    }

    this.selectedCard.setInteractive();
    this.selectedCard.setDepth(100);

    this.selectedCard = null;
  }

  public executePlay(
    card: Card,
    side: GameSide,
    type: "MONSTER" | "SPELL",
    slot: Slot,
    mode: PlacementMode,
  ) {
    const hand = side == "PLAYER" ? this.playerHand : this.opponentHand;
    const { manaCost } = card.getCardData();

    EventBus.emit(GameEvent.MANA_CHANGED, {
      side: card.owner,
      amount: -manaCost,
    });

    if (hand.isCardInHand(card)) {
      hand.removeCard(card);
    }

    this.field.occupySlot(side, type, slot.index, card);
    this.field.playCardToZone(card, slot.x, slot.y, mode);

    Logger.debug("SYSTEM", `Card ${card.getCardData().nameKey} is set`);
  }

  private handleInteractionOrchestrator(card: Card) {
    const { x, y } = card;

    // effect priority
    if (this.effects.isSelectingTarget) {
      this.effects.handleGlobalClick(card);
      return;
    }

    // trigger response
    if (this.effects.isSelectingResponse) {
      this.effects.handleGlobalClick(card);
      return;
    }

    // battle
    if (this.combat.isSelectingTarget) {
      this.combat.handleCardSelection(card);
      return;
    }

    EventBus.emit(GameEvent.REQUEST_CARD_MENU, { card, x, y });
  }

  public cardActivation(
    card: Card,
    side: GameSide,
    instructions?: EffectInstructions,
  ): Promise<void> {
    return new Promise((resolve) => {
      const { SCREEN, BATTLE } = LAYOUT_CONFIG;
      const { COLORS, ANIMATIONS } = THEME_CONFIG;
      const isEffectMonster = card.getType() === "EFFECT_MONSTER";

      //save original position
      const originalPos = {
        x: card.x,
        y: card.y,
        angle: card.angle,
        scale: card.scale,
      };

      card.activate();

      //creating a temporary point to store position data
      const tempPoint = new Phaser.Math.Vector2();

      //capture the card's absolute world position for coord mapping
      card.visualElements.getWorldPoint(tempPoint);

      //add black background into overlay container
      const background = this.add
        .rectangle(
          SCREEN.CENTER_X,
          SCREEN.CENTER_Y,
          SCREEN.WIDTH,
          SCREEN.HEIGHT,
          COLORS.OVERLAY_BLACK,
          0.7,
        )
        .setAlpha(0)
        .setDepth(0);

      this.tweens.add({
        targets: background,
        alpha: 0.7,
        duration: ANIMATIONS.DURATIONS.NORMAL,
      });

      if (card.parentContainer) {
        //remove from parent container to add into temp overlay
        card.parentContainer.remove(card);
      }

      // add background and card into temp container
      this.overlayLayer.add([background, card]);
      card.setPosition(tempPoint.x, tempPoint.y);
      card.setDepth(1); // background depth 0, card 1

      this.tweens.add({
        targets: card,
        x: BATTLE.ACTIVATION_CENTER.x, // x center (1280 / 2)
        y: BATTLE.ACTIVATION_CENTER.y, // y center (720 / 2)
        angle: 0,
        scale: 1,
        duration: ANIMATIONS.DURATIONS.ACTIVATION,
        ease: ANIMATIONS.EASING.BOUNCE,
      });

      this.time.delayedCall(1000, () => {
        this.tweens.add({
          targets: background,
          alpha: 0,
          duration: ANIMATIONS.DURATIONS.NORMAL,
          onComplete: async () => {
            background.destroy();
            this.overlayLayer.remove(card);
            this.add.existing(card);
            this.currentHand.showHand();

            if (!isEffectMonster) {
              // remove card from slot
              this.field.releaseSlot(card, side);

              // move card to graveyard
              this.field.moveToGraveyard(card);
            }

            await this.effects.applyCardEffect(card, instructions);

            if (isEffectMonster) {
              //effect monster returns into original position after active effect
              this.tweens.add({
                targets: card,
                x: originalPos.x,
                y: originalPos.y,
                angle: originalPos.angle,
                scale: originalPos.scale,
                duration: ANIMATIONS.DURATIONS.ACTIVATION,
                ease: ANIMATIONS.EASING.POWER_OUT,
                onComplete: () => {
                  this.currentHand.showHand();
                  resolve();
                },
              });
            } else {
              resolve();
            }
          },
        });
      });
    });
  }

  public async onAttackDeclared(attacker: Card, target?: Card): Promise<void> {
    this.combat.currentAttacker = attacker;
    if (target) {
      this.combat.isSelectingTarget = true;
      await this.combat.handleCardSelection(target);
    } else {
      await this.combat.prepareTargeting(attacker);
    }
  }

  public clearAllMenus() {
    this.playerUI.clearSelectionMenu();
    this.opponentUI.clearSelectionMenu();
  }
}
