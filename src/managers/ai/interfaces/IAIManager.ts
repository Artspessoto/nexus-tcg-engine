import type { Card } from "../../../objects/Card";
import type { Move } from "../../../types/GameTypes";

export interface IAIManager {
  isGameOver(): boolean;
  executeTurn(): Promise<void>;
  getCombatResponse(attacker: Card): Promise<Move | null>;
}
