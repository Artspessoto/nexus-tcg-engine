import Phaser from "phaser";
import type { GameEventMap } from "./GameEvents";
import { Logger } from "../utils/Logger";

class TypedEventBus extends Phaser.Events.EventEmitter {
  public emit<K extends keyof GameEventMap>(
    event: K,
    payload: GameEventMap[K],
  ): boolean {
    Logger.debug("EVENT", `${event}`, payload);

    return super.emit(event, payload);
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
