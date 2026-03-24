import { beforeEach, describe, expect, it } from "vitest";
import { GameState } from "./GameState";

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
});
