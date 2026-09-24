import type { BattleLogEntry } from "../../types/BattleLogType";

export interface IBattleLogManager {
  getEntries(): BattleLogEntry[];
  clear(): void;
}
