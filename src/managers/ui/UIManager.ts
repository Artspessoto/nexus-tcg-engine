import { LAYOUT_CONFIG } from "../../constants/LayoutConfig";
import { THEME_CONFIG } from "../../constants/ThemeConfig";
import { EventBus } from "../../events/EventBus";
import { GameEvent } from "../../events/GameEvents";
import type { IBattleContext } from "../../interfaces/IBattleContext";
import type { IUIManager } from "./IUIManager";
import type { Card } from "../../objects/Card";
import { DecisionModal } from "../../objects/DecisionModal";
import { ToonButton } from "../../objects/ToonButton";
import type {
  GamePhase,
  GameSide,
  Notice,
  PlacementMode,
  TranslationStructure,
} from "../../types/GameTypes";
import { CardDetailsModal } from "../../objects/CardDetailsModal";
import { PlayerStatsView } from "../../view/PlayerStatsView";

export class UIManager implements IUIManager {
  private context: IBattleContext;
  private side: GameSide;
  private translations!: TranslationStructure;
  private bannerText!: Phaser.GameObjects.Text;
  private bannerBg!: Phaser.GameObjects.Rectangle;
  private manaText!: Phaser.GameObjects.Text;
  private manaAura!: Phaser.GameObjects.Image;
  private inputBlocker?: Phaser.GameObjects.Rectangle;
  private bannerTimer?: Phaser.Time.TimerEvent;
  private statsView!: PlayerStatsView;

  private selectionButtons: ToonButton[] = [];

  constructor(context: IBattleContext, side: GameSide) {
    this.context = context;
    this.side = side;

    if (this.side == "PLAYER") {
      EventBus.on(GameEvent.PHASE_CHANGED, (data) => {
        this.clearSelectionMenu();

        this.handlePhaseNotice(data.newPhase, data.activePlayer);
      });
    }

    EventBus.on(GameEvent.NOTICE_REQUESTED, (data) => {
      if (this.side == "PLAYER") {
        this.showNotice(data.message, data.type);
      }
    });

    EventBus.on(GameEvent.REQUEST_CARD_MENU, (data) => {
      if (this.side == "PLAYER") {
        const { card, x, y } = data;

        if (card.location == "FIELD") {
          this.showFieldCardMenu(x, y, card);
          this.context.getHand("PLAYER").hideHand();
        } else if (card.location == "GRAVEYARD") {
          this.showGraveyardMenu(
            this.context.field.graveyardSlot[card.owner],
            x,
            y,
          );
        }
      }
    });

    EventBus.on(GameEvent.INSUFFICIENT_MANA, () => {
      if (this.side == "PLAYER") {
        this.showNotice(
          this.translations.battle_scene.insufficient_mana,
          "WARNING",
        );
      }
    });

    EventBus.on(GameEvent.ZONE_OCCUPIED, () => {
      if (this.side == "PLAYER") {
        this.showNotice(
          this.translations.battle_scene.zone_occupied,
          "WARNING",
        );
      }
    });

    EventBus.on(GameEvent.TARGETING_STARTED, (data) => {
      if (this.side == "PLAYER" && data.type == "ATTACK") {
        this.showNotice(
          this.translations.battle_scene.combat_notices.select_attack_target,
          "NEUTRAL",
        );
      } else if (this.side == "PLAYER" && data.type == "EFFECT") {
        this.showNotice(data.message!, "NEUTRAL");
      }
    });

    EventBus.on(GameEvent.TARGETING_CANCELED, () => {
      if (this.side == "PLAYER") {
        this.showNotice(
          this.translations.battle_scene.effect_notices.action_canceled,
          "NEUTRAL",
        );
      }
    });

    EventBus.on(GameEvent.CARD_POSITION_CHANGED, (data) => {
      if (data.isFlip) {
        this.handleFlipSummon(data.card);
      } else {
        this.handleChangePosition(data.card);
      }

      if (this.side === "PLAYER") {
        this.context.getHand("PLAYER").showHand();
      }
    });
  }

  public setTranslations(translations: TranslationStructure) {
    this.translations = translations;
  }

  public setupUI() {
    const { SCREEN } = LAYOUT_CONFIG;
    const { COLORS, FONTS, DEPTHS } = THEME_CONFIG;

    const initialMana = this.context.gameState.getMana(this.side);
    const initialLP = this.context.gameState.getHP(this.side);
    const playerName =
      this.side == "PLAYER" ? this.context.playerDisplayName : "CPU";

    this.statsView = new PlayerStatsView({
      initialLP,
      initialMana,
      playerName,
      side: this.side,
      scene: this.context.engine,
    });

    this.bannerBg = this.context.add
      .rectangle(
        SCREEN.CENTER_X,
        SCREEN.CENTER_Y,
        SCREEN.WIDTH,
        THEME_CONFIG.COMPONENTS.UI.PHASE_BANNER_HEIGHT,
        COLORS.OVERLAY_BLACK,
        0.85,
      )
      .setVisible(false)
      .setDepth(DEPTHS.BANNERS);

    this.bannerText = this.context.add
      .text(SCREEN.CENTER_X, SCREEN.CENTER_Y, "", FONTS.STYLES.BANNER_TEXT)
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(DEPTHS.BANNERS + 1);
  }

  public animateLPChange(amount: number, startLP: number, targetLP: number) {
    this.statsView.animateLPChange(amount, startLP, targetLP);
  }

  public animateManaChange(amount: number) {
    this.statsView.animateManaChange(amount);
  }

  private handlePhaseNotice(phase: GamePhase, activePlayer: GameSide) {
    const { battle_scene } = this.translations;

    switch (phase) {
      case "DRAW": {
        const drawMsg =
          activePlayer == "PLAYER"
            ? battle_scene.draw_phase
            : battle_scene.opponent_draw;
        this.showNotice(drawMsg, "PHASE");
        break;
      }
      case "MAIN":
        this.showNotice(battle_scene.main_phase, "PHASE");
        break;
      case "BATTLE":
        this.showNotice(battle_scene.battle_phase, "PHASE");
        break;
      case "CHANGE_TURN":
        this.showNotice(battle_scene.turn_ended, "NEUTRAL");
        break;
    }
  }

  public showNotice(message: string, type: Notice) {
    if (!this.bannerBg || !this.bannerText) return;
    const { COLORS } = THEME_CONFIG;

    const colorMap: Record<Notice, number> = {
      PHASE: COLORS.NOTICE_PHASE,
      WARNING: COLORS.NOTICE_WARNING,
      TURN: COLORS.NOTICE_TURN,
      NEUTRAL: COLORS.NOTICE_NEUTRAL,
    };

    const targetColor = colorMap[type] || COLORS.NOTICE_PHASE;

    this.bannerBg.setStrokeStyle(4, targetColor);

    this.animateBanner(message, type);
  }

  private animateBanner(message: string, type: Notice) {
    const { SCREEN } = LAYOUT_CONFIG;
    const { ANIMATIONS } = THEME_CONFIG;
    this.context.tweens.killTweensOf([this.bannerText, this.bannerBg]);

    if (this.bannerTimer) {
      this.bannerTimer.remove();
      this.bannerTimer = undefined;
    }

    this.bannerText
      .setText(message.toUpperCase())
      .setAlpha(1)
      .setVisible(true)
      .setScale(0.5)
      .setY(SCREEN.CENTER_Y)
      .setX(SCREEN.CENTER_X);
    this.bannerBg
      .setY(SCREEN.CENTER_Y)
      .setX(SCREEN.CENTER_X)
      .setAlpha(1)
      .setVisible(true)
      .setScale(1, 0);

    // start animation
    this.context.tweens.add({
      targets: this.bannerBg,
      scaleY: 1,
      alpha: 1,
      duration: ANIMATIONS.DURATIONS.FAST,
      ease: ANIMATIONS.EASING.QUART_OUT,
    });

    // pop animation
    this.context.tweens.add({
      targets: this.bannerText,
      scale: 1,
      duration: ANIMATIONS.DURATIONS.UI_POP,
      ease: ANIMATIONS.EASING.BOUNCE,
      onComplete: () => {
        //shake effect
        if (type === "WARNING") {
          this.context.tweens.add({
            targets: [this.bannerText, this.bannerBg],
            x: "+=3",
            yoyo: true,
            duration: 40,
            repeat: 3,
          });
        }
      },
    });

    this.bannerTimer = this.context.time.delayedCall(600, () => {
      this.context.tweens.add({
        targets: [this.bannerText, this.bannerBg],
        alpha: 0,
        y: "-=30",
        duration: ANIMATIONS.DURATIONS.PREVIEW,
        ease: ANIMATIONS.EASING.POWER_OUT,
        onComplete: () => {
          this.bannerText.setVisible(false).setY(SCREEN.CENTER_Y);
          this.bannerBg.setVisible(false).setY(SCREEN.CENTER_Y);

          this.bannerText.setX(SCREEN.CENTER_X);
          this.bannerBg.setX(SCREEN.CENTER_X);
          this.bannerTimer = undefined;
        },
      });
    });
  }

  public showSelectionMenu(
    x: number,
    y: number,
    card: Card,
    onSelect: (mode: PlacementMode) => void,
    onCancel?: () => void,
  ) {
    this.context.clearAllMenus();
    const { COMPONENTS, DEPTHS } = THEME_CONFIG;
    const cardType = card.getType();
    const isMonster = cardType.includes("MONSTER");
    const buttonTexts = this.translations.battle_scene.battle_buttons;

    this.inputBlocker = this.context.add
      .rectangle(640, 360, 1280, 720, 0x000000, 0.4)
      .setInteractive()
      .setDepth(THEME_CONFIG.DEPTHS.PREVIEW_CARD - 1);

    this.inputBlocker.on("pointerdown", () => {
      if (onCancel) onCancel();
      else this.shakeButtons();
    });

    let leftConfig = null;
    let rightConfig = null;

    if (isMonster) {
      leftConfig = { text: "", icon: "crossed-swords", width: 70 };
      rightConfig = { text: "", icon: "round-shield", width: 70 };
    } else if (cardType === "SPELL") {
      leftConfig = { text: buttonTexts.active, width: 90 };
      rightConfig = { text: buttonTexts.set, width: 110 };
    } else if (cardType === "TRAP") {
      rightConfig = { text: buttonTexts.set, width: 110 };
    }

    const createBtn = (
      config: { text: string; width: number; icon?: string },
      isLeft: boolean,
    ) => {
      const btn = new ToonButton(this.context.engine, {
        x: x + (isLeft ? (rightConfig ? -75 : 0) : 75),
        y: y - 100,
        height: 42,
        fontSize: isLeft ? "18px" : "16px",
        ...COMPONENTS.BUTTONS.PRIMARY,
        ...config,
      }).setDepth(DEPTHS.SELECTION_MENU);

      this.selectionButtons.push(btn);
      btn.on("pointerdown", () => {
        this.context.clearAllMenus();
        onSelect(
          isMonster ? (isLeft ? "ATK" : "DEF") : isLeft ? "FACE_UP" : "SET",
        );
      });
    };

    if (leftConfig) createBtn(leftConfig, true);
    if (rightConfig) createBtn(rightConfig, false);
  }

  private shakeButtons() {
    this.selectionButtons.forEach((btn) => {
      this.context.tweens.add({
        targets: btn,
        x: btn.x + 5,
        duration: 50,
        yoyo: true,
        repeat: 3,
        ease: "Power1",
      });
    });
  }

  public clearSelectionMenu() {
    this.inputBlocker?.destroy();
    this.selectionButtons.forEach((btn) => btn.destroy());
    this.selectionButtons = [];
  }

  public showFieldCardMenu(x: number, y: number, card: Card) {
    this.context.clearAllMenus();

    const buttons: ToonButton[] = [];
    const buttonArgs: ButtonParams = { card, buttons, x, y };

    const isPlayerCard = card.owner === "PLAYER";
    const myTurn = this.context.gameState.activePlayer == "PLAYER";
    const isResponseWindow = this.context.effects.isSelectingResponse;
    const currentPhase = this.context.currentPhase;

    if (isPlayerCard) {
      if (myTurn) {
        if (currentPhase == "MAIN") {
          this.addPositionButtons(buttonArgs);
          this.addActivationButton(buttonArgs);
        }

        if (currentPhase == "BATTLE") {
          this.addAttackButton(buttonArgs);
        }
      } else if (isResponseWindow) {
        this.addActivationButton(buttonArgs);
      }
    }

    this.addDetailsButton(buttonArgs);
    this.selectionButtons = buttons;
  }

  public showGraveyardMenu(graveyardCards: Card[], x: number, y: number) {
    this.context.clearAllMenus();

    const battleTexts = this.translations["battle_scene"];
    const buttonTexts = battleTexts.battle_buttons;

    this.selectionButtons.push(
      this.createMenuButton(buttonTexts.details, x + 70, y - 35, () => {
        this.context.engine.scene.launch("GraveyardScene", graveyardCards);
      }),
    );
  }

  private addPositionButtons({ card, buttons, x, y }: ButtonParams) {
    const mainPhase = this.context.currentPhase == "MAIN";
    const currentTurn = this.context.gameState.currentTurn;
    const hasWaited = currentTurn > card.setTurn;
    const monsterCard = card.getType().includes("MONSTER");
    const battleTexts = this.translations["battle_scene"];
    const buttonTexts = battleTexts.battle_buttons;

    const canChangePos =
      mainPhase &&
      hasWaited &&
      !card.hasChangedPosition &&
      card.owner == "PLAYER" &&
      monsterCard;

    if (!canChangePos) return;

    if (card.isFaceDown) {
      buttons.push(
        this.createMenuButton(buttonTexts.flip, x + 70, y - 35, () =>
          // this.handleFlipSummon(card),
          EventBus.emit(GameEvent.CARD_POSITION_CHANGED, {
            card: card,
            newMode: "FACE_UP",
            isFlip: true,
          }),
        ),
      );
    } else {
      const label = buttonTexts.change_pos;
      const newMode = card.angle === 0 ? "DEF" : "ATK";
      buttons.push(
        this.createMenuButton(label, x + 70, y - 35, () =>
          EventBus.emit(GameEvent.CARD_POSITION_CHANGED, {
            card: card,
            newMode,
            isFlip: false,
          }),
        ),
      );
    }
  }

  private addAttackButton({ card, buttons, x, y }: ButtonParams) {
    const currentPhase = this.context.currentPhase;
    const cardData = card.getCardData();
    const battleTexts = this.translations["battle_scene"];
    const buttonTexts = battleTexts.battle_buttons;

    //attack phase
    const isAttackPosition = card.angle == 0;
    const canAttack =
      cardData.atk !== undefined &&
      isAttackPosition &&
      card.owner == "PLAYER" &&
      !card.isFaceDown &&
      !card.hasAttacked;
    //atk btn
    if (currentPhase === "BATTLE" && canAttack) {
      buttons.push(
        this.createMenuButton(buttonTexts.attack, x + 70, y - 35, async () => {
          await this.context.onAttackDeclared(card);
        }),
      );
    }
  }

  private addActivationButton({ card, buttons, x, y }: ButtonParams) {
    if (card.owner !== "PLAYER") return;

    const battleTexts = this.translations["battle_scene"];
    const buttonTexts = battleTexts.battle_buttons;

    const currentTurn = this.context.gameState.currentTurn;
    const hasWaited = currentTurn > card.setTurn;
    const cardType = card.getType();

    let canActivate = false;

    if (cardType == "TRAP") {
      canActivate = card.isFaceDown && hasWaited;
    } else if (cardType == "EFFECT_MONSTER") {
      canActivate = hasWaited && !card.hasActivatedEffect;
    } else if (cardType == "SPELL") {
      canActivate = true;
    }

    if (canActivate) {
      this.pushActiveButton(buttons, x, y, buttonTexts.active, card);
    }
  }

  private pushActiveButton(
    buttons: ToonButton[],
    x: number,
    y: number,
    label: string,
    card: Card,
  ) {
    //right button verify
    const offsetY = buttons.length > 0 ? 85 : 35;
    const offsetX = buttons.length > 0 ? 0 : 70;

    buttons.push(
      this.createMenuButton(label, x + offsetX, y - offsetY, async () => {
        await this.context.cardActivation(card, this.side);

        EventBus.emit(GameEvent.ACTION_FINALIZED, { card });
      }),
    );
  }

  private addDetailsButton({ card, buttons, x, y }: ButtonParams) {
    const battleTexts = this.translations["battle_scene"];
    const buttonTexts = battleTexts.battle_buttons;

    //details btn always visible
    if (!card.isFaceDown || card.owner === "PLAYER") {
      buttons.push(
        this.createMenuButton(buttonTexts.details, x - 70, y - 35, () => {
          this.context.getHand("PLAYER").showHand();
          new CardDetailsModal(this.context.engine, {
            cardData: card.getCardData(),
            owner: card.owner,
            originalOwner: card.originalOwner,
            location: card.location,
          });
        }),
      );
    }
  }

  private createMenuButton(
    text: string,
    x: number,
    y: number,
    callback: () => void,
  ): ToonButton {
    const btn = new ToonButton(this.context.engine, {
      text: text.toUpperCase(),
      x,
      y,
      ...THEME_CONFIG.COMPONENTS.BUTTONS.PRIMARY,
      height: 40,
      width: 120,
      fontSize: "14px",
    }).setDepth(THEME_CONFIG.DEPTHS.SELECTION_MENU);

    btn.on("pointerdown", () => {
      this.context.clearAllMenus();
      callback();
    });

    return btn;
  }

  public handleFlipSummon(card: Card) {
    card.animateFlip(() => {
      // card impact animation effect
      this.context.cameras.main.shake(100, 0.002);
      this.context.getHand(card.owner).showHand();
    });
  }

  public handleChangePosition(card: Card) {
    const { LIGHT } = THEME_CONFIG.ANIMATIONS.SHAKES;
    card.animateChangePosition(() => {
      // card impact animation effect
      this.context.cameras.main.shake(LIGHT.duration, LIGHT.intensity);
      this.context.getHand(card.owner).showHand();
    });
  }

  public async showTrapResponseAction(): Promise<boolean> {
    return new Promise((resolve) => {
      const { SCREEN } = LAYOUT_CONFIG;
      const { DEPTHS } = THEME_CONFIG;
      const { response_title, response_message, confirm_btn, cancel_btn } =
        this.translations.battle_scene.effect_notices;

      //opacity block background
      this.inputBlocker = this.context.add
        .rectangle(
          SCREEN.CENTER_X,
          SCREEN.CENTER_Y,
          SCREEN.WIDTH,
          SCREEN.HEIGHT,
          0x000000,
          0.6,
        )
        .setInteractive()
        .setDepth(DEPTHS.BANNERS - 1);

      new DecisionModal(
        this.context.engine,
        {
          title: response_title,
          message: response_message,
          confirmText: confirm_btn,
          cancelText: cancel_btn,
        },
        (result) => {
          this.inputBlocker?.destroy();
          resolve(result);
        },
      ).setDepth(THEME_CONFIG.DEPTHS.BANNERS);
    });
  }
}

export interface ButtonParams {
  card: Card;
  x: number;
  y: number;
  buttons: ToonButton[];
}
