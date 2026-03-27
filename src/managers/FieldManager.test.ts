import { describe, it, expect, vi, beforeEach } from "vitest";
import { FieldManager } from "./FieldManager";
import type { IBattleContext } from "../interfaces/IBattleContext";
import type { Card } from "../objects/Card";
import { createMockBattleContext, createMockCard, createMockGameObject } from "../utils/mocks";
import { Logger } from "../utils/Logger";

describe("FieldManager", () => {
  let fieldManager: FieldManager;
  let mockContext: IBattleContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = createMockBattleContext();
    fieldManager = new FieldManager(mockContext);
  });

  it("setupFieldZones cria zonas para ambos os lados", () => {
    fieldManager.setupFieldZones();
    expect(mockContext.add.zone).toHaveBeenCalled();
  });

  it("getFirstAvailableSlot retorna o primeiro slot livre", () => {
    fieldManager.monsterSlots.PLAYER = [null, createMockCard(), null];
    const slot = fieldManager.getFirstAvailableSlot("PLAYER", "MONSTER");
    expect(slot).toBeTruthy();
    expect(slot?.index).toBe(0);
  });

  it("getFirstAvailableSlot retorna null se não houver slot", () => {
    fieldManager.monsterSlots.PLAYER = [
      createMockCard(),
      createMockCard(),
      createMockCard(),
    ];
    const slot = fieldManager.getFirstAvailableSlot("PLAYER", "MONSTER");
    expect(slot).toBeNull();
  });

  it("occupySlot preenche o slot correto", () => {
    const card = createMockCard();
    fieldManager.occupySlot("PLAYER", "MONSTER", 1, card);
    expect(fieldManager.monsterSlots.PLAYER[1]).toBe(card);
    fieldManager.occupySlot("PLAYER", "SPELL", 2, card);
    expect(fieldManager.spellSlots.PLAYER[2]).toBe(card);
  });

  it("releaseSlot libera o slot correto", () => {
    const card = createMockCard();
    fieldManager.monsterSlots.PLAYER[1] = card;
    fieldManager.releaseSlot(card, "PLAYER");
    expect(fieldManager.monsterSlots.PLAYER[1]).toBeNull();
  });

  it("getValidSlotToPlay retorna válido para carta e slot disponíveis", () => {
    const card = createMockCard();
    const result = fieldManager.getValidSlotToPlay(card, "PLAYER", "MONSTER");
    expect(result.valid).toBe(true);
    expect(result.slot).toBeDefined();
  });

  it("getValidSlotToPlay retorna inválido para tipo incompatível", () => {
    const card = createMockCard({ getType: vi.fn().mockReturnValue("SPELL") });
    const result = fieldManager.getValidSlotToPlay(card, "PLAYER", "MONSTER");
    expect(result.valid).toBe(false);
  });

  it("getValidSlotToPlay retorna inválido se mana insuficiente", () => {
    const card = createMockCard({
      getCardData: vi.fn().mockReturnValue({ manaCost: 20 }),
    });
    const result = fieldManager.getValidSlotToPlay(card, "PLAYER", "MONSTER");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("MANA");
  });

  it("getValidSlotToPlay retorna inválido se não for fase MAIN", () => {
    mockContext.currentPhase = "BATTLE";
    const card = createMockCard();
    const result = fieldManager.getValidSlotToPlay(card, "PLAYER", "MONSTER");
    expect(result.valid).toBe(false);
  });

  it("validatePlay bloqueia jogada em zona do oponente", () => {
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

  it("validatePlay retorna mana insuficiente", () => {
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

  it("validatePlay retorna slot ocupado", () => {
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

  it("playCardToZone executa animação", () => {
    const card = createMockCard();
    fieldManager.playCardToZone(card, 100, 100, "ATK");
    expect(mockContext.cameras.main.shake).toHaveBeenCalled();
    expect(card.setLocation).toHaveBeenCalledWith("FIELD", 1);
  });

  it("previewPlacement executa animação de preview", () => {
    const card = createMockCard();
    fieldManager.previewPlacement(card, 50, 50);
    expect(card.setDepth).toHaveBeenCalled();
    expect(mockContext.tweens.add).toHaveBeenCalled();
  });

  it("moveToGraveyard move carta e executa animação", () => {
    const card = createMockCard();
    fieldManager.moveToGraveyard(card);
    expect(fieldManager.graveyardSlot.PLAYER[0]).toBe(card);
    expect(card.setLocation).toHaveBeenCalledWith("GRAVEYARD");
    expect(card.resetStats).toHaveBeenCalled();
    expect(card.setDepth).toHaveBeenCalled();
  });

  it("setupFieldInteractions ativa interações corretas para FIELD", () => {
    const card = createMockCard({ location: "FIELD" });
    fieldManager["setupFieldInteractions"](card as Card);
    const onMock = card.on as ReturnType<typeof vi.fn> & {
      mock?: { calls: Array<[string, (...args: unknown[]) => void]> };
    };
    const call = onMock.mock?.calls.find(
      (call: [string, (...args: unknown[]) => void]) =>
        call[0] === "pointerdown",
    );
    if (call) {
      const clickHandler = call[1];
      clickHandler();
      expect(
        mockContext.getUI(card.owner).showFieldCardMenu,
      ).toHaveBeenCalled();
      expect(mockContext.getHand("PLAYER").hideHand).toHaveBeenCalled();
    }
  });

  it("setupFieldInteractions ativa interações corretas para GRAVEYARD", () => {
    const card = createMockCard({ location: "GRAVEYARD" });
    fieldManager["setupFieldInteractions"](card as Card);
    const onMock = card.on as ReturnType<typeof vi.fn> & {
      mock?: { calls: Array<[string, (...args: unknown[]) => void]> };
    };
    const call = onMock.mock?.calls.find(
      (call: [string, (...args: unknown[]) => void]) =>
        call[0] === "pointerdown",
    );
    if (call) {
      const clickHandler = call[1];
      clickHandler();
      expect(
        mockContext.getUI(card.owner).showGraveyardMenu,
      ).toHaveBeenCalled();
    }
  });

  it("setupFieldInteractions ativa seleção de alvo de combate", () => {
    const card = createMockCard({ location: "FIELD" });
    mockContext.combat.isSelectingTarget = true;
    fieldManager["setupFieldInteractions"](card as Card);
    const onMock = card.on as ReturnType<typeof vi.fn> & {
      mock?: { calls: Array<[string, (...args: unknown[]) => void]> };
    };
    const call = onMock.mock?.calls.find(
      (call: [string, (...args: unknown[]) => void]) =>
        call[0] === "pointerdown",
    );
    if (call) {
      const clickHandler = call[1];
      clickHandler();
      expect(mockContext.combat.handleCardSelection).toHaveBeenCalledWith(card);
    }
  });

  it("setupFieldInteractions ativa seleção de alvo de efeito", () => {
    const card = createMockCard({ location: "FIELD" });
    mockContext.effects.isSelectingTarget = true;
    fieldManager["setupFieldInteractions"](card as Card);
    const onMock = card.on as ReturnType<typeof vi.fn> & {
      mock?: { calls: Array<[string, (...args: unknown[]) => void]> };
    };
    const call = onMock.mock?.calls.find(
      (call: [string, (...args: unknown[]) => void]) =>
        call[0] === "pointerdown",
    );
    if (call) {
      const clickHandler = call[1];
      clickHandler();
      expect(mockContext.effects.handleCardSelection).toHaveBeenCalledWith(
        card,
      );
    }
  });

  it("setupFieldInteractions lida com local desconhecido", () => {
    const card = createMockCard({
      location: "UNKNOWN" as unknown as Card["location"],
    });
    const spy = vi.spyOn(Logger, "warn").mockImplementation(() => {});
    fieldManager["setupFieldInteractions"](card as Card);
    const onMock = card.on as ReturnType<typeof vi.fn> & {
      mock?: { calls: Array<[string, (...args: unknown[]) => void]> };
    };
    const call = onMock.mock?.calls.find(
      (call: [string, (...args: unknown[]) => void]) =>
        call[0] === "pointerdown",
    );
    if (call) {
      const clickHandler = call[1];
      clickHandler();
      expect(spy).toHaveBeenCalledWith("card without local", { card });
    }
    spy.mockRestore();
  });

  it("resetAttackFlags reseta flags de todos monstros", () => {
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
