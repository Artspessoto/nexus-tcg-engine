import { TRANSLATIONS } from "../constants/Translations";
import { GameState } from "../domain/GameState";
import { HandManager } from "../managers/HandManager";
import { PhaseManager } from "../managers/PhaseManager";
import { Card } from "../objects/Card";
import { ToonButton } from "../objects/ToonButton";
import type {
  BattleTranslations,
  GamePhase,
  GameSide,
  PlacementMode,
} from "../types/GameTypes";
import { LanguageManager } from "../managers/LanguageManager";
import { FieldManager } from "../managers/FieldManager";
import { InputManager } from "../managers/InputManager";
import { DeckManager } from "../managers/DeckManager";
import { UIManager } from "../managers/UIManager";
import { CombatManager } from "../managers/CombatManager";

export class BattleScene extends Phaser.Scene {
  public gameState: GameState;
  public translationText!: BattleTranslations;
  public phaseManager: PhaseManager;
  public playerHand: HandManager;
  public opponentHand: HandManager;
  public fieldManager: FieldManager;
  public inputManager: InputManager;
  public playerDeck: DeckManager;
  public oponentDeck: DeckManager;
  public playerUI: UIManager;
  public opponentUI: UIManager;
  public combatManager: CombatManager;

  public phaseButton!: ToonButton;
  public selectedCard: Card | null = null;
  private overlayLayer!: Phaser.GameObjects.Container;

  constructor() {
    super("BattleScene");

    this.gameState = new GameState();
    this.phaseManager = new PhaseManager(this);
    this.fieldManager = new FieldManager(this);
    this.inputManager = new InputManager(this);
    this.combatManager = new CombatManager(this);

    this.playerUI = new UIManager(this, "PLAYER");
    this.opponentUI = new UIManager(this, "OPPONENT");

    this.playerHand = new HandManager(this, "PLAYER");
    this.opponentHand = new HandManager(this, "OPPONENT");

    this.playerDeck = new DeckManager(this, "PLAYER");
    this.oponentDeck = new DeckManager(this, "OPPONENT");
  }

  public get currentPhase(): GamePhase {
    return this.gameState.currentPhase;
  }

  preload() {
    this.load.image(
      "battle-scene-background",
      "assets/frameCards/battle_scene_1.jpeg",
    );
    this.load.image("card_back", "assets/frameCards/card_back2.png");
    this.load.image(
      "card_template_monster",
      "assets/frameCards/monster_card.png",
    );
    this.load.image(
      "card_template_effect",
      "assets/frameCards/effect_monster_card.png",
    );
    this.load.image("card_template_spell", "assets/frameCards/spell_card.png");
    this.load.image("card_template_trap", "assets/frameCards/trap_card.png");
    this.load.image("sword_icon", "assets/frameCards/crossed-swords.svg");
    this.load.image("shield_icon", "assets/frameCards/round-shield.svg");
    this.load.image("mana_icon", "assets/frameCards/mana_icon.png");
  }

  create() {
    const lang = LanguageManager.getInstance().currentLanguage;
    const currentTranslations = TRANSLATIONS[lang];
    this.translationText = TRANSLATIONS[lang].battle_scene;

    const bg = this.add.image(640, 360, "battle-scene-background");
    bg.setDisplaySize(1280, 720).setDepth(-100);

    //global stage: temp container ensures activated cards always render on top
    this.overlayLayer = this.add.container(0, 0).setDepth(20000);

    this.playerUI.setTranslations(currentTranslations);
    this.opponentUI.setTranslations(currentTranslations);

    this.playerUI.setupUI();
    this.playerUI.setupLifePoints();
    this.opponentUI.setupUI();
    this.opponentUI.setupLifePoints();

    this.playerDeck.createDeckVisual();
    this.oponentDeck.createDeckVisual();

    this.fieldManager.setupFieldZones();

    // this.phaseTextBg = this.add.rectangle(640, 360, 500, 40, 0x000000, 0.8);
    this.phaseButton = new ToonButton(this, {
      x: 1120,
      y: 420,
      text: "",
      fontSize: "18px",
      textColor: "#fff",
      color: 0x242424,
      hoverColor: 0x242424,
      width: 200,
      height: 60,
    });
    this.phaseButton.setVisible(false).setDepth(5000);

    this.phaseButton.on("pointerdown", () => {
      this.handleNextPhase();
    });

    this.inputManager.setupGlobalInputs();

    this.startInitialDraw();
  }

  private getActiveManager<T>(playerManager: T, oponentMananger: T): T {
    return this.gameState.activePlayer === "PLAYER"
      ? playerManager
      : oponentMananger;
  }

  public get currentDeck(): DeckManager {
    return this.getActiveManager(this.playerDeck, this.oponentDeck);
  }

  public get currentHand(): HandManager {
    return this.getActiveManager(this.playerHand, this.opponentHand);
  }

  public get currentUI(): UIManager {
    return this.getActiveManager(this.playerUI, this.opponentUI);
  }

  private startInitialDraw() {
    let delay = 0;
    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(delay, () => {
        this.playerHand.drawCard(this.playerDeck.position);
        this.opponentHand.drawCard(this.oponentDeck.position);
      });
      delay += 200;
    }
    this.time.delayedCall(delay, () => this.setPhase("MAIN"));
  }

  public handlePlayerCard() {
    if (this.currentPhase == "DRAW" && this.gameState.currentTurn !== 1) {
      this.setPhase("MAIN");
      this.currentHand.drawCard(this.currentDeck.position);
      this.currentUI.updateMana(2);
    }
  }

  public setPhase(newPhase: GamePhase) {
    this.playerUI.clearSelectionMenu();
    this.combatManager.cancelTarget();
    this.playerHand.showHand();

    this.gameState.setPhase(newPhase);

    if (newPhase === "CHANGE_TURN") {
      this.gameState.advanceTurnCount();
    }

    this.phaseManager.updateUI(newPhase, this.translationText);

    if (newPhase === "DRAW") {
      if (this.gameState.activePlayer === "OPPONENT") {
        this.currentHand.drawCard(this.currentDeck.position);
        this.currentUI.updateMana(2);
        this.handleOpponentTurn();
      }
    }
  }

  public finalizeTurnTransition() {
    this.gameState.nextTurn(); // change to oponent and reset to draw phase
    this.setPhase("DRAW");
  }

  private handleNextPhase() {
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
    const result = this.fieldManager.validatePlay(card, targetZone);

    if (!result.valid) {
      //mana or slot invalid
      if (result.reason) {
        this.currentUI.showNotice(result.reason, "WARNING");
      }
      this.currentHand.reorganizeHand();
      return;
    }

    const slot = result.slot!;
    const activeSide = this.gameState.activePlayer;
    const zoneType: "MONSTER" | "SPELL" = targetZone.getData("type");

    this.gameState.setDragging(false);
    this.selectedCard = card;

    this.currentHand.removeCard(card);
    this.currentHand.hideHand();

    this.fieldManager.previewPlacement(card, slot.x, slot.y);
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
    );
  }

  public cancelPlacement() {
    this.currentUI.clearSelectionMenu();
    this.currentHand.showHand();

    if (!this.selectedCard) return;

    //return card to hand
    this.currentHand.addCardBack(this.selectedCard);

    this.selectedCard.setInteractive();
    this.selectedCard.setDepth(100);

    this.selectedCard = null;
  }

  private executePlay(
    card: Card,
    side: GameSide,
    type: "MONSTER" | "SPELL",
    slot: { x: number; y: number; index: number },
    mode: PlacementMode,
  ) {
    const hand = side == "PLAYER" ? this.playerHand : this.opponentHand;

    hand.removeCard(card);
    this.fieldManager.occupySlot(side, type, slot.index, card);
    this.fieldManager.playCardToZone(card, slot.x, slot.y, mode);

    if (side == "PLAYER") hand.showHand();
  }

  //simulate changing turn
  private handleOpponentTurn() {
    this.time.delayedCall(2000, () => {
      this.setPhase("MAIN");

      this.time.delayedCall(1000, () => {
        const npcHand = this.opponentHand;
        const monsterCard = npcHand.hand.find((card) =>
          card.getType().includes("MONSTER"),
        );
        const firstCard = monsterCard ? monsterCard : npcHand.hand[0];

        if (firstCard) {
          const cardType = firstCard.getType();
          const slotType = cardType.includes("MONSTER") ? "MONSTER" : "SPELL";
          const result = this.fieldManager.getValidSlotToPlay(
            firstCard,
            "OPPONENT",
            slotType,
          );

          if (result.valid && result.slot) {
            const cardMode = slotType == "MONSTER" ? "ATK" : "SET";
            this.executePlay(
              firstCard,
              "OPPONENT",
              slotType,
              result.slot,
              cardMode,
            );
          }
        }
      });

      this.time.delayedCall(2000, () => {
        this.setPhase("BATTLE");

        this.time.delayedCall(2000, () => {
          this.setPhase("CHANGE_TURN");
        });
      });
    });
  }

  public cardActivation(card: Card, side: GameSide) {
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
      .rectangle(640, 360, 1280, 720, 0x000000, 0.7)
      .setAlpha(0)
      .setDepth(0);

    this.tweens.add({
      targets: background,
      alpha: 0.7,
      duration: 300,
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
      x: 640, // x center (1280 / 2)
      y: 360, // y center (720 / 2)
      angle: 0,
      scale: 1,
      duration: 400,
      ease: "Back.easeOut",
    });

    this.time.delayedCall(1000, () => {
      this.tweens.add({
        targets: background,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          background.destroy();
          this.overlayLayer.remove(card);
          this.add.existing(card);
          this.currentHand.showHand();

          if (!isEffectMonster) {
            // remove card from slot
            this.fieldManager.releaseSlot(card, side);

            // move card to graveyard
            this.fieldManager.moveToGraveyard(card, side);
          } else {
            //effect monster returns into original position after active effect
            this.tweens.add({
              targets: card,
              x: originalPos.x,
              y: originalPos.y,
              angle: originalPos.angle,
              scale: originalPos.scale,
              duration: 400,
              ease: "Power2.easeOut",
              onComplete: () => {
                this.currentHand.showHand();
              },
            });
          }
        },
      });
    });
  }

  public onAttackDeclared(attacker: Card) {
    this.combatManager.prepareTargeting(attacker);
  }
}
