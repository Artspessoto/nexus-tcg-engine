import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { THEME_CONFIG } from "../constants/ThemeConfig";
import { EventBus } from "../events/EventBus";
import { GameEvent } from "../events/GameEvents";
import type { IBattleContext } from "../interfaces/IBattleContext";
import type { IUIManager } from "../interfaces/IUIManager";
import type { Card } from "../objects/Card";
import { ToonButton } from "../objects/ToonButton";
import type {
  GamePhase,
  GameSide,
  Notice,
  PlacementMode,
  TranslationStructure,
} from "../types/GameTypes";

export class UIManager implements IUIManager {
  private context: IBattleContext;
  private side: GameSide;
  private translations!: TranslationStructure;
  private bannerText!: Phaser.GameObjects.Text;
  private bannerBg!: Phaser.GameObjects.Rectangle;
  private manaText!: Phaser.GameObjects.Text;
  private manaIcon!: Phaser.GameObjects.Image;
  private manaAura!: Phaser.GameObjects.Image;
  private manaPosition: { x: number; y: number };
  private hpText!: Phaser.GameObjects.Text;
  private inputBlocker?: Phaser.GameObjects.Rectangle;
  private bannerTimer?: Phaser.Time.TimerEvent;

  private selectionButtons: ToonButton[] = [];

  constructor(context: IBattleContext, side: GameSide) {
    this.context = context;
    this.side = side;

    this.manaPosition = LAYOUT_CONFIG.UI.MANA[this.side];

    EventBus.on(GameEvent.PHASE_CHANGED, (data) => {
      this.clearSelectionMenu();

      this.handlePhaseNotice(data.newPhase, data.activePlayer);
    });

    EventBus.on(GameEvent.DIRECT_ATTACK, (data) => {
      if (data.targetSide == this.side) {
        this.updateLP(this.side, -data.damage);
      }
    });

    EventBus.on(GameEvent.BATTLE_RESOLVED, (data) => {
      //attacker wins
      if (data.winner == data.attacker && data.target.owner == this.side) {
        this.updateLP(this.side, -data.damage);
      }

      //defender wins
      else if (data.winner == data.target && data.attacker.owner == this.side) {
        this.updateLP(this.side, -data.damage);
      }
    });

    EventBus.on(GameEvent.LP_CHANGED, (data) => {
      if (data.side == this.side) {
        this.updateLP(side, data.amount);
      }
    });

    EventBus.on(GameEvent.MANA_CHANGED, (data) => {
      if (data.side == this.side) {
        this.updateMana(data.amount);
      }
    });

    EventBus.on(GameEvent.INSUFFICIENT_MANA, (data) => {
      if (data.side == this.side) {
        this.showNotice(
          this.translations.battle_scene.insufficient_mana,
          "WARNING",
        );
      }
    });

    EventBus.on(GameEvent.ZONE_OCCUPIED, (data) => {
      if (data.side == this.side) {
        this.showNotice(
          this.translations.battle_scene.zone_occupied,
          "WARNING",
        );
      }
    });

    EventBus.on(GameEvent.TARGETING_STARTED, (data) => {
      if (data.source.owner == this.side && data.type == "ATTACK") {
        this.showNotice(
          this.translations.battle_scene.combat_notices.select_attack_target,
          "NEUTRAL",
        );
      } else if (data.source.owner == this.side && data.type == "EFFECT") {
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

    this.manaAura = this.context.add
      .image(this.manaPosition.x, this.manaPosition.y, "mana_icon")
      .setScale(0.5)
      .setAlpha(0)
      .setTint(0xffffff)
      .setDepth(DEPTHS.UI_BASE - 1);

    this.manaIcon = this.context.add
      .image(this.manaPosition.x, this.manaPosition.y, "mana_icon")
      .setScale(0.4)
      .setDepth(DEPTHS.UI_BASE);

    this.manaText = this.context.add
      .text(
        this.manaIcon.x,
        this.manaIcon.y,
        `${initialMana}`,
        FONTS.STYLES.MANA_DISPLAY,
      )
      .setOrigin(0.5)
      .setDepth(DEPTHS.UI_BASE + 1);

    this.bannerBg = this.context.add
      .rectangle(
        SCREEN.CENTER_X,
        SCREEN.CENTER_Y,
        SCREEN.WIDTH,
        THEME_CONFIG.COMPONENTS.UI.BANNER_HEIGHT,
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

  public setupLifePoints() {
    const { UI } = LAYOUT_CONFIG;
    const currentHP = this.context.gameState.getHP(this.side);
    const yPos =
      this.side == "PLAYER" ? UI.LP_BAR.Y_PLAYER : UI.LP_BAR.Y_OPPONENT;

    this.createLPBar(UI.LP_BAR.X, yPos, currentHP);
  }

  public updateLP(side: GameSide, amount: number) {
    const { ANIMATIONS } = THEME_CONFIG;
    const startLP = this.context.gameState.getHP(side);

    this.context.gameState.modifyHP(side, amount);

    this.animateLPImpact(amount);

    const targetLP = this.context.gameState.getHP(side);
    const lpCounter = { value: startLP };

    this.context.tweens.add({
      targets: lpCounter,
      value: targetLP,
      duration: ANIMATIONS.DURATIONS.LP_ROLL,
      ease: ANIMATIONS.EASING.SMOOTH,
      onUpdate: () => {
        this.hpText.setText(Math.floor(lpCounter.value).toString());
      },
    });
  }

  public updateMana(amount: number) {
    const { ANIMATIONS } = THEME_CONFIG;
    this.context.gameState.modifyMana(this.side, amount);

    const newMana = this.context.gameState.getMana(this.side);
    this.manaText.setText(`${newMana}`);

    this.context.tweens.add({
      targets: this.manaAura,
      alpha: { from: 0.8, to: 0 },
      scale: { from: 0.5, to: 0.8 }, //shock wave effect
      duration: ANIMATIONS.DURATIONS.NORMAL,
      ease: ANIMATIONS.EASING.QUART_OUT,
      onComplete: () => {
        this.manaAura.setScale(0.5).setAlpha(0);
      },
    });
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
      .setScale(0.5);
    this.bannerBg.setAlpha(1).setVisible(true).setScale(1, 0);

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

  private createLPBar(x: number, y: number, initialHP: number) {
    const { HEIGHT, RADIUS, WIDTH } = LAYOUT_CONFIG.UI.LP_BAR;
    const { COLORS } = THEME_CONFIG;

    const container = this.context.add.container(x, y);
    const bg = this.context.add.graphics();

    bg.fillStyle(COLORS.OVERLAY_BLACK, 0.5);
    bg.fillRoundedRect(4, 4, WIDTH, HEIGHT, RADIUS);

    bg.fillStyle(COLORS.STONE_DARK, 1);
    bg.fillRoundedRect(0, 0, WIDTH, HEIGHT, RADIUS);

    bg.lineStyle(4, COLORS.GOLD_METAL, 1);
    bg.strokeRoundedRect(0, 0, WIDTH, HEIGHT, RADIUS);

    bg.lineStyle(2, COLORS.OVERLAY_BLACK, 0.3);
    bg.strokeRoundedRect(3, 3, WIDTH - 6, HEIGHT - 6, RADIUS - 2);

    container.add(bg);

    const labelLP = this.context.add
      .text(20, 18, "LP", {
        fontFamily: THEME_CONFIG.FONTS.FAMILY_DISPLAY,
        fontSize: "18px",
        color: COLORS.GOLD_GLOW,
      })
      .setOrigin(0, 0.5);
    container.add(labelLP);

    const textStyle = {
      fontFamily: THEME_CONFIG.FONTS.FAMILY_DISPLAY,
      fontSize: "36px",
      color: COLORS.GOLD_GLOW,
    };

    this.hpText = this.context.add
      .text(60, 30, `${initialHP}`, textStyle)
      .setOrigin(0, 0.5)
      .setShadow(2, 2, "#000000", 4, true, false);

    container.add(this.hpText);

    if (this.side === "PLAYER") {
      container.setY(y - 10);
    }
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
      leftConfig = { text: "", icon: "sword_icon", width: 70 };
      rightConfig = { text: "", icon: "shield_icon", width: 70 };
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

    if (isPlayerCard && myTurn) {
      this.addPositionButtons(buttonArgs);
      this.addAttackButton(buttonArgs);
      this.addActivationButton(buttonArgs);
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
        this.context.engine.scene.launch("CardListScene", graveyardCards);
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
        this.createMenuButton("VIRAR", x + 70, y - 35, () =>
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
        this.createMenuButton(buttonTexts.attack, x + 70, y - 35, () => {
          this.context.onAttackDeclared(card);
        }),
      );
    }
  }

  private addActivationButton({ card, buttons, x, y }: ButtonParams) {
    const battleTexts = this.translations["battle_scene"];
    const buttonTexts = battleTexts.battle_buttons;

    const currentTurn = this.context.gameState.currentTurn;
    const hasWaited = currentTurn > card.setTurn;
    const isEffectCard =
      card.getType() === "TRAP" || card.getType() == "EFFECT_MONSTER";

    if (card.isFaceDown && card.owner == "PLAYER") {
      const canActive = isEffectCard ? hasWaited : true;

      //trap or effect monster need wait 1 turn to active
      if (canActive && card.getType() !== "MONSTER") {
        buttons.push(
          this.createMenuButton(buttonTexts.active, x + 70, y - 35, () => {
            this.context.cardActivation(card, this.side);
          }),
        );
      }
    }
  }

  private addDetailsButton({ card, buttons, x, y }: ButtonParams) {
    const battleTexts = this.translations["battle_scene"];
    const buttonTexts = battleTexts.battle_buttons;

    //details btn always visible
    if (!card.isFaceDown || card.owner === "PLAYER") {
      buttons.push(
        this.createMenuButton(buttonTexts.details, x - 70, y - 35, () => {
          this.context.getHand("PLAYER").showHand();
          this.context.engine.scene.launch("CardDetailScene", {
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

  private animateLPImpact(amount: number) {
    const { COLORS, ANIMATIONS } = THEME_CONFIG;
    const isDamage = amount < 0; //take dmg is negative value
    const impactColor = isDamage ? COLORS.LP_DAMAGE : COLORS.LP_HEAL;

    this.hpText.setColor(impactColor);

    this.context.tweens.add({
      targets: this.hpText,
      scale: 1.4,
      duration: ANIMATIONS.DURATIONS.UI_POP,
      yoyo: true,
      ease: ANIMATIONS.EASING.BOUNCE,
      onComplete: () => {
        this.hpText.setColor(COLORS.GOLD_GLOW);
        this.hpText.setScale(1);
      },
    });

    if (isDamage) {
      this.context.cameras.main.shake(
        ANIMATIONS.SHAKES.STRONG.duration,
        ANIMATIONS.SHAKES.STRONG.intensity,
      );
    }
  }
}

export interface ButtonParams {
  card: Card;
  x: number;
  y: number;
  buttons: ToonButton[];
}
