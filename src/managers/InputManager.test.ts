/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { InputManager } from "./InputManager";
import type { IBattleContext } from "../interfaces/IBattleContext";
import { createMockBattleContext, createMockCard } from "../utils/mocks";

describe("InputManager", () => {
  let context: IBattleContext;
  let manager: InputManager;

  beforeEach(() => {
    context = createMockBattleContext();
    const keyboardOnMock = vi.fn();

    context.engine.input = {
      on: vi.fn(),
      keyboard: {
        on: keyboardOnMock,
      },
      setDraggable: vi.fn(),
      setDragState: vi.fn(),
    } as unknown as Phaser.Input.InputPlugin;

    manager = new InputManager(context);
  });

  describe("setupGlobalInputs", () => {
    it("should register pointerdown listener", () => {
      manager.setupGlobalInputs();

      expect(context.engine.input.on).toHaveBeenCalledWith(
        "pointerdown",
        expect.any(Function),
      );
    });

    it("should handle click on empty space and reset UI", () => {
      manager.setupGlobalInputs();
      const input = context.engine.input!;
      const onMock = input.on as unknown as ReturnType<typeof vi.fn>;

      const callback = onMock.mock.calls[0][1] as (
        pointer: Phaser.Input.Pointer,
        currentlyOver: Phaser.GameObjects.GameObject[],
      ) => void;

      callback({ x: 100, y: 200 } as Phaser.Input.Pointer, []);

      expect(context.cancelPlacement).toHaveBeenCalled();
      expect(context.clearAllMenus).toHaveBeenCalled();
      expect(context.getHand).toHaveBeenCalledWith("PLAYER");
    });

    it("should cancel effect targeting when clicking empty space", () => {
      context.effects.isSelectingTarget = true;

      manager.setupGlobalInputs();
      const input = context.engine.input!;
      const onMock = input.on as unknown as ReturnType<typeof vi.fn>;

      const callback = onMock.mock.calls[0][1] as (
        pointer: Phaser.Input.Pointer,
        currentlyOver: Phaser.GameObjects.GameObject[],
      ) => void;

      callback({} as Phaser.Input.Pointer, []);

      expect(context.effects.cancelTargeting).toHaveBeenCalled();
    });

    it("should cancel combat target during battle phase", () => {
      context.currentPhase = "BATTLE";

      manager.setupGlobalInputs();
      const input = context.engine.input!;
      const onMock = input.on as unknown as ReturnType<typeof vi.fn>;

      const callback = onMock.mock.calls[0][1] as (
        pointer: Phaser.Input.Pointer,
        currentlyOver: Phaser.GameObjects.GameObject[],
      ) => void;

      callback({} as Phaser.Input.Pointer, []);

      expect(context.combat.cancelTarget).toHaveBeenCalled();
    });

    it("should do nothing if selection is locked", () => {
      context.effects.isSelectingTarget = true;
      context.selectedCard = createMockCard();
      const keyboard = context.engine.input.keyboard!;
      const onMock = keyboard.on as unknown as ReturnType<typeof vi.fn>;

      manager.setupGlobalInputs();

      const callback = onMock.mock.calls[0][1] as (
        pointer: Phaser.Input.Pointer,
        currentlyOver: Phaser.GameObjects.GameObject[],
      ) => void;

      callback({} as Phaser.Input.Pointer, []);

      expect(context.cancelPlacement).not.toHaveBeenCalled();
    });

    it("should handle SPACE key press", () => {
      manager.setupGlobalInputs();
      const keyboard = context.engine.input.keyboard!;
      const onMock = keyboard.on as unknown as ReturnType<typeof vi.fn>;

      const calls = onMock.mock.calls;
      const spaceHandler = calls.find(
        ([event]) => event === "keydown-SPACE",
      )?.[1];

      spaceHandler?.();

      expect(context.handlePlayerCard).toHaveBeenCalled();
    });

    it("should handle ESC key press", () => {
      manager.setupGlobalInputs();
      const keyboard = context.engine.input.keyboard!;
      const onMock = keyboard.on as unknown as ReturnType<typeof vi.fn>;

      const calls = onMock.mock.calls;

      const escHandler = calls.find(([event]) => event === "keydown-ESC")?.[1];

      escHandler?.();

      expect(context.cancelPlacement).toHaveBeenCalled();
    });

    it("should cancel combat on ESC during battle phase", () => {
      context.currentPhase = "BATTLE";

      manager.setupGlobalInputs();
      const keyboard = context.engine.input.keyboard!;
      const onMock = keyboard.on as unknown as ReturnType<typeof vi.fn>;

      const calls = onMock.mock.calls;
      const escHandler = calls.find(([event]) => event === "keydown-ESC")?.[1];

      escHandler?.();

      expect(context.combat.cancelTarget).toHaveBeenCalled();
    });

    it("should advance turn on T key", () => {
      manager.setupGlobalInputs();
      const keyboard = context.engine.input.keyboard!;
      const onMock = keyboard.on as unknown as ReturnType<typeof vi.fn>;

      const calls = onMock.mock.calls;
      const tHandler = calls.find(([event]) => event === "keydown-T")?.[1];

      tHandler?.();

      expect(context.gameState.nextTurn).toHaveBeenCalled();
      expect(context.setPhase).toHaveBeenCalledWith("DRAW");
    });
  });

  describe("setupCardInteractions", () => {
    it("should make card interactive and draggable", () => {
      const card = createMockCard();

      manager.setupCardInteractions(card);

      expect(card.setInteractive).toHaveBeenCalledWith({ draggable: true });
      expect(context.engine.input.setDraggable).toHaveBeenCalledWith(card);
    });

    it("should register hover events", () => {
      const card = createMockCard();

      manager.setupCardInteractions(card);

      expect(card.on).toHaveBeenCalledWith("pointerover", expect.any(Function));

      expect(card.on).toHaveBeenCalledWith("pointerout", expect.any(Function));
    });
    it("should NOT reset card on pointerout if dragging", () => {
      const card = createMockCard();
      context.gameState.setDragging(true);

      const events: Record<string, Function> = {};

      card.on = vi.fn().mockImplementation(function (
        this: unknown,
        event: string,
        cb: Function,
      ) {
        events[event] = cb;
        return this;
      });

      manager.setupCardInteractions(card);

      events["pointerout"]();

      expect(context.tweens.add).not.toHaveBeenCalled();
    });
  });

  describe("setupDragEvents", () => {
    it("should block dragstart if not in MAIN phase", () => {
      const card = createMockCard();
      context.currentPhase = "BATTLE";

      const events: Record<string, Function> = {};

      card.on = vi.fn().mockImplementation(function (
        this: unknown,
        event: string,
        cb: Function,
      ) {
        events[event] = cb;
        return this;
      });

      manager.setupDragEvents(card);

      events["dragstart"]({} as Phaser.Input.Pointer);

      expect(context.engine.input.setDragState).toHaveBeenCalled();
    });

    it("should block dragstart if selection is locked", () => {
      const card = createMockCard();

      context.effects.isSelectingTarget = true;
      context.selectedCard = createMockCard();

      const events: Record<string, Function> = {};

      card.on = vi.fn().mockImplementation(function (
        this: unknown,
        event: string,
        cb: Function,
      ) {
        events[event] = cb;
        return this;
      });

      manager.setupDragEvents(card);

      events["dragstart"]({} as Phaser.Input.Pointer);

      expect(context.engine.input.setDragState).toHaveBeenCalled();
    });

    it("should start dragging correctly", () => {
      const card = createMockCard();

      const events: Record<string, Function> = {};

      card.on = vi.fn().mockImplementation(function (
        this: unknown,
        event: string,
        cb: Function,
      ) {
        events[event] = cb;
        return this;
      });

      manager.setupDragEvents(card);

      events["dragstart"]({} as Phaser.Input.Pointer);

      expect(context.gameState.setDragging).toHaveBeenCalledWith(true);
      expect(context.tweens.killTweensOf).toHaveBeenCalled();
    });

    it("should update position on drag", () => {
      const card = createMockCard();

      const events: Record<string, Function> = {};

      card.on = vi.fn().mockImplementation(function (
        this: unknown,
        event: string,
        cb: Function,
      ) {
        events[event] = cb;
        return this;
      });

      manager.setupDragEvents(card);

      events["drag"]({} as Phaser.Input.Pointer, 50, 60);

      expect(card.setPosition).toHaveBeenCalledWith(50, 60);
    });

    it("should reset dragging on dragend", () => {
      const card = createMockCard();

      const events: Record<string, Function> = {};

      card.on = vi.fn().mockImplementation(function (
        this: unknown,
        event: string,
        cb: Function,
      ) {
        events[event] = cb;
        return this;
      });

      manager.setupDragEvents(card);

      events["dragend"]({} as Phaser.Input.Pointer, false);

      expect(context.gameState.setDragging).toHaveBeenCalledWith(false);
    });

    it("should NOT handle drop if selection is locked", () => {
      const card = createMockCard();

      context.effects.isSelectingTarget = true;
      context.selectedCard = createMockCard();

      const events: Record<string, Function> = {};

      card.on = vi.fn().mockImplementation(function (
        this: unknown,
        event: string,
        cb: Function,
      ) {
        events[event] = cb;
        return this;
      });

      manager.setupDragEvents(card);

      const zone = {} as Phaser.GameObjects.Zone;

      events["drop"]({} as Phaser.Input.Pointer, zone);

      expect(context.handleCardDrop).not.toHaveBeenCalled();
    });

    it("should reorganize hand if not dropped", () => {
      const card = createMockCard();

      const events: Record<string, Function> = {};

      card.on = vi.fn().mockImplementation(function (
        this: unknown,
        event: string,
        cb: Function,
      ) {
        events[event] = cb;
        return this;
      });

      manager.setupDragEvents(card);

      events["dragend"]({} as Phaser.Input.Pointer, false);

      expect(context.getHand("PLAYER").reorganizeHand).toHaveBeenCalled();
    });

    it("should handle drop event", () => {
      const card = createMockCard();

      const events: Record<string, Function> = {};

      card.on = vi.fn().mockImplementation(function (
        this: unknown,
        event: string,
        cb: Function,
      ) {
        events[event] = cb;
        return this;
      });

      manager.setupDragEvents(card);

      const zone = {} as Phaser.GameObjects.Zone;

      events["drop"]({} as Phaser.Input.Pointer, zone);

      expect(context.handleCardDrop).toHaveBeenCalledWith(zone, card);
    });
  });
  describe("isSelectionLocked", () => {
    it("should return true when selecting target and has selected card", () => {
      context.effects.isSelectingTarget = true;
      context.selectedCard = createMockCard();

      expect(manager.isSelectionLocked()).toBe(true);
    });

    it("should return false when not selecting target", () => {
      context.effects.isSelectingTarget = false;
      context.selectedCard = createMockCard();

      expect(manager.isSelectionLocked()).toBe(false);
    });
  });
  describe("hover behavior", () => {
    it("should block hover when dragging", () => {
      const card = createMockCard();
      context.gameState.setDragging(true);

      const events: Record<string, Function> = {};

      card.on = vi.fn().mockImplementation(function (
        this: unknown,
        event: string,
        cb: Function,
      ) {
        events[event] = cb;
        return this;
      });

      manager.setupCardInteractions(card);

      events["pointerover"]();

      expect(context.tweens.add).not.toHaveBeenCalled();
    });

    it("should block hover when selection is locked", () => {
      const card = createMockCard();

      context.effects.isSelectingTarget = true;
      context.selectedCard = createMockCard();

      const events: Record<string, Function> = {};

      card.on = vi.fn().mockImplementation(function (
        this: unknown,
        event: string,
        cb: Function,
      ) {
        events[event] = cb;
        return this;
      });

      manager.setupCardInteractions(card);

      events["pointerover"]();

      expect(context.tweens.add).not.toHaveBeenCalled();
    });

    it("should execute hover normally", () => {
      const card = createMockCard();

      const events: Record<string, Function> = {};

      card.on = vi.fn().mockImplementation(function (
        this: unknown,
        event: string,
        cb: Function,
      ) {
        events[event] = cb;
        return this;
      });

      manager.setupCardInteractions(card);

      events["pointerover"]();

      expect(context.tweens.add).toHaveBeenCalled();
      expect(card.setDepth).toHaveBeenCalledWith(200);
    });
  });
});
