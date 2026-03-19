import type { IAIStrategy } from "../../interfaces/IAIStrategy";
import type { IBattleContext } from "../../interfaces/IBattleContext";

export class EasyStrategy implements IAIStrategy {
  public readonly context: IBattleContext;

  constructor(context: IBattleContext) {
    this.context = context;
  }
  public async playMainPhase(): Promise<void> {
    const npcHand = this.context.getHand("OPPONENT");
    const monsterCard = npcHand.hand.find((card) =>
      card.getType().includes("MONSTER"),
    );
    const cardToPlay = monsterCard || npcHand.hand[0];

    if (cardToPlay) {
      const type = cardToPlay.getType().includes("MONSTER")
        ? "MONSTER"
        : "SPELL";
      const result = this.context.field.getValidSlotToPlay(
        cardToPlay,
        "OPPONENT",
        type,
      );

      if (result.valid && result.slot) {
        const cardMode = type == "MONSTER" ? "ATK" : "SET";
        this.context.executePlay(
          cardToPlay,
          "OPPONENT",
          type,
          result.slot,
          cardMode,
        );
      }
    }
  }

  public async playBattlePhase(): Promise<void> {}
}
