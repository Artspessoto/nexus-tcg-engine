import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventBus } from "./EventBus";
import { GameEvent } from "./GameEvents";
import type { Card } from "../objects/Card";

describe("TypedEventBus", () => {
  beforeEach(() => {
    EventBus.removeAllListeners();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("deve registrar um ouvinte e emitir um evento com o payload correto", () => {
    const callback = vi.fn();
    const payload = { newPhase: "BATTLE", activePlayer: "PLAYER" } as const;

    EventBus.on(GameEvent.PHASE_CHANGED, callback);

    EventBus.emit(GameEvent.PHASE_CHANGED, payload);

    expect(callback).toHaveBeenCalledWith(payload);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("deve suportar múltiplos ouvintes para o mesmo evento", () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    const payload = { card: {} as unknown as Card, side: "PLAYER" } as const;

    EventBus.on(GameEvent.CARD_SENT_TO_GRAVEYARD, cb1);
    EventBus.on(GameEvent.CARD_SENT_TO_GRAVEYARD, cb2);

    EventBus.emit(GameEvent.CARD_SENT_TO_GRAVEYARD, payload);

    expect(cb1).toHaveBeenCalledWith(payload);
    expect(cb2).toHaveBeenCalledWith(payload);
  });

  it("deve remover ouvintes corretamente", () => {
    const callback = vi.fn();

    EventBus.on(GameEvent.FIELD_STATS_RESET, callback);
    EventBus.off(GameEvent.FIELD_STATS_RESET, callback);

    EventBus.emit(GameEvent.FIELD_STATS_RESET, { sides: ["PLAYER"] });

    expect(callback).not.toHaveBeenCalled();
  });
});
