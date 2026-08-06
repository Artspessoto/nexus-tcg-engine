import { LAYOUT_CONFIG } from "../../constants/LayoutConfig";
import { THEME_CONFIG } from "../../constants/ThemeConfig";
import { EventBus } from "../../events/EventBus";
import { GameEvent } from "../../events/GameEvents";
import type { IBattleContext } from "../../interfaces/IBattleContext";
import type { IUIManager } from "./IUIManager";
import type { Card } from "../../objects/Card";
import { DecisionModal } from "../../objects/DecisionModal";
import type {
  GamePhase,
  GameSide,
  Notice,
  PlacementMode,
  TranslationStructure,
} from "../../types/GameTypes";
import { CardDetailsModal } from "../../objects/CardDetailsModal";
import { PlayerStatsView } from "../../view/PlayerStatsView";
import { NoticeBannerView } from "../../view/NoticeBannerView";
import { ActionMenuView, type MenuOption } from "../../view/ActionMenuView";

export class UIManager implements IUIManager {
  private context: IBattleContext;
  private side: GameSide;
  private translations!: TranslationStructure;

  private statsView!: PlayerStatsView;
  private noticeBannerView!: NoticeBannerView;
  private actionMenuView!: ActionMenuView;

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

    this.noticeBannerView = new NoticeBannerView(this.context.engine);

    this.actionMenuView = new ActionMenuView(this.context.engine);
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
    this.noticeBannerView.showNotice(message, type);
  }

  public showSelectionMenu(
    x: number,
    y: number,
    card: Card,
    onSelect: (mode: PlacementMode) => void,
    onCancel?: () => void,
  ) {
    this.context.clearAllMenus();
    const cardType = card.getType();
    const isMonster = cardType.includes("MONSTER");
    const buttonTexts = this.translations.battle_scene.battle_buttons;

    const options: MenuOption[] = [];

    if (isMonster) {
      //atk btn
      options.push({
        label: "",
        icon: "crossed-swords",
        width: 70,
        offsetX: -75,
        offsetY: -100,
        action: () => onSelect("ATK"),
      });
      //def btn
      options.push({
        label: "",
        icon: "round-shield",
        width: 70,
        offsetX: 75,
        offsetY: -100,
        action: () => onSelect("DEF"),
      });
    } else if (cardType === "SPELL") {
      options.push({
        label: buttonTexts.active,
        width: 90,
        offsetX: -75,
        offsetY: -100,
        isLeft: true,
        action: () => onSelect("FACE_UP"),
      });
      options.push({
        label: buttonTexts.set,
        width: 110,
        offsetX: 75,
        offsetY: -100,
        action: () => onSelect("SET"),
      });
    } else if (cardType === "TRAP") {
      options.push({
        label: buttonTexts.set,
        width: 110,
        offsetX: 75,
        offsetY: -100,
        action: () => onSelect("SET"),
      });
    }

    this.actionMenuView.renderMenu(x, y, options, onCancel);
  }

  public clearSelectionMenu(): void {
    this.actionMenuView.clearMenu();
  }

  public showFieldCardMenu(x: number, y: number, card: Card) {
    this.context.clearAllMenus();

    const options: MenuOption[] = [];
    const menuArgs: MenuOptionParams = { card, options };

    const isPlayerCard = card.owner === "PLAYER";
    const myTurn = this.context.gameState.activePlayer == "PLAYER";
    const isResponseWindow = this.context.effects.isSelectingResponse;
    const currentPhase = this.context.currentPhase;

    if (isPlayerCard) {
      if (myTurn) {
        if (currentPhase == "MAIN") {
          this.addPositionButtons(menuArgs);
          this.addActivationButton(menuArgs);
        }

        if (currentPhase == "BATTLE") {
          this.addAttackButton(menuArgs);
        }
      } else if (isResponseWindow) {
        this.addActivationButton(menuArgs);
      }
    }

    this.addDetailsButton(menuArgs);
    this.actionMenuView.renderMenu(x, y, options);
  }

  public showGraveyardMenu(graveyardCards: Card[], x: number, y: number) {
    this.context.clearAllMenus();

    const buttonTexts = this.translations["battle_scene"].battle_buttons;

    const options: MenuOption[] = [
      {
        label: buttonTexts.details,
        offsetX: 70,
        action: () => {
          this.context.engine.scene.launch("GraveyardScene", graveyardCards);
        },
      },
    ];

    this.actionMenuView.renderMenu(x, y, options);
  }

  private addPositionButtons({ card, options }: MenuOptionParams) {
    const mainPhase = this.context.currentPhase == "MAIN";
    const currentTurn = this.context.gameState.currentTurn;
    const hasWaited = currentTurn > card.setTurn;
    const monsterCard = card.getType().includes("MONSTER");
    const buttonTexts = this.translations["battle_scene"].battle_buttons;

    const canChangePos =
      mainPhase &&
      hasWaited &&
      !card.hasChangedPosition &&
      card.owner == "PLAYER" &&
      monsterCard;

    if (!canChangePos) return;

    if (card.isFaceDown) {
      options.push({
        label: buttonTexts.flip,
        offsetX: 70,
        action: () =>
          EventBus.emit(GameEvent.CARD_POSITION_CHANGED, {
            card: card,
            newMode: "FACE_UP",
            isFlip: true,
          }),
      });
    } else {
      const label = buttonTexts.change_pos;
      const newMode = card.angle === 0 ? "DEF" : "ATK";
      options.push({
        label,
        offsetX: 70,
        action: () =>
          EventBus.emit(GameEvent.CARD_POSITION_CHANGED, {
            card: card,
            newMode,
            isFlip: false,
          }),
      });
    }
  }

  private addAttackButton({ card, options }: MenuOptionParams) {
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
      options.push({
        label: buttonTexts.attack,
        offsetX: 70,
        action: async () => {
          await this.context.onAttackDeclared(card);
        },
      });
    }
  }

  private addActivationButton({ card, options }: MenuOptionParams) {
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
      this.pushActiveButton(options, buttonTexts.active, card);
    }
  }

  private pushActiveButton(options: MenuOption[], label: string, card: Card) {
    //right button verify
    const offsetY = options.length > 0 ? -85 : -35;
    const offsetX = options.length > 0 ? 0 : 70;

    options.push({
      label,
      offsetX,
      offsetY,
      action: async () => {
        await this.context.cardActivation(card, this.side);

        EventBus.emit(GameEvent.ACTION_FINALIZED, { card });
      },
    });
  }

  private addDetailsButton({ card, options }: MenuOptionParams) {
    const battleTexts = this.translations["battle_scene"];
    const buttonTexts = battleTexts.battle_buttons;

    //details btn always visible
    if (!card.isFaceDown || card.owner === "PLAYER") {
      options.push({
        label: buttonTexts.details,
        offsetX: -70,
        action: () => {
          this.context.getHand("PLAYER").showHand();
          new CardDetailsModal(this.context.engine, {
            cardData: card.getCardData(),
            owner: card.owner,
            originalOwner: card.originalOwner,
            location: card.location,
          });
        },
      });
    }
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
      const inputBlocker = this.context.add
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
          inputBlocker?.destroy();
          resolve(result);
        },
      ).setDepth(THEME_CONFIG.DEPTHS.BANNERS);
    });
  }
}

export interface MenuOptionParams {
  card: Card;
  options: MenuOption[];
}
