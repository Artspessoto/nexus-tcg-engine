import type { ILanguageManager } from "./ILanguageManager";
import type { Lang } from "../../types/GameTypes";

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
}
