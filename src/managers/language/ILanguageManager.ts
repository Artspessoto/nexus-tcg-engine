import type { Lang } from "../../types/GameTypes";

export interface ILanguageManager {
  readonly currentLang: Lang;
  setLanguage(lang: Lang): void;
}