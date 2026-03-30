import { describe, it, expect, vi } from "vitest";
import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { THEME_CONFIG } from "../constants/ThemeConfig";
import { DeckManager } from "./DeckManager";
import { createMockBattleContext } from "../utils/mocks";

describe("DeckManager", () => {
  it("should create a new DeckManager instance", () => {
    const mockContext = createMockBattleContext();
    const manager = new DeckManager(mockContext, "PLAYER");
    expect(manager.context).toEqual(mockContext);
    expect(manager.side).toEqual("PLAYER");
    expect(manager.position).toEqual(LAYOUT_CONFIG.DECK.PLAYER);
  });

  it("should return the correct deck position", () => {
    const mockContext = createMockBattleContext();
    const manager = new DeckManager(mockContext, "PLAYER");
    expect(manager.position).toEqual(LAYOUT_CONFIG.DECK.PLAYER);
  });

  it("should create the deck visual correctly", () => {
    const mockContext = createMockBattleContext();
    const manager = new DeckManager(mockContext, "PLAYER");
    const planeMock = vi.mocked(mockContext.add.plane);
    manager.createDeckVisual();

    expect(mockContext.add.plane).toHaveBeenCalledTimes(9);
    expect(mockContext.add.plane).toHaveBeenCalledWith(
      LAYOUT_CONFIG.DECK.PLAYER.x - 16,
      LAYOUT_CONFIG.DECK.PLAYER.y,
      "battle_ui",
      "card_back2",
    );

    const firstCard = planeMock.mock.results[0].value;
    expect(firstCard.setViewHeight).toHaveBeenCalledWith(400);
    expect(firstCard.scaleX).toEqual(0.36);
    expect(firstCard.scaleY).toEqual(0.4);
    expect(firstCard.setDepth).toHaveBeenCalledWith(2);
    expect(firstCard.setTint).toHaveBeenCalledWith(
      THEME_CONFIG.COLORS.TINT_DISABLED,
    );
    expect(firstCard.setInteractive).not.toHaveBeenCalled();

    const lastCard = planeMock.mock.results[8].value;
    expect(lastCard.setInteractive).toHaveBeenCalledWith({
      useHandCursor: true,
    });
    expect(lastCard.on).toHaveBeenCalledWith(
      "pointerdown",
      expect.any(Function),
    );
  });

  it("should handle player card click correctly", () => {
    const mockContext = createMockBattleContext();
    const manager = new DeckManager(mockContext, "PLAYER");
    const planeMock = vi.mocked(mockContext.add.plane);
    manager.createDeckVisual();

    const lastCard = planeMock.mock.results[8].value;
    lastCard.emit("pointerdown");
    expect(mockContext.handlePlayerCard).toHaveBeenCalled();
  });
});
