import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameState } from "./GameState";

vi.mock("../constants/CardDatabase", () => ({
  CARD_DATABASE: {
    CARD_01: { id: "CARD_01", nameKey: "Test Card 1" },
    CARD_02: { id: "CARD_02", nameKey: "Test Card 2" },
  },
}));

describe("GameState", () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = new GameState();
  });

  describe("Initial State", () => {
    it("should start with correct default values", () => {
      expect(gameState.currentPhase).toBe("DRAW");
      expect(gameState.activePlayer).toBe("PLAYER");
      expect(gameState.playerHP).toBe(500);
      expect(gameState.opponentHP).toBe(500);
      expect(gameState.playerMana).toBe(5);
      expect(gameState.currentTurn).toBe(1);
      expect(gameState.isDragging).toBe(false);
    });
  });

  describe("Player Configuration", () => {
    it("should set and get player name correctly", () => {
      gameState.setPlayerName("Arthur");
      expect(gameState.playerName).toBe("Arthur");
    });
  });

  describe("LP Management", () => {
    it("should modify Opponent HP correctly", () => {
      gameState.modifyHP("OPPONENT", -150);
      expect(gameState.getHP("OPPONENT")).toBe(350);
    });

    it("should allow healing (positive HP modification)", () => {
      gameState.modifyHP("PLAYER", 50);
      expect(gameState.getHP("PLAYER")).toBe(550);
    });
  });

  describe("Mana Management", () => {
    it("should get and modify mana value for both players", () => {
      gameState.modifyMana("OPPONENT", -2);
      gameState.modifyMana("PLAYER", 3);

      expect(gameState.getMana("OPPONENT")).toBe(3);
      expect(gameState.getMana("PLAYER")).toBe(8);
    });
  });

  describe("Phase and Turn Management", () => {
    it("should set a new phase correctly", () => {
      gameState.setPhase("BATTLE");
      expect(gameState.currentPhase).toBe("BATTLE");
    });

    it("should reset phase to DRAW when changing turn", () => {
      gameState.setPhase("BATTLE");
      gameState.nextTurn();
      expect(gameState.currentPhase).toBe("DRAW");
      expect(gameState.activePlayer).toBe("OPPONENT");
    });

    it("should advance turn count multiple times", () => {
      gameState.advanceTurnCount();
      gameState.advanceTurnCount();
      expect(gameState.currentTurn).toBe(3);
    });
  });

  describe("Deck Management", () => {
    const mockPlayerDeck = ["CARD_01", "CARD_02"];
    const mockOpponentDeck = ["CARD_01"];

    beforeEach(() => {
      gameState.initializeDecks(mockPlayerDeck, mockOpponentDeck);
    });

    it("should return the correct deck count for both sides", () => {
      expect(gameState.getDeckCount("PLAYER")).toBe(2);
      expect(gameState.getDeckCount("OPPONENT")).toBe(1);
    });

    it("should return card data and decrease count when drawing (pop)", () => {
      const card = gameState.setDeckState("PLAYER");

      expect(card?.id).toBe("CARD_02");
      expect(gameState.getDeckCount("PLAYER")).toBe(1);
    });

    it("should return null when attempting to draw from an empty deck (Deck Out)", () => {
      gameState.setDeckState("OPPONENT");
      const deckOutCard = gameState.setDeckState("OPPONENT");

      expect(deckOutCard).toBeNull();
      expect(gameState.getDeckCount("OPPONENT")).toBe(0);
    });
  });

  describe("Interaction State", () => {
    it("should update dragging state correctly", () => {
      gameState.setDragging(true);
      expect(gameState.isDragging).toBe(true);

      gameState.setDragging(false);
      expect(gameState.isDragging).toBe(false);
    });
  });
});
