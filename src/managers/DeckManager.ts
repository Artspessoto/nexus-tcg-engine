import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import type { IBattleContext } from "../interfaces/IBattleContext";
import type { IDeckManager } from "../interfaces/IDeckManager";
import type { GameSide } from "../types/GameTypes";

export class DeckManager implements IDeckManager {
  private context: IBattleContext;
  private side: GameSide;
  private deckPosition: { x: number; y: number };

  constructor(context: IBattleContext, side: GameSide) {
    this.context = context;
    this.side = side;

    this.deckPosition = LAYOUT_CONFIG.DECK[this.side];
  }

  public get position() {
    return this.deckPosition;
  }

  public createDeckVisual() {
    for (let i = 8; i >= 0; i--) {
      const xOffset = i * 2;
      const yOffset = 0;
      const deckCard = this.context.add.plane(
        this.deckPosition.x - xOffset,
        this.deckPosition.y - yOffset,
        "card_back",
      );
      // deckCard.modelRotation.x = -1.02; // deep card
      // deckCard.modelRotation.y = 0.29;
      // deckCard.modelRotation.z = Phaser.Math.DegToRad(0.12);

      deckCard.setViewHeight(400);
      deckCard.scaleX = 0.36;
      deckCard.scaleY = 0.4;
      deckCard.setDepth(10 - i);

      if (i == 0 && this.side == "PLAYER") {
        deckCard.setInteractive({ useHandCursor: true });
        deckCard.on("pointerdown", () => {
          this.context.handlePlayerCard();
        });
      }

      if (i > 0) {
        deckCard.setTint(0x999999);
      }
    }
  }
}
