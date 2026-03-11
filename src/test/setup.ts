// src/test/setup.ts
import { vi } from "vitest";

vi.mock("phaser", () => {
  return {
    default: {
      Events: {
        EventEmitter: class {
          on = vi.fn();
          emit = vi.fn();
          once = vi.fn();
          off = vi.fn();
          removeAllListeners = vi.fn();
        }
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