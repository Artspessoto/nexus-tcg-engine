import type { EffectTypes } from "../types/EffectTypes";

export const AI_CONFIG = {
  SCORES: {
    BASE_MOVE: 10,
    LETHAL_BURN: 9999,
    GAME_CHANGER: 150,
    PASS_THRESHOLD: 5, //min score to dont pass turn
  },
  FIELD: {
    EMPTY_BONUS: 25,
    FULL_PENALTY: -20,
    THREAT_HIGH: 40,
    THREAT_LOW: 15,
    RISK_ATK: -25,
  },
  TACTICS: {
    BAIT: 20,
    ATK_MODIFIER: 45,
    POS_CHANGE: 50,
    KILL_POTENTIAL: 35,
    DRAW_URGENCY: 25,
    MANA_RESERVE: 15,
    MANA_WASTE: -25,
  },
};

export const EFFECTS_REQUIRING_TARGET: EffectTypes[] = [
  "DESTROY",
  "BOUNCE",
  "NERF_ATK",
  "BOOST_ATK",
  "REVIVE",
  "CHANGE_POS",
];

export const OFFENSIVE_EFFECTS: EffectTypes[] = [
  "NERF_ATK",
  "NERF_DEF",
  "CHANGE_POS",
  "BOUNCE",
  "DESTROY",
];

export const DEFENSIVE_EFFECTS: EffectTypes[] = [
  "BOOST_ATK",
  "BOOST_DEF",
  "PROTECT",
];
