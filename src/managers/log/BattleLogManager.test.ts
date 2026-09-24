import { describe, it, expect, beforeEach } from "vitest";
import { EventBus } from "../../events/EventBus";
import { GameEvent } from "../../events/GameEvents";
import { BattleLogManager } from "./BattleLogManager";
import type { IBattleContext } from "../../interfaces/IBattleContext";
import { createMockBattleContext } from "../../utils/Mocks";

describe("BattleLogManager", () => {
  let mockContext: IBattleContext;
  let logManager: BattleLogManager;

  beforeEach(() => {
    EventBus.removeAllListeners();

    mockContext = createMockBattleContext();

    logManager = new BattleLogManager(mockContext);
  });

  it("should record the start of a turn correctly", () => {
    EventBus.emit(GameEvent.TURN_STARTED, {
      side: "PLAYER",
      turnCount: 1,
      actor: "Arthur",
    });

    const entries = logManager.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe("TURN_START");
    expect(entries[0].turn).toBe(1);
  });

  it("should clear all entries when clear() is called", () => {
    EventBus.emit(GameEvent.TURN_STARTED, {
      side: "PLAYER",
      turnCount: 1,
      actor: "Arthur",
    });

    logManager.clear();
    expect(logManager.getEntries()).toHaveLength(0);
  });
});