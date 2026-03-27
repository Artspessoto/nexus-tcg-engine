import Phaser from "phaser";
import type { GameEventMap } from "./GameEvents";
import { Logger } from "../utils/Logger";

type EventHistory<K extends keyof GameEventMap> = {
  event: K;
  payload: GameEventMap[K];
  timestamp: number;
};

class TypedEventBus extends Phaser.Events.EventEmitter {
  private history: EventHistory<keyof GameEventMap>[] = [];

  public emit<K extends keyof GameEventMap>(
    event: K,
    payload: GameEventMap[K],
  ): boolean {
    Logger.debug("EVENT", `${event}`, payload);

    this.history.push({ event, payload, timestamp: Date.now() });

    return super.emit(event, payload);
  }

  public getHistory() {
    return this.history;
  }

  public clearHistory() {
    this.history = [];
  }

  public on<K extends keyof GameEventMap>(
    event: K,
    fn: (payload: GameEventMap[K]) => void,
    context?: object,
  ): this {
    return super.on(event, fn, context);
  }
}

export const EventBus = new TypedEventBus();
