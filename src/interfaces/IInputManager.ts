import { Card } from "../objects/Card";

export interface IInputManager {
  setupGlobalInputs(): void;
  setupCardInteractions(card: Card): void;
  isSelectionLocked(): boolean;
}