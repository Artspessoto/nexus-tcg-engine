import type { Card } from "../../objects/Card";
import type {
  Notice,
  TranslationStructure,
  PlacementMode,
} from "../../types/GameTypes";

export interface IUIManager {
  setTranslations(translations: TranslationStructure): void;
  setupUI(): void;
  setupLifePoints(): void;
  showNotice(message: string, type: Notice): void;
  animateLPChange(amount: number, startLP: number, targetLP: number): void;
  updateMana(amount: number): void;
  handleFlipSummon(card: Card): void;
  handleChangePosition(card: Card): void;
  showSelectionMenu(
    x: number,
    y: number,
    card: Card,
    onSelect: (mode: PlacementMode) => void,
    onCancel?: () => void,
  ): void;
  clearSelectionMenu(): void;
  showGraveyardMenu(cards: Card[], x: number, y: number): void;
  showFieldCardMenu(x: number, y: number, card: Card): void;
  showTrapResponseAction(): Promise<boolean>;
}
