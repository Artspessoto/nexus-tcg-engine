import type { Card } from "../objects/Card";
import type { BattleScene } from "../scenes/BattleScene";
import type { CardEffect } from "../types/EffectTypes";
import type { GameSide } from "../types/GameTypes";

export class EffectManager {
  private scene: BattleScene;
  private handlerEffects: Record<
    string,
    (effect: CardEffect, side: GameSide, source: Card) => void
  >;

  constructor(scene: BattleScene) {
    this.scene = scene;

    this.handlerEffects = {
      BURN: (effect, side) =>
        this.scene.getUIManager(side).updateLP(side, -(effect.value || 0)),
      HEAL: (effect, side) =>
        this.scene.getUIManager(side).updateLP(side, effect.value || 0),
      DRAW_CARD: (effect, side) => this.handleDraw(effect, side),
      GAIN_MANA: (effect, side) =>
        this.scene.getUIManager(side).updateMana(effect.value || 0),
    };
  }

  public applyCardEffect(card: Card) {
    const effect = card.getCardData().effects;
    if (!effect) return;

    const targets = this.getEffectTargets(
      card.owner,
      effect.targetSide || "OPPONENT",
    );

    targets.forEach((side) => {
      this.executeCardEffect(effect, side, card);
    });
  }

  private executeCardEffect(
    effect: CardEffect,
    side: GameSide,
    sourceCard: Card,
  ) {
    const handler = this.handlerEffects[effect.type];

    if (handler) {
      handler(effect, side, sourceCard);
    } else {
      console.log(`${effect.type} não criado até o momento`);
    }
  }

  private handleDraw(effect: CardEffect, side: GameSide) {
    const count = effect.value || 0;
    const hand = this.scene.getHandManager(side);
    const deck = this.scene.getDeckManager(side);
    for (let i = 0; i < count; i++) {
      hand.drawCard(deck.position);
    }
  }

  private getEffectTargets(owner: GameSide, targetSide: string): GameSide[] {
    const opponent = owner == "PLAYER" ? "OPPONENT" : "PLAYER";
    if (targetSide == "OWNER") return [owner];
    if (targetSide == "OPPONENT") return [opponent];

    return ["PLAYER", "OPPONENT"];
  }
}
