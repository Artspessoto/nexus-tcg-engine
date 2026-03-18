import { describe, it, expect, beforeEach } from "vitest";
import { LanguageManager } from "./LanguageManager";
import type { Lang } from "../types/GameTypes";

describe("LanguageManager", () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (LanguageManager as any).instance = undefined;
  });

  it("should create a singleton instance", () => {
    const instance1 = LanguageManager.getInstance();
    const instance2 = LanguageManager.getInstance();

    expect(instance1).toBe(instance2);
  });

  it("should initialize with default language pt-br", () => {
    const manager = LanguageManager.getInstance();

    expect(manager.currentLang).toBe("pt-br");
    expect(manager.currentLanguage).toBe("pt-br");
  });

  it("should return the current language using getter", () => {
    const manager = LanguageManager.getInstance();

    const lang = manager.currentLang;

    expect(lang).toBe("pt-br");
  });

  it("should change language when setLanguage is called", () => {
    const manager = LanguageManager.getInstance();

    manager.setLanguage("en-us" as Lang);

    expect(manager.currentLang).toBe("en-us");
  });

  it("should persist language across singleton instances", () => {
    const manager1 = LanguageManager.getInstance();
    manager1.setLanguage("en-us" as Lang);

    const manager2 = LanguageManager.getInstance();

    expect(manager2.currentLang).toBe("en-us");
  });

  it("should allow switching languages multiple times", () => {
    const manager = LanguageManager.getInstance();

    manager.setLanguage("en-us" as Lang);
    expect(manager.currentLang).toBe("en-us");

    manager.setLanguage("pt-br" as Lang);
    expect(manager.currentLang).toBe("pt-br");
  });
});