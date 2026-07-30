import { THEME_CONFIG } from "../constants/ThemeConfig";

export class DeckView {
  private scene: Phaser.Scene;
  public container: Phaser.GameObjects.Container;
  private countText!: Phaser.GameObjects.Text;
  private deckCards: Phaser.GameObjects.Plane[] = [];

  constructor(scene: Phaser.Scene, position: { x: number; y: number }) {
    this.scene = scene;
    this.container = this.scene.add.container(position.x, position.y);
  }

  public createDeckVisual(initialCount: number): void {
    const { COLORS, DEPTHS } = THEME_CONFIG;
    for (let i = 8; i >= 0; i--) {
      const xOffset = i * 2;
    //   const yOffset = 0;
    //   const deckCard = this.scene.add.plane(
    //     this.position.x - xOffset,
    //     this.position.y - yOffset,
    //     "battle_ui",
    //     "card_back2",
    //   );
      // deckCard.modelRotation.x = -1.02; // deep card
      // deckCard.modelRotation.y = 0.29;
      // deckCard.modelRotation.z = Phaser.Math.DegToRad(0.12);
      const deckCard = this.scene.add.plane(
        -xOffset, 
        0, 
        "battle_ui",
        "card_back2"
      );

      deckCard.setViewHeight(400);
      deckCard.scaleX = 0.36;
      deckCard.scaleY = 0.4;
      deckCard.setDepth(10 - i);

      if (i > 0) {
        deckCard.setTint(COLORS.TINT_DISABLED);
      }

      this.deckCards.push(deckCard);
      this.container.add(deckCard);
    }

    this.countText = this.scene.add
      .text(0, 95, initialCount.toString(), {
        fontSize: "20px",
        color: "#FFD966",
        fontStyle: "bold",
        stroke: "#000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.UI_BASE);

      this.container.add(this.countText);
  }

  public updateCounterVisual(newCount: number) {
    const { DURATIONS, EASING } = THEME_CONFIG.ANIMATIONS;
    this.countText.setText(newCount.toString());

    this.scene.tweens.add({
      targets: this.countText,
      scale: 1.5,
      yoyo: true,
      duration: DURATIONS.FAST,
      ease: EASING.QUART_OUT,
    });

    if (newCount <= 3) {
      this.countText.setColor("#FF4d4d");
    } else {
      this.countText.setColor("#FFD966");
    }
  }

  public getTopCard(): Phaser.GameObjects.Plane | undefined {
    return this.deckCards[this.deckCards.length - 1];
  }
}
