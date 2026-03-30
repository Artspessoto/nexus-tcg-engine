import { describe, it, expect, vi, beforeEach } from "vitest";
import { FieldManager } from "./FieldManager";
import type { IBattleContext } from "../interfaces/IBattleContext";
import type { Card } from "../objects/Card";
import {
  createMockBattleContext,
  createMockCard,
  createMockGameObject,
} from "../utils/Mocks";
import { EventBus } from "../events/EventBus";
import { GameEvent } from "../events/GameEvents";

describe("FieldManager", () => {
  let fieldManager: FieldManager;
  let mockContext: IBattleContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = createMockBattleContext();
    fieldManager = new FieldManager(mockContext);
  });

  it("setupFieldZones creates zones for both sides", () => {
    fieldManager.setupFieldZones();
    expect(mockContext.add.zone).toHaveBeenCalled();
  });

  it("getFirstAvailableSlot returns first available slot", () => {
    fieldManager.monsterSlots.PLAYER = [null, createMockCard(), null];

    const slot = fieldManager.getFirstAvailableSlot("PLAYER", "MONSTER");

    expect(slot).toBeTruthy();
    expect(slot?.index).toBe(0);
  });

  it("getFirstAvailableSlot returns null if no slot is available", () => {
    fieldManager.monsterSlots.PLAYER = [
      createMockCard(),
      createMockCard(),
      createMockCard(),
    ];

    const slot = fieldManager.getFirstAvailableSlot("PLAYER", "MONSTER");

    expect(slot).toBeNull();
  });

  it("occupySlot fills the correct slot", () => {
    const card = createMockCard();

    fieldManager.occupySlot("PLAYER", "MONSTER", 1, card);
    expect(fieldManager.monsterSlots.PLAYER[1]).toBe(card);

    fieldManager.occupySlot("PLAYER", "SPELL", 2, card);
    expect(fieldManager.spellSlots.PLAYER[2]).toBe(card);
  });

  it("releaseSlot frees the correct slot", () => {
    const card = createMockCard();

    fieldManager.monsterSlots.PLAYER[1] = card;
    fieldManager.releaseSlot(card, "PLAYER");

    expect(fieldManager.monsterSlots.PLAYER[1]).toBeNull();
  });

  it("getValidSlotToPlay returns valid for compatible card and available slot", () => {
    const card = createMockCard();

    const result = fieldManager.getValidSlotToPlay(card, "PLAYER", "MONSTER");

    expect(result.valid).toBe(true);
    expect(result.slot).toBeDefined();
  });

  it("getValidSlotToPlay returns invalid for incompatible type", () => {
    const card = createMockCard({
      getType: vi.fn().mockReturnValue("SPELL"),
    });

    const result = fieldManager.getValidSlotToPlay(card, "PLAYER", "MONSTER");

    expect(result.valid).toBe(false);
  });

  it("getValidSlotToPlay returns invalid when mana is insufficient", () => {
    const card = createMockCard({
      getCardData: vi.fn().mockReturnValue({ manaCost: 20 }),
    });

    const result = fieldManager.getValidSlotToPlay(card, "PLAYER", "MONSTER");

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("MANA");
  });

  it("getValidSlotToPlay returns invalid when phase is not MAIN", () => {
    mockContext.currentPhase = "BATTLE";

    const card = createMockCard();

    const result = fieldManager.getValidSlotToPlay(card, "PLAYER", "MONSTER");

    expect(result.valid).toBe(false);
  });

  it("validatePlay blocks play on opponent zone", () => {
    const card = createMockCard();

    const zone = {
      ...createMockGameObject(),
      getData: (key: string) => (key === "side" ? "OPPONENT" : "MONSTER"),
    };

    const result = fieldManager.validatePlay(
      card,
      zone as unknown as Phaser.GameObjects.Zone,
    );

    expect(result.valid).toBe(false);
  });

  it("validatePlay returns mana error", () => {
    const card = createMockCard({
      getCardData: vi.fn().mockReturnValue({ manaCost: 20 }),
    });

    const zone = {
      ...createMockGameObject(),
      getData: (key: string) => (key === "side" ? "PLAYER" : "MONSTER"),
    };

    const result = fieldManager.validatePlay(
      card,
      zone as unknown as Phaser.GameObjects.Zone,
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("MANA");
  });

  it("validatePlay returns slot occupied error", () => {
    fieldManager.monsterSlots.PLAYER = [
      createMockCard(),
      createMockCard(),
      createMockCard(),
    ];

    const card = createMockCard();

    const zone = {
      ...createMockGameObject(),
      getData: (key: string) => (key === "side" ? "PLAYER" : "MONSTER"),
    };

    const result = fieldManager.validatePlay(
      card,
      zone as unknown as Phaser.GameObjects.Zone,
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("SLOT");
  });

  it("playCardToZone triggers animation and sets location", () => {
    const card = createMockCard();

    fieldManager.playCardToZone(card, 100, 100, "ATK");

    expect(mockContext.cameras.main.shake).toHaveBeenCalled();
    expect(card.setLocation).toHaveBeenCalledWith("FIELD", 1);
  });

  it("previewPlacement triggers preview animation", () => {
    const card = createMockCard();

    fieldManager.previewPlacement(card, 50, 50);

    expect(card.setDepth).toHaveBeenCalled();
    expect(mockContext.tweens.add).toHaveBeenCalled();
  });

  it("moveToGraveyard moves card and triggers animation", () => {
    const card = createMockCard();

    fieldManager.moveToGraveyard(card);

    expect(fieldManager.graveyardSlot.PLAYER[0]).toBe(card);
    expect(card.setLocation).toHaveBeenCalledWith("GRAVEYARD");
    expect(card.resetStats).toHaveBeenCalled();
    expect(card.setDepth).toHaveBeenCalled();
  });

  it("setupFieldInteractions emits FIELD_CARD_CLICKED event on pointerdown", () => {
    const card = createMockCard();

    const emitSpy = vi.spyOn(EventBus, "emit");

    fieldManager["setupFieldInteractions"](card as Card);

    const onMock = card.on as ReturnType<typeof vi.fn> & {
      mock?: { calls: Array<[string, (...args: unknown[]) => void]> };
    };

    const call = onMock.mock?.calls.find(
      (call: [string, (...args: unknown[]) => void]) =>
        call[0] === "pointerdown",
    );

    expect(call).toBeTruthy();

    if (call) {
      const clickHandler = call[1];
      clickHandler();

      expect(emitSpy).toHaveBeenCalledWith(GameEvent.FIELD_CARD_CLICKED, {
        card,
      });
    }

    emitSpy.mockRestore();
  });

  it("resetAttackFlags resets all monster flags", () => {
    const card = createMockCard({
      hasAttacked: true,
      hasChangedPosition: true,
      setAlpha: vi.fn(),
    });

    fieldManager.monsterSlots.PLAYER[0] = card;

    fieldManager.resetAttackFlags();

    expect(card.hasAttacked).toBe(false);
    expect(card.hasChangedPosition).toBe(false);
    expect(card.setAlpha).toHaveBeenCalledWith(1);
  });
});
