/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { vi } from "vitest";

vi.mock("phaser", () => {
  return {
    default: {
      Math: {
        Between: vi.fn((min: number, _max: number) => min),
      },
      Events: {
        EventEmitter: class {
          private listeners: Record<string, Function[]> = {};

          on(event: string, fn: Function) {
            if (!this.listeners[event]) this.listeners[event] = [];
            this.listeners[event].push(fn);
            return this;
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          emit(event: string, ...args: any[]) {
            if (this.listeners[event]) {
              this.listeners[event].forEach((fn) => fn(...args));
            }
            return true;
          }

          off(event: string, fn: Function) {
            if (this.listeners[event]) {
              this.listeners[event] = this.listeners[event].filter(
                (f) => f !== fn,
              );
            }
            return this;
          }

          removeAllListeners() {
            this.listeners = {};
            return this;
          }
        },
      },
      GameObjects: {
        GameObject: class {},
        Sprite: class {},
        Zone: class {},
        Container: class {},
        Graphics: class {},
        Text: class {},
        Image: class {},
      },
      Scene: class {
        add = {
          zone: vi.fn(),
          graphics: vi.fn(),
          container: vi.fn(),
          text: vi.fn(),
          image: vi.fn(),
        };
      },
    },
  };
});
