import type { ILanguageManager } from "./ILanguageManager";
import type { CardTranslation, Lang } from "../../types/GameTypes";
import { TRANSLATIONS } from "../../constants/Translations";
import { CARD_DATABASE } from "../../constants/CardDatabase";
import type { CardData } from "../../types/CardTypes";

export class LanguageManager implements ILanguageManager {
  private static instance: LanguageManager;
  public currentLanguage: Lang;

  private constructor() {
    this.currentLanguage = this.detectorBrowserLanguage();
  }

  public static getInstance(): LanguageManager {
    if (!LanguageManager.instance) {
      LanguageManager.instance = new LanguageManager();
    }

    return LanguageManager.instance;
  }

  get currentLang(): Lang {
    return this.currentLanguage;
  }

  public setLanguage(lang: Lang) {
    this.currentLanguage = lang;
  }

  private detectorBrowserLanguage(): Lang {
    const browserLang = (
      (typeof navigator !== "undefined" &&
        (navigator.languages?.[0] || navigator.language)) ||
      ""
    ).toLowerCase();

    if (browserLang.startsWith("pt")) {
      return "pt-BR" as Lang;
    }

    //default language for: german, french, portuguese, and others
    return "en" as Lang;
  }

  public getCardTranslation(cardId: string): CardTranslation {
    const currentTranslation = TRANSLATIONS[this.currentLang];
    const cardText =
      currentTranslation.cards[cardId as keyof typeof currentTranslation.cards];

    if (cardText) return cardText;

    const baseCard = (CARD_DATABASE as Record<string, CardData>)[cardId];

    //security fallback (for cases where card doesn't yet have translation)
    return {
      name: cardId,
      description: baseCard?.descriptionKey ?? "",
    };
  }
}
