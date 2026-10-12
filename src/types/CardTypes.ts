import type { CardEffect } from "./EffectTypes";

export type CardType = "MONSTER" | "EFFECT_MONSTER" | "SPELL" | "TRAP";
export type CardLocation = "HAND" | "FIELD" | "GRAVEYARD" | "DECK";

export interface CardData {
  id: string;
  type: CardType;
  nameKey?: string; //optional since spells and traps don't yet have translations
  descriptionKey?: string; //optional since spells and traps don't yet have translations
  atk?: number;
  def?: number;
  effects?: CardEffect;
  manaCost: number;
  imageKey: string;
  atlasKey?: string;
  width?: number;
  height?: number;
}
