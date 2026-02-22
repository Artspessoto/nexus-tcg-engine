import type { CardEffect } from "./EffectTypes";

export type CardType = "MONSTER" | "EFFECT_MONSTER" | "SPELL" | "TRAP";
export type CardLocation = "HAND" | "FIELD" | "GRAVEYARD" | "DECK";

export interface CardData {
  id: string;
  type: CardType;
  nameKey: string;
  atk?: number;
  def?: number;
  effects?: CardEffect;
  manaCost: number;
  imageKey: string;
  descriptionKey: string;
  width?: number;
  height?: number;
}