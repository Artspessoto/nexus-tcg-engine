import type { Card } from "../../../objects/Card";

export interface IAIManager {
  executeTurn(): Promise<void>;
  getCombatResponse(attacker: Card): Promise<Card | null>;
}
