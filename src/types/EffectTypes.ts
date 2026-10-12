import type { CardType } from "./CardTypes";

export type EffectTargetSide = "OWNER" | "OPPONENT" | "BOTH";
export type EffectTrigger = "ON_SUMMON" | "NEXT_TURN";

export interface NumericEffect {
  type:
    | "BURN"
    | "HEAL"
    | "BOOST_ATK"
    | "NERF_ATK"
    | "GAIN_MANA"
    | "BOOST_DEF"
    | "NERF_DEF";
  value: number;
  targetSide: EffectTargetSide;
  trigger?: EffectTrigger; //optional for spell and trap, required for effect monster
}

export interface ActionEffect {
  //"BOUNCE" return card to card owner hand
  type: "DESTROY" | "CHANGE_POS" | "REVIVE" | "BOUNCE";
  targetSide: EffectTargetSide;
  value?: number;
  targetType?: CardType;
  trigger?: EffectTrigger;
}

interface UtilityEffect {
  type: "PROTECT" | "NEGATE" | "DRAW_CARD";
  value?: number;
  targetSide?: EffectTargetSide;
  targetType?: CardType;
  trigger?: EffectTrigger;
}

export type CardEffect = ActionEffect | NumericEffect | UtilityEffect;

export type EffectTypes = CardEffect["type"];
