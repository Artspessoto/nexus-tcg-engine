import { describe, it, expect, vi, beforeEach } from "vitest";
import { LAYOUT_CONFIG } from "../../constants/LayoutConfig";
import { THEME_CONFIG } from "../../constants/ThemeConfig";
import { DeckManager } from "./DeckManager";
import { createMockBattleContext, createMockCard } from "../../utils/Mocks";
import type { IBattleContext } from "../../interfaces/IBattleContext";
import { EventBus } from "../../events/EventBus";
import { GameEvent } from "../../events/GameEvents";

describe("DeckManager", () => {
  let deckManager: DeckManager;
  let mockContext: IBattleContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = createMockBattleContext();
    vi.mocked(mockContext.gameState.getDeckCount).mockReturnValue(20);

    deckManager = new DeckManager(mockContext, "PLAYER");
  });

  describe("Initialization", () => {
    it("should create a new DeckManager instance", () => {
      expect(deckManager.context).toEqual(mockContext);
      expect(deckManager.side).toEqual("PLAYER");
      expect(deckManager.position).toEqual(LAYOUT_CONFIG.DECK.PLAYER);
    });

    it("should return the correct deck position", () => {
      expect(deckManager.position).toEqual(LAYOUT_CONFIG.DECK.PLAYER);
    });
  });

  describe("Visual Creation", () => {
    it("should create the deck visual correctly with 9 cards and a counter", () => {
      const planeMock = vi.mocked(mockContext.engine.add.plane);
      deckManager.createDeckVisual();

      expect(mockContext.add.plane).toHaveBeenCalledTimes(9);

      expect(mockContext.engine.add.container).toHaveBeenCalledWith(
        LAYOUT_CONFIG.DECK.PLAYER.x,
        LAYOUT_CONFIG.DECK.PLAYER.y
      );

      expect(mockContext.engine.add.plane).toHaveBeenCalledTimes(9);

      expect(mockContext.engine.add.text).toHaveBeenCalledWith(
        0,
        95,
        "20",
        expect.any(Object),
      );

      const firstCard = planeMock.mock.results[0].value;
      expect(firstCard.setTint).toHaveBeenCalledWith(
        THEME_CONFIG.COLORS.TINT_DISABLED,
      );

      const lastCard = planeMock.mock.results[8].value;
      expect(lastCard.setInteractive).toHaveBeenCalled();
    });

    it("should setup EventBus listener for CARD_DRAW", () => {
      const spyBus = vi.spyOn(EventBus, "on");
      deckManager.createDeckVisual();

      expect(spyBus).toHaveBeenCalledWith(
        GameEvent.CARD_DRAW,
        expect.any(Function),
      );
    });
  });

  describe("Interactions & Updates", () => {
    it("should handle player card click correctly", () => {
      const planeMock = vi.mocked(mockContext.engine.add.plane);
      deckManager.createDeckVisual();

      const lastCard = planeMock.mock.results[8].value;
      lastCard.emit("pointerdown");

      expect(mockContext.handlePlayerCard).toHaveBeenCalled();
    });

    it("should update text and trigger tween in updateCounter", () => {
      deckManager.createDeckVisual();

      vi.mocked(mockContext.gameState.getDeckCount).mockReturnValue(19);

      const textMock = vi.mocked(mockContext.engine.add.text).mock.results[0].value;

      EventBus.emit(GameEvent.CARD_DRAW, { side: "PLAYER", card: createMockCard() });

      expect(textMock.setText).toHaveBeenCalledWith("19");
      expect(mockContext.engine.tweens.add).toHaveBeenCalled();
    });

    it("should change counter color to red when cards <= 3", () => {
      deckManager.createDeckVisual();

      vi.mocked(mockContext.gameState.getDeckCount).mockReturnValue(3);

      const textMock = vi.mocked(mockContext.engine.add.text).mock.results[0].value;

      EventBus.emit(GameEvent.CARD_DRAW, { side: "PLAYER", card: createMockCard() });

      expect(textMock.setColor).toHaveBeenCalledWith("#FF4d4d");
    });

    it("should react to EventBus CARD_DRAW for the correct side", () => {
      deckManager.createDeckVisual();
      const textMock = vi.mocked(mockContext.engine.add.text).mock.results[0].value;
      
      vi.clearAllMocks(); 
      vi.mocked(mockContext.gameState.getDeckCount).mockReturnValue(15);

      EventBus.emit(GameEvent.CARD_DRAW, { side: "OPPONENT", card: createMockCard() });
      expect(textMock.setText).not.toHaveBeenCalled();

      EventBus.emit(GameEvent.CARD_DRAW, { side: "PLAYER", card: createMockCard() });
      expect(textMock.setText).toHaveBeenCalledWith("15");
    });
  });
});
