export interface BuffAnalysis {
  isGameChanger: boolean;
  targetValue: number;
}

export interface BurnAnalysis {
  isLethal: boolean;
  damagePotential: number;
}

export interface BounceAnalysis {
  targetAtk: number;
  targetDef: number;
  manaCost: number;
  isTank: boolean;
}

export interface ChangePosAnalysis {
  targetAtk: number;
  targetDef: number;
  isCurrentAtkMode: boolean;
  statGap: number; // difference between atk and def 
}