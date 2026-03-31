import { describe, it, expect, vi, beforeEach } from "vitest";
import { HandManager } from "./HandManager";
import type { IBattleContext } from "../interfaces/IBattleContext";
import type { GameSide } from "../types/GameTypes";
import { createMockBattleContext, createMockCard } from "../utils/Mocks";
import { EventBus } from "../events/EventBus";
import { GameEvent } from "../events/GameEvents";
import type { CardData } from "../types/CardTypes";

const MOCK_CARD_DATA: CardData = {
  id: "test-card",
  type: "MONSTER",
  nameKey: "Test Monster",
  descriptionKey: "Description",
  manaCost: 2,
  atk: 10,
  def: 10,
  imageKey: "test_image",
  width: 300,
  height: 400,
};

vi.mock("../objects/Card", () => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    Card: vi.fn().mockImplementation(function (..._args) {
      return createMockCard();
    }),
  };
});

describe("HandManager", () => {
  let handManager: HandManager;
  let mockContext: IBattleContext;
  let mockSide: GameSide;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSide = "PLAYER";
    mockContext = createMockBattleContext();
    handManager = new HandManager(mockContext, mockSide);
  });

  it("should add a card to hand when drawCard is called", () => {
    handManager.hand = [];

    vi.spyOn(
      handManager as unknown as { getRandomCardData: () => unknown },
      "getRandomCardData",
    ).mockReturnValue({
      id: "1",
      name: "Test",
      manaCost: 1,
    });

    const spy = vi.spyOn(handManager, "animateCardEntry");

    handManager.drawCard({ x: 0, y: 0 }, MOCK_CARD_DATA);

    expect(handManager.hand.length).toBe(1);
    expect(spy).toHaveBeenCalled();
  });

  it("should not add card when hand is full", () => {
    (handManager as unknown as { maxHandSize: number }).maxHandSize = 1;
    handManager.hand = [createMockCard()];

    handManager.drawCard({ x: 0, y: 0 }, MOCK_CARD_DATA);

    expect(handManager.hand.length).toBe(1);
  });

  it("hideHand should update currentHandY and reorganize hand", () => {
    const spy = vi.spyOn(handManager, "reorganizeHand");

    handManager.hideHand();

    expect(
      (handManager as unknown as { currentHandY: number }).currentHandY,
    ).toBe((handManager as unknown as { hiddenY: number }).hiddenY);

    expect(spy).toHaveBeenCalled();
  });

  it("showHand should update currentHandY and reorganize hand", () => {
    const spy = vi.spyOn(HandManager.prototype, "reorganizeHand");

    handManager.showHand();

    expect(
      (handManager as unknown as { currentHandY: number }).currentHandY,
    ).toBe((handManager as unknown as { normalY: number }).normalY);

    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });

  it("animateCardEntry should animate card appearance", () => {
    const card = createMockCard();

    handManager.animateCardEntry(card);

    expect(card.setAngle).toHaveBeenCalledWith(-22);
    expect(card.setAlpha).toHaveBeenCalledWith(0);
    expect(mockContext.tweens.add).toHaveBeenCalled();
  });

  it("reorganizeHand should animate all cards in hand", () => {
    const card1 = createMockCard();
    const card2 = createMockCard();

    handManager.hand = [card1, card2];

    handManager.reorganizeHand();

    expect(mockContext.tweens.add).toHaveBeenCalled();
    expect(card1.setDepth).toHaveBeenCalled();
    expect(card2.setDepth).toHaveBeenCalled();
  });

  it("reorganizeHand should not fail when hand is empty", () => {
    handManager.hand = [];

    expect(() => handManager.reorganizeHand()).not.toThrow();
  });

  it("removeCard should remove a card from hand", () => {
    const card1 = createMockCard();
    const card2 = createMockCard();

    handManager.hand = [card1, card2];

    handManager.removeCard(card1);

    expect(handManager.hand).not.toContain(card1);
    expect(handManager.hand).toContain(card2);
  });

  it("addCardBack should restore card visuals and add it back to hand", () => {
    const card = createMockCard();

    handManager.hand = [];

    handManager.addCardBack(card);

    expect(mockContext.tweens.killTweensOf).toHaveBeenCalledWith(card);
    expect(card.setHandVisuals).toHaveBeenCalled();
    expect(card.visualElements.setScale).toHaveBeenCalledWith(1);
    expect(card.visualElements.setY).toHaveBeenCalledWith(0);
    expect(card.removeAllListeners).toHaveBeenCalled();
    expect(handManager.hand).toContain(card);
  });

  it("addCardBack should set card face down when owner is opponent", () => {
    const opponentManager = new HandManager(mockContext, "OPPONENT");

    const card = createMockCard({ owner: "OPPONENT" });

    opponentManager.addCardBack(card);

    expect(card.setFaceDown).toHaveBeenCalled();
    expect(card.disableInteractive).toHaveBeenCalled();
  });

  it("getRandomCardData should return a card from database", () => {
    const data = handManager.getRandomCardData();

    expect(data).toBeDefined();
  });

  it("drawCard should create facedown card for opponent", () => {
    const opponentManager = new HandManager(mockContext, "OPPONENT");

    vi.spyOn(
      opponentManager as unknown as { getRandomCardData: () => unknown },
      "getRandomCardData",
    ).mockReturnValue({
      id: "2",
      name: "EnemyCard",
      manaCost: 1,
    });

    opponentManager.drawCard({ x: 0, y: 0 }, MOCK_CARD_DATA);

    const card = opponentManager.hand[0];

    expect(card.setFaceDown).toHaveBeenCalled();
    expect(card.disableInteractive).toHaveBeenCalled();
  });

  it("should show player hand when phase changes (MAIN)", () => {
    const spy = vi.spyOn(handManager, "showHand");

    EventBus.emit(GameEvent.PHASE_CHANGED, {
      newPhase: "MAIN",
      activePlayer: "PLAYER",
    });

    expect(spy).toHaveBeenCalled();
  });

  it("should show player hand when card is played by same side", () => {
    const spy = vi.spyOn(handManager, "showHand");
    const card = createMockCard();

    EventBus.emit(GameEvent.CARD_PLAYED, {
      card,
      mode: "ATK",
      side: "PLAYER",
    });

    expect(spy).toHaveBeenCalled();
  });

  it("should hide hand when attack targeting starts", () => {
    const spy = vi.spyOn(handManager, "hideHand");
    const card = createMockCard();

    EventBus.emit(GameEvent.TARGETING_STARTED, {
      source: card,
      type: "ATTACK",
    });

    expect(spy).toHaveBeenCalled();
  });

  it("should show hand when attack is canceled", () => {
    const spy = vi.spyOn(handManager, "showHand");
    const card = createMockCard();

    EventBus.emit(GameEvent.ATTACK_CANCELED, { attacker: card });

    expect(spy).toHaveBeenCalled();
  });

  it("should show hand when battle resolves", () => {
    const spy = vi.spyOn(handManager, "showHand");
    const card1 = createMockCard();
    const card2 = createMockCard();

    EventBus.emit(GameEvent.BATTLE_RESOLVED, {
      attacker: card1,
      target: card2,
      damage: 10,
      winner: card1,
    });

    expect(spy).toHaveBeenCalled();
  });

  it("should show hand when direct attack happens", () => {
    const spy = vi.spyOn(handManager, "showHand");
    const card1 = createMockCard();

    EventBus.emit(GameEvent.DIRECT_ATTACK, {
      attacker: card1,
      targetSide: "OPPONENT",
      damage: 15,
    });

    expect(spy).toHaveBeenCalled();
  });
});
