import { Card } from "../objects/Card";
import type { CardEffect } from "../types/EffectTypes";
import type { EffectInstructions, GameSide } from "../types/GameTypes";

export interface IEffectManager {
  isSelectingTarget: boolean;
  cancelTargeting(): void;
  applyCardEffect(card: Card, AIInstructions?: EffectInstructions): void;
  onGraveyardClicked(side: GameSide): void;
  handleCardSelection(target: Card): void;
  prepareTargeting(effect: CardEffect, source: Card): void;
}
