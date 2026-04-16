import type { Card } from "../objects/Card";
import type { CardEffect } from "./EffectTypes";

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
  playerSupports: Card[];
  advantage: TacticalAdvantage;
  currentMana: number;
  currentLP: number;
  npcHandCards: Card[];
  synergies: FieldSynergies;
}

export interface FieldSynergies {
  hasKillTraps: boolean;
  atkModifiers: Card[];
  posModifiers: Card[];
  protectionCards: Card[];
}

export type SupportScorer = (
  effectValue: number,
  effect: CardEffect,
  snapshot: FieldSnapshot,
  params?: { target?: Card | null },
) => number;
