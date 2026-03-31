import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { THEME_CONFIG } from "../constants/ThemeConfig";
import { EventBus } from "../events/EventBus";
import { GameEvent } from "../events/GameEvents";
import type { IBattleContext } from "../interfaces/IBattleContext";
import type { IDeckManager } from "../interfaces/IDeckManager";
import type { GameSide } from "../types/GameTypes";

export class DeckManager implements IDeckManager {
  public readonly context: IBattleContext;
  public readonly side: GameSide;
  private readonly deckPosition: { x: number; y: number };
  private countText!: Phaser.GameObjects.Text;

  constructor(context: IBattleContext, side: GameSide) {
    this.context = context;
    this.side = side;

    this.deckPosition = LAYOUT_CONFIG.DECK[this.side];
  }

  public get position() {
    return this.deckPosition;
  }

  public createDeckVisual() {
    const { TINT_DISABLED } = THEME_CONFIG.COLORS;
    for (let i = 8; i >= 0; i--) {
      const xOffset = i * 2;
      const yOffset = 0;
      const deckCard = this.context.add.plane(
        this.deckPosition.x - xOffset,
        this.deckPosition.y - yOffset,
        "battle_ui",
        "card_back2",
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
        deckCard.setTint(TINT_DISABLED);
      }
    }

    this.countText = this.context.add
      .text(
        this.position.x,
        this.position.y + 95,
        this.context.gameState.getDeckCount(this.side).toString(),
        {
          fontSize: "20px",
          color: "#FFD966",
          fontStyle: "bold",
          stroke: "#000",
          strokeThickness: 3,
        },
      )
      .setOrigin(0.5)
      .setDepth(100);

    EventBus.on(GameEvent.CARD_DRAW, (data) => {
      if (data.side === this.side) {
        this.updateCounter();
      }
    });
  }

  public updateCounter() {
    const { DURATIONS, EASING } = THEME_CONFIG.ANIMATIONS;
    const count = this.context.gameState.getDeckCount(this.side);
    this.countText.setText(count.toString());

    this.context.tweens.add({
      targets: this.countText,
      scale: 1.5,
      yoyo: true,
      duration: DURATIONS.FAST,
      ease: EASING.QUART_OUT,
    });

    if (count <= 3) {
      this.countText.setColor("#ff4d4d");
    }
  }
}
