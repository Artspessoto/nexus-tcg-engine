import { Card } from "../objects/Card";
import type { CardEffect } from "../types/EffectTypes";

export interface IEffectManager {
  isSelectingTarget: boolean;
  cancelTargeting(): void;
  applyCardEffect(card: Card): void;
  handleCardSelection(target: Card): void;
  prepareTargeting(effect: CardEffect, source: Card): void;
}
