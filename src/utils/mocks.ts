import { vi } from "vitest";
import type { ToonButton } from "../objects/ToonButton";
import type { IBattleContext } from "../interfaces/IBattleContext";
import type { Card } from "../objects/Card";

interface PlaneFunction extends Phaser.GameObjects.GameObjectFactory {
  (
    x?: number,
    y?: number,
    texture?: string | Phaser.Textures.Texture,
    frame?: string | number,
    width?: number,
    height?: number,
    tile?: boolean,
  ): Phaser.GameObjects.Plane;
  mock: {
    calls: [number, number, string?][];
    results: { value: Phaser.GameObjects.Plane }[];
  };
}

export const createMockGameObject = () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  const listeners: Record<string, Function> = {};

  return {
    setViewHeight: vi.fn().mockReturnThis(),
    setInteractive: vi.fn().mockReturnThis(),
    setRectangleDropZone: vi.fn().mockReturnThis(),
    setData: vi.fn().mockReturnThis(),
    setVisible: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setAlpha: vi.fn().mockReturnThis(),
    setScale: vi.fn().mockReturnThis(),
    setX: vi.fn().mockReturnThis(),
    setY: vi.fn().mockReturnThis(),
    setStrokeStyle: vi.fn().mockReturnThis(),
    fillStyle: vi.fn().mockReturnThis(),
    fillRoundedRect: vi.fn().mockReturnThis(),
    lineStyle: vi.fn().mockReturnThis(),
    strokeRoundedRect: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    on: vi.fn((event: string, cb: Function) => {
      listeners[event] = cb;
    }),

    emit: vi.fn((event: string, ...args: unknown[]) => {
      listeners[event]?.(...args);
    }),
    removeAllListeners: vi.fn(),
    getData: vi.fn(),
    iterate: vi.fn((cb) =>
      cb({ setTint: vi.fn(), clearTint: vi.fn(), setAlpha: vi.fn() }),
    ),
    clearTint: vi.fn(),
    setTint: vi.fn(),
  };
};

export const createMockCard = (overrides: Partial<Card> = {}): Card => {
  return {
    getType: vi.fn().mockReturnValue("MONSTER"),
    getCardData: vi.fn().mockReturnValue({ manaCost: 1, atk: 1000 }),
    owner: "PLAYER",
    originalOwner: "PLAYER",
    location: "HAND",
    x: 0,
    y: 0,
    angle: 0,
    scale: 1,
    visualElements:
      createMockGameObject() as unknown as Phaser.GameObjects.Container,
    setLocation: vi.fn(),
    setPosition: vi.fn(),
    setFieldVisuals: vi.fn(),
    setFaceDown: vi.fn(),
    setFaceUp: vi.fn(),
    setDepth: vi.fn(),
    setAlpha: vi.fn(),
    setAngle: vi.fn(),
    setScale: vi.fn(),
    setOwner: vi.fn(),
    disableInteractive: vi.fn(),
    setInteractive: vi.fn(),
    removeAllListeners: vi.fn(),
    on: vi.fn(function (this: Card) {
      return this;
    }),
    resetStats: vi.fn(),
    setHandVisuals: vi.fn(),
    parentContainer: undefined,
    ...overrides,
  } as Card;
};

export const createMockBattleContext = (): IBattleContext => {
  return {
    add: {
      zone: vi
        .fn()
        .mockReturnValue({ ...createMockGameObject(), getData: undefined }),
      graphics: vi.fn().mockReturnValue(createMockGameObject()),
      existing: vi.fn(),
      container: vi.fn().mockReturnValue({ add: vi.fn(), setY: vi.fn() }),
      text: vi.fn().mockReturnValue({ setOrigin: vi.fn(), setShadow: vi.fn() }),
      image: vi.fn().mockReturnValue(createMockGameObject()),
      plane: vi.fn().mockImplementation((_x, y, texture) => {
        const plane =
          createMockGameObject() as unknown as Phaser.GameObjects.Plane;
        plane.y = y;
        plane.texture = texture;
        return plane;
      }) as unknown as PlaneFunction,
    } as unknown as Phaser.GameObjects.GameObjectFactory,
    gameState: {
      getMana: vi.fn().mockReturnValue(10),
      modifyMana: vi.fn(),
      activePlayer: "PLAYER",
      currentTurn: 1,
      getHP: vi.fn().mockReturnValue(600),
      currentPhase: "MAIN",
      isDragging: false,
      modifyHP: vi.fn(),
      setPhase: vi.fn(),
      setDragging: vi.fn(),
      nextTurn: vi.fn(),
      advanceTurnCount: vi.fn(),
    },
    currentPhase: "MAIN",
    translationText: {
      opponent: "Oponente",
      draw_phase: "Fase de compra",
      opponent_draw: "Oponente comprou",
      main_phase: "Fase principal",
      battle_phase: "Fase de batalha",
      turn_ended: "Turno finalizado",
      zone_occupied: "Zona ocupada",
      insufficient_mana: "Mana insuficiente",
      turn_label: "Turno",
      revive: "REVIVER",
      battle_buttons: {
        to_battle: "",
        end_turn: "",
        details: "",
        active: "",
        set: "",
        attack: "",
        change_pos: "",
      },
      card_types: {
        MONSTER: "MONSTRO",
        SPELL: "MAGIA",
        TRAP: "ARMADILHA",
        EFFECT_MONSTER: "MONSTRO DE EFEITO",
      },
      combat_notices: {
        select_attack_target: "",
        invalid_own_card: "",
        direct_attack: "",
      },
      effect_notices: {
        select_target: "SELECIONE O ALVO",
        invalid_target: "ALVO INVÁLIDO",
        no_target_type_found: "ESTE CEMITÉRIO NÃO POSSUI {type}!",
        no_valid_graveyard: "NENHUM ALVO VÁLIDO NO CEMITÉRIO",
        select_graveyard: "SELECIONE UM CEMITÉRIO",
        action_canceled: "AÇÃO CANCELADA",
        field_full: "CAMPO CHEIO!",
      },
    },
    tweens: {
      killTweensOf: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      add: vi.fn((config: any) => {
        if (typeof config.onComplete === "function") config.onComplete();
        if (typeof config.onStart === "function") config.onStart();
        if (config.onYoyoAll) config.onYoyoAll();
        if (config.onYoyo) config.onYoyo();
        return {
          stop: () => {},
          pause: () => {},
          play: () => {},
        } as Phaser.Tweens.Tween;
      }),
    } as unknown as Phaser.Tweens.TweenManager,
    cameras: {
      main: {
        shake: vi.fn(),
      } as unknown as Phaser.Cameras.Scene2D.Camera,
    } as unknown as Phaser.Cameras.Scene2D.CameraManager,
    getUI: vi.fn().mockReturnValue({
      updateMana: vi.fn(),
      showFieldCardMenu: vi.fn(),
      showGraveyardMenu: vi.fn(),
      updateLP: vi.fn(),
      showNotice: vi.fn(),
    }),
    executePlay: vi.fn(),
    getHand: vi.fn().mockReturnValue({
      hideHand: vi.fn(),
      showHand: vi.fn(),
      reorganizeHand: vi.fn(),
      addCardBack: vi.fn(),
    }),
    combat: {
      isSelectingTarget: false,
      currentAttacker: null,
      isAnimating: false,
      handleCardSelection: vi.fn(),
      prepareTargeting: vi.fn(),
      destroyCard: vi.fn(),
      cancelTarget: vi.fn(),
    },
    effects: {
      isSelectingTarget: false,
      handleCardSelection: vi.fn(),
      applyCardEffect: vi.fn(),
      prepareTargeting: vi.fn(),
      cancelTargeting: vi.fn(),
      onGraveyardClicked: vi.fn(),
    },
    engine: {
      scene: { launch: vi.fn() } as unknown as Phaser.Scenes.ScenePlugin,
    } as unknown as Phaser.Scene,
    controls: {
      setupGlobalInputs: vi.fn(),
      setupCardInteractions: vi.fn(),
      isSelectionLocked: vi.fn(),
    },
    npcAction: {
      executeTurn: vi.fn(),
    },
    field: {
      monsterSlots: {
        PLAYER: [null, null, null],
        OPPONENT: [null, null, null],
      },
      spellSlots: {
        PLAYER: [null, null, null],
        OPPONENT: [null, null, null],
      },
      graveyardSlot: { PLAYER: [], OPPONENT: [] },
      setupFieldZones: vi.fn(),
      getFirstAvailableSlot: vi.fn(),
      occupySlot: vi.fn(),
      releaseSlot: vi.fn(),
      getValidSlotToPlay: vi.fn(),
      validatePlay: vi.fn(),
      playCardToZone: vi.fn(),
      previewPlacement: vi.fn(),
      moveToGraveyard: vi.fn(),
      resetAttackFlags: vi.fn(),
    },
    time: {
      delayedCall: vi.fn((_, cb) => {
        if (typeof cb === "function") cb();
      }),
    } as unknown as Phaser.Time.Clock,
    phaseButton: {} as unknown as ToonButton,
    selectedCard: null,
    getDeck: vi.fn(),
    handlePlayerCard: vi.fn(),
    cancelPlacement: vi.fn(),
    setPhase: vi.fn(),
    finalizeTurnTransition: vi.fn(),
    handleCardDrop: vi.fn(),
    cardActivation: vi.fn(),
    onAttackDeclared: vi.fn(),
    clearAllMenus: vi.fn(),
  };
};
