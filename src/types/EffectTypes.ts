import type { CardType } from "./CardTypes";

export type EffectTargetSide = "OWNER" | "OPPONENT" | "BOTH";

interface NumericEffect {
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
}

interface ActionEffect {
  //"BOUNCE" return card to card owner hand
  type:
    | "DESTROY_MONSTER"
    | "DESTROY_SPELL"
    | "DESTROY_TRAP"
    | "CHANGE_POS"
    | "REVIVE"
    | "BOUNCE";
  targetSide: EffectTargetSide;
  value?: number;
  targetType?: CardType;
}

interface UtilityEffect {
  type: "PROTECT" | "NEGATE" | "DRAW_CARD";
  value?: number;
  targetSide?: EffectTargetSide;
}

export type CardEffect = NumericEffect | ActionEffect | UtilityEffect;

export type EffectTypes = CardEffect["type"];
