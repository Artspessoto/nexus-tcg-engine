import type { IInputManager } from "../interfaces/IInputManager";
import type { IBattleContext } from "../interfaces/IBattleContext";
import type { Card } from "../objects/Card";
import { THEME_CONFIG } from "../constants/ThemeConfig";

export class InputManager implements IInputManager {
  private context: IBattleContext;

  constructor(context: IBattleContext) {
    this.context = context;
  }

  public setupGlobalInputs() {
    this.context.engine.input.on(
      "pointerdown",
      (
        pointer: Phaser.Input.Pointer,
        currentlyOver: Phaser.GameObjects.GameObject[],
      ) => {
        //DEBUG LOG
        if (process.env.NODE_ENV == "test") {
          console.log(
            `Debug: X: ${Math.round(pointer.x)}, Y: ${Math.round(pointer.y)}`,
          );
        }

        //click action into void
        if (currentlyOver.length === 0) {
          const activeSide = this.context.gameState.activePlayer;

          if (this.isSelectionLocked()) return;
          this.context.cancelPlacement();

          this.context.clearAllMenus();
          this.context.getHand(activeSide).showHand();

          //cancel effect target
          if (this.context.effects.isSelectingTarget) {
            this.context.effects.cancelTargeting();
          }

          // cancel combat target
          if (this.context.currentPhase === "BATTLE") {
            this.context.combat.cancelTarget();
          }
        }
      },
    );

    this.context.engine.input.keyboard?.on("keydown-SPACE", () => {
      this.context.handlePlayerCard();
    });

    this.context.engine.input.keyboard?.on("keydown-ESC", () => {
      if (this.isSelectionLocked()) return;
      if (this.context.currentPhase == "BATTLE") {
        this.context.combat.cancelTarget();
      }
      this.context.cancelPlacement();
    });

    this.context.engine.input.keyboard?.on("keydown-T", () => {
      this.context.gameState.nextTurn();
      this.context.setPhase("DRAW");
    });
  }

  public setupCardInteractions(card: Card) {
    card.setInteractive({ draggable: true });
    this.context.engine.input.setDraggable(card);

    // hover effect (Zoom)
    card.on("pointerover", () => this.handleCardHover(card));
    card.on("pointerout", () => this.handleCardOut(card));

    this.setupDragEvents(card);
  }

  //card on focus (hand)
  private handleCardHover(card: Card) {
    const { COMPONENTS, ANIMATIONS } = THEME_CONFIG;

    if (this.shouldBlockHover()) return;

    this.context.tweens.add({
      targets: card.visualElements,
      y: COMPONENTS.CARD.OFFSETS.HOVER_Y,
      scale: COMPONENTS.CARD.SCALES.ZOOM,
      duration: ANIMATIONS.DURATIONS.PREVIEW,
      ease: ANIMATIONS.EASING.BOUNCE,
    });
    card.setDepth(200);
  }

  //card stop focus (hand)
  private handleCardOut(card: Card) {
    const { ANIMATIONS } = THEME_CONFIG;
    if (this.context.gameState.isDragging) return;

    this.context.tweens.add({
      targets: card.visualElements,
      y: 0,
      scale: 1,
      duration: ANIMATIONS.DURATIONS.PREVIEW,
      ease: ANIMATIONS.EASING.SMOOTH,
    });

    this.context.getHand(card.owner).reorganizeHand();
  }

  public setupDragEvents(card: Card) {
    const { ANIMATIONS, COMPONENTS, DEPTHS } = THEME_CONFIG;
    card.on("dragstart", (pointer: Phaser.Input.Pointer) => {
      if (this.context.currentPhase !== "MAIN" || this.isSelectionLocked()) {
        this.context.engine.input.setDragState(pointer, 0);
        return;
      }

      this.context.gameState.setDragging(true);
      this.context.tweens.killTweensOf(card);
      this.context.tweens.killTweensOf(card.visualElements);

      this.context.tweens.add({
        targets: card,
        scale: COMPONENTS.CARD.SCALES.DEFAULT_HAND,
        duration: ANIMATIONS.DURATIONS.UI_POP,
        ease: ANIMATIONS.EASING.SMOOTH,
      });
      card.setDepth(DEPTHS.DRAGGING_CARD);
    });

    card.on(
      "drag",
      (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        if (this.isSelectionLocked()) return;

        card.visualElements.setY(0);
        card.visualElements.setScale(1);
        card.setPosition(dragX, dragY);
      },
    );

    card.on("dragend", (_pointer: Phaser.Input.Pointer, dropped: boolean) => {
      this.context.gameState.setDragging(false);
      const activeSide = this.context.gameState.activePlayer;
      if (!dropped) this.context.getHand(activeSide).reorganizeHand();
      this.context.tweens.add({
        targets: card,
        scale: COMPONENTS.CARD.SCALES.DEFAULT_HAND,
        duration: ANIMATIONS.DURATIONS.PREVIEW,
        ease: ANIMATIONS.EASING.BOUNCE,
      });
    });

    card.on(
      "drop",
      (_pointer: Phaser.Input.Pointer, targetZone: Phaser.GameObjects.Zone) => {
        if (this.isSelectionLocked()) return;
        this.context.handleCardDrop(targetZone, card);
      },
    );
  }

  //this lock prevents everythin (void click, drag cards, hover effect) << to use in revive mode
  public isSelectionLocked(): boolean {
    return (
      this.context.effects.isSelectingTarget && !!this.context.selectedCard
    );
  }

  //lock prevents hover action
  private shouldBlockHover(): boolean {
    return this.context.gameState.isDragging || this.isSelectionLocked();
  }
}
