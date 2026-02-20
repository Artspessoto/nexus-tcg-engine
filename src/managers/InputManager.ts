import type { Card } from "../objects/Card";
import type { BattleScene } from "../scenes/BattleScene";

export class InputManager {
  private scene: BattleScene;

  constructor(scene: BattleScene) {
    this.scene = scene;
  }

  public setupGlobalInputs() {
    this.scene.input.on(
      "pointerdown",
      (
        _pointer: Phaser.Input.Pointer,
        currentlyOver: Phaser.GameObjects.GameObject[],
      ) => {
        if (currentlyOver.length === 0) {
          this.scene.currentUI.clearSelectionMenu();
          this.scene.playerHand.showHand();
        }
      },
    );

    this.scene.input.keyboard?.on("keydown-SPACE", () => {
      this.scene.handlePlayerCard();
    });

    this.scene.input.keyboard?.on("keydown-ESC", () => {
      if (this.scene.currentPhase == "BATTLE") {
        this.scene.combatManager.cancelTarget();
      }
      this.scene.cancelPlacement();
    });

    this.scene.input.keyboard?.on("keydown-T", () => {
      this.scene.gameState.nextTurn();
      this.scene.setPhase("DRAW");
    });

    this.scene.input.on("pointerdown", () => {
      if (this.scene.selectedCard) {
        this.scene.time.delayedCall(50, () => this.scene.cancelPlacement());
      }
    });

    this.scene.input.on("pointerdown", (pointer: { x: number; y: number }) => {
      console.log(
        `Debug: X: ${Math.round(pointer.x)}, Y: ${Math.round(pointer.y)}`,
      );
    });
  }

  public setupCardInteractions(card: Card) {
    card.setInteractive({ draggable: true });
    this.scene.input.setDraggable(card);

    // hover effect (Zoom)
    card.on("pointerover", () => this.handleCardHover(card));
    card.on("pointerout", () => this.handleCardOut(card));

    this.setupDragEvents(card);
  }

  //card on focus (hand)
  private handleCardHover(card: Card) {
    if (this.scene.gameState.isDragging) return;

    this.scene.tweens.add({
      targets: card.visualElements,
      y: -280,
      scale: 1.5,
      duration: 200,
      ease: "Back.easeOut",
    });
    card.setDepth(200);
  }

  //card stop focus (hand)
  private handleCardOut(card: Card) {
    if (this.scene.gameState.isDragging) return;

    this.scene.tweens.add({
      targets: card.visualElements,
      y: 0,
      scale: 1,
      duration: 200,
      ease: "Power2",
    });

    this.scene.currentHand.reorganizeHand();
  }

  public setupDragEvents(card: Card) {
    card.on("dragstart", (pointer: Phaser.Input.Pointer) => {
      if (this.scene.currentPhase !== "MAIN") {
        this.scene.input.setDragState(pointer, 0);
        return;
      }

      this.scene.gameState.setDragging(true);
      this.scene.tweens.killTweensOf(card);
      this.scene.tweens.killTweensOf(card.visualElements);

      this.scene.tweens.add({
        targets: card,
        scale: 0.35,
        duration: 150,
        ease: "Power2",
      });
      card.setDepth(2000);
    });

    card.on(
      "drag",
      (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        //TODO option to drop card into zone (defense, attack, back card)
        card.visualElements.setY(0);
        card.visualElements.setScale(1);
        card.setPosition(dragX, dragY);
      },
    );

    card.on("dragend", (_pointer: Phaser.Input.Pointer, dropped: boolean) => {
      this.scene.gameState.setDragging(false);
      if (!dropped) this.scene.currentHand.reorganizeHand();
      this.scene.tweens.add({
        targets: card,
        scale: 0.35,
        duration: 200,
        ease: "Back.easeOut",
      });
    });

    card.on(
      "drop",
      (_pointer: Phaser.Input.Pointer, targetZone: Phaser.GameObjects.Zone) => {
        this.scene.handleCardDrop(targetZone, card);
      },
    );
  }
}
