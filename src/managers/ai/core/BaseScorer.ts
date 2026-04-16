import type { IBattleContext } from "../../../interfaces/IBattleContext";
import type { GameSide } from "../../../types/GameTypes";

export abstract class BaseScorer {
  protected readonly side: GameSide = "OPPONENT";
  protected readonly playerSide: GameSide = "PLAYER";

  constructor(protected readonly context: IBattleContext) {}
}