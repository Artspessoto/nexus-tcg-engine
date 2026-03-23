import type { Card } from "../objects/Card";
import type { GameSide } from "../types/GameTypes";

export interface ICombatManager {
  isSelectingTarget: boolean;
  currentAttacker: Card | null;
  isAnimating: boolean;
  prepareTargeting(attacker: Card): void;
  handleCardSelection(target: Card): void;
  destroyCard(card: Card, side: GameSide, silent?: boolean): void;
  cancelTarget(): void;
}
