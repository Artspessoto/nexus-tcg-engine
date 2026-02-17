import { BattleScene } from "../scenes/BattleScene";
import type { BattleTranslations, GamePhase } from "../types/GameTypes";

export class PhaseManager {
  private scene: BattleScene;
  private phaseTimer?: Phaser.Time.TimerEvent;

  constructor(scene: BattleScene) {
    this.scene = scene;
  }

  public updateUI(phase: GamePhase, translations: BattleTranslations) {
    if (this.phaseTimer) {
      this.phaseTimer.remove();
      this.phaseTimer = undefined;
    }

    const { phaseButton, currentUI } = this.scene;
    const isPlayerTurn = this.scene.gameState.activePlayer == "PLAYER";
    const currentTurn = this.scene.gameState.currentTurn;

    switch (phase) {
      case "DRAW":
        phaseButton.setVisible(false);

        if (isPlayerTurn) {
          currentUI.showNotice(translations.draw_phase, "PHASE");
        } else {
          currentUI.showNotice(translations.opponent_draw, "PHASE");
        }
        break;
      case "MAIN":
        if (currentTurn == 1) {
          const turnMessage = `${translations.turn_label} ${currentTurn}`;
          currentUI.showNotice(turnMessage, "TURN");

          this.phaseTimer = this.scene.time.delayedCall(1500, () => {
            currentUI.showNotice(translations.main_phase, "PHASE");
          });
        } else {
          currentUI.showNotice(translations.main_phase, "PHASE");
        }

        if (isPlayerTurn) {
          const buttonText =
            currentTurn == 1
              ? translations.battle_buttons.end_turn
              : translations.battle_buttons.to_battle;
          this.handleButtonTransition(buttonText);
        } else {
          phaseButton.setVisible(false);
        }
        break;
      case "BATTLE":
        currentUI.showNotice(translations.battle_phase, "PHASE");
        phaseButton
          .setVisible(isPlayerTurn)
          .setText(translations.battle_buttons.end_turn);
        break;
      case "CHANGE_TURN":
        this.scene.tweens.killTweensOf(phaseButton);
        phaseButton.setVisible(false).setAlpha(1);
        phaseButton.setText(translations.battle_buttons.to_battle);

        currentUI.showNotice(translations.turn_ended, "NEUTRAL");

        this.scene.fieldManager.resetAttackFlags();

        this.scene.time.delayedCall(1200, () => {
          currentUI.showNotice(`TURNO ${currentTurn}`, "PHASE");

          this.scene.time.delayedCall(1200, () => {
            const activePlayer = !isPlayerTurn
              ? translations.your_turn
              : translations.opponent_turn;
            currentUI.showNotice(activePlayer, "PHASE");

            this.scene.time.delayedCall(1000, () => {
              this.scene.finalizeTurnTransition();
            });
          });
        });

        return;
    }
  }

  private handleButtonTransition(text: string) {
    this.scene.phaseButton.setVisible(false);
    this.scene.time.delayedCall(500, () => {
      this.scene.phaseButton.setVisible(true).setText(text);
      this.scene.phaseButton.setAlpha(0);
      this.scene.tweens.add({
        targets: this.scene.phaseButton,
        alpha: 1,
        duration: 300,
      });
    });
  }
}
