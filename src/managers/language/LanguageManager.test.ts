import { describe, it, vi, expect, beforeEach } from "vitest";
import { LanguageManager } from "./LanguageManager";
import type { Lang } from "../../types/GameTypes";

describe("LanguageManager", () => {
  beforeEach(() => {
    //reset singleton for each test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (LanguageManager as any).instance = undefined;
    vi.restoreAllMocks();
  });

  describe("Singleton & Basics", () => {
    beforeEach(() => {
      vi.spyOn(navigator, "language", "get").mockReturnValue("pt-BR");
      vi.spyOn(navigator, "languages", "get").mockReturnValue(["pt-BR", "pt"]);
    });

    it("should create a singleton instance", () => {
      const instance1 = LanguageManager.getInstance();
      const instance2 = LanguageManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should initialize with default language pt-BR", () => {
      const manager = LanguageManager.getInstance();

      expect(manager.currentLang).toBe("pt-BR");
      expect(manager.currentLanguage).toBe("pt-BR");
    });

    it("should change language when setLanguage is called", () => {
      const manager = LanguageManager.getInstance();
      manager.setLanguage("en" as Lang);

      expect(manager.currentLang).toBe("en");
    });

    it("should persist language across singleton instances", () => {
      const manager1 = LanguageManager.getInstance();
      manager1.setLanguage("en" as Lang);

      const manager2 = LanguageManager.getInstance();
      expect(manager2.currentLang).toBe("en");
    });
  });

  describe("Browser Language Detection (Branches)", () => {
    it("should fallback to 'en' when browser language is not Portuguese", () => {
      vi.spyOn(navigator, "language", "get").mockReturnValue("en-US");
      vi.spyOn(navigator, "languages", "get").mockReturnValue(["en-US", "en"]);

      const manager = LanguageManager.getInstance();
      expect(manager.currentLang).toBe("en");
    });

    it("should fallback to 'en' when languages array is empty or undefined", () => {
      vi.spyOn(navigator, "languages", "get").mockReturnValue([]);
      vi.spyOn(navigator, "language", "get").mockReturnValue("");

      const manager = LanguageManager.getInstance();
      expect(manager.currentLang).toBe("en");
    });
  });

  describe("Card Translation Retrieval (Branches)", () => {
    it("should return translated card data when card exists", () => {
      vi.spyOn(navigator, "language", "get").mockReturnValue("pt-BR");
      const manager = LanguageManager.getInstance();

      const translation = manager.getCardTranslation("IRON_SENTINEL");

      expect(translation.name).toBeDefined();
      expect(translation.name).not.toBe("IRON_SENTINEL");
    });

    it("should return fallback data when card does not exist in translations", () => {
      vi.spyOn(navigator, "language", "get").mockReturnValue("pt-BR");
      const manager = LanguageManager.getInstance();

      const fallback = manager.getCardTranslation("NON_EXISTENT_CARD_ID");

      expect(fallback.name).toBe("NON_EXISTENT_CARD_ID");
      expect(fallback.description).toBeDefined();
    });
  });
});
