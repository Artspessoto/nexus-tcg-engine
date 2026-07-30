import { LAYOUT_CONFIG } from "../../constants/LayoutConfig";
import { EventBus } from "../../events/EventBus";
import { GameEvent } from "../../events/GameEvents";
import type { IBattleContext } from "../../interfaces/IBattleContext";
import type { IDeckManager } from "../deck/IDeckManager";
import type { GameSide } from "../../types/GameTypes";
import { DeckView } from "../../view/DeckView";

export class DeckManager implements IDeckManager {
  public readonly context: IBattleContext;
  public readonly side: GameSide;
  private readonly deckPosition: { x: number; y: number };
  private view: DeckView;

  constructor(context: IBattleContext, side: GameSide) {
    this.context = context;
    this.side = side;

    this.deckPosition = LAYOUT_CONFIG.DECK[this.side];
    this.view = new DeckView(this.context.engine, this.deckPosition);
  }

  public get position() {
    return this.deckPosition;
  }

  public createDeckVisual() {
    const count = this.context.gameState.getDeckCount(this.side);
    this.view.createDeckVisual(count);

    if (this.side == "PLAYER") {
      const topCard = this.view.getTopCard();
      if (topCard) {
        topCard.setInteractive({ useHandCursor: true });
        topCard.on("pointerdown", () => {
          this.context.handlePlayerCard();
        });
      }
    }

    EventBus.on(GameEvent.CARD_DRAW, (data) => {
      if (data.side === this.side) {
        const newCount = this.context.gameState.getDeckCount(this.side);
        this.view.updateCounterVisual(newCount);
      }
    });
  }
}
