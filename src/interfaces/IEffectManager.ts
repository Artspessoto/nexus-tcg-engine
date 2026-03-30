import { Card } from "../objects/Card";
import type { CardEffect } from "../types/EffectTypes";
import type { EffectInstructions, GameSide } from "../types/GameTypes";

export interface IEffectManager {
  isSelectingTarget: boolean;
  isSelectingResponse: boolean;
  cancelTargeting(): void;
  applyCardEffect(
    card: Card,
    AIInstructions?: EffectInstructions,
  ): Promise<void>;
  onGraveyardClicked(side: GameSide): void;
  handleCardSelection(target: Card): void;
  prepareTargeting(effect: CardEffect, source: Card): Promise<void>;
  selectResponseActivationSource(): Promise<Card | null>;
  handleGlobalClick(card: Card): void
}
