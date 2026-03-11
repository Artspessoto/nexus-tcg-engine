import { THEME_CONFIG } from "../constants/ThemeConfig";
import { EventBus } from "../events/EventBus";
import { GameEvent, type PhaseChangedPayload } from "../events/GameEvents";
import type { IBattleContext } from "../interfaces/IBattleContext";
import type { IPhaseManager } from "../interfaces/IPhaseManager";
import type { ToonButton } from "../objects/ToonButton";
import type { BattleTranslations, GamePhase } from "../types/GameTypes";

export class PhaseManager implements IPhaseManager {
  private context: IBattleContext;
  private phaseTimer?: Phaser.Time.TimerEvent;
  private turn!: string;

  constructor(context: IBattleContext) {
    this.context = context;

    EventBus.on(GameEvent.PHASE_CHANGED, (data: PhaseChangedPayload) => {
      this.updateUI(data.newPhase, this.context.translationText);
    });
  }

  public updateUI(phase: GamePhase, translations: BattleTranslations) {
    if (this.phaseTimer) {
      this.phaseTimer.remove();
      this.phaseTimer = undefined;
    }
    const { PHASE } = THEME_CONFIG.COMPONENTS.BUTTONS;
    const { phaseButton } = this.context;
    const currentUI = this.context.getUI(this.context.gameState.activePlayer);
    const isPlayerTurn = this.context.gameState.activePlayer == "PLAYER";
    const currentTurn = this.context.gameState.currentTurn;

    this.turn = `${this.context.translationText.turn_label} ${currentTurn}`;

    phaseButton.setVisible(true);

    switch (phase) {
      case "DRAW":
        if (isPlayerTurn) {
          currentUI.showNotice(translations.draw_phase, "PHASE");
          phaseButton.setAlpha(1).updatePhase(this.turn, "DRAW", PHASE.color);
          phaseButton.disableInteractive();
        } else {
          currentUI.showNotice(translations.opponent_draw, "PHASE");
          this.setOpponentState(phaseButton);
        }
        break;
      case "MAIN":
        currentUI.showNotice(translations.main_phase, "PHASE");

        if (isPlayerTurn) {
          const buttonText =
            currentTurn == 1
              ? translations.battle_buttons.end_turn
              : translations.battle_buttons.to_battle;

          phaseButton.setInteractive().setAlpha(1);
          phaseButton.updatePhase(this.turn, buttonText, PHASE.color);
        } else {
          this.setOpponentState(phaseButton);
        }
        break;
      case "BATTLE":
        currentUI.showNotice(translations.battle_phase, "PHASE");

        if (isPlayerTurn) {
          phaseButton
            .setInteractive()
            .setAlpha(1)
            .updatePhase(
              this.turn,
              translations.battle_buttons.end_turn,
              PHASE.color,
            );
        } else {
          this.setOpponentState(phaseButton);
        }
        break;
      case "CHANGE_TURN":
        this.context.tweens.killTweensOf(phaseButton);
        phaseButton.disableInteractive();
        phaseButton.setDisabledState(this.context.translationText.opponent);

        currentUI.showNotice(translations.turn_ended, "NEUTRAL");

        this.context.time.delayedCall(1500, () => {
          this.context.finalizeTurnTransition();
        });

        return;
    }
  }

  private setOpponentState(button: ToonButton) {
    this.context.tweens.killTweensOf(button);
    button.setDisabledState(this.context.translationText.opponent);
  }
}
