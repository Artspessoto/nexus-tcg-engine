import type { Card } from "../objects/Card";

export interface TacticalAdvantage {
  isThreatened: boolean; // does the player have an invincible monster on field?
  resourceLead: number; // hand card diff between npc x player
  defensiveGap: number; // best monster def (ai) x best monster atk (player)
  isWinning: boolean; // final situation
}

export interface FieldSnapshot {
  npcMonsters: Card[];
  npcSupports: Card[];
  playerMonsters: Card[];
  advantage: TacticalAdvantage;
  currentMana: number;
  npcHandCards: Card[];
  synergies: {
    hasKillTraps: boolean;
    atkModifiers: Card[];
    posModifiers: Card[];
    protectionCards: Card[];
  };
}

export const AI_EVALUATION = {
  BASE_MOVE: 10,
  FIELD_EMPTY: 25,
  FIELD_FULL: -20,
  THREAT_DEFENSE_HIGH: 40,
  THREAT_DEFENSE_LOW: 15,
  THREAT_RISK_ATK: -25,
  SYNERGY_BAIT: 20,
  SYNERGY_ATK_MOD: 45,
  SYNERGY_POS_CHANGE: 50,
  KILL_POTENTIAL: 35,
  MANA_WASTE_PENALTY: -25,
  MANA_RESERVE_BONUS: 15,
};
