import type { GamePhase, BattleTranslations } from "../../types/GameTypes";

export interface IPhaseManager {
  updateUI(phase: GamePhase, translations: BattleTranslations): void;
}