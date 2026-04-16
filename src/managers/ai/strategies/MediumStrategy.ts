import { EFFECTS_REQUIRING_TARGET } from "../../../constants/AIConfig";
import type { IBattleContext } from "../../../interfaces/IBattleContext";
import type { Card } from "../../../objects/Card";
import type { Move } from "../../../types/GameTypes";
import type {
  FieldSnapshot,
  FieldSynergies,
} from "../../../types/StrategyTypes";
import { EffectAnalyzer } from "../analyzers/EffectAnalyzer";
import { FieldAnalyzer } from "../analyzers/FieldAnalyzer";
import { BaseStrategy } from "../core/BaseStrategy";
import { MediumEvaluator } from "../evaluators/MediumEvaluator";

export class MediumStrategy extends BaseStrategy {
  constructor(context: IBattleContext) {
    super(context, new MediumEvaluator(context));
  }

  protected override calculateSynergies(
    hand: Card[],
    npcMonsters: Card[],
    npcSupports: Card[],
  ): FieldSynergies {
    const allAvailableEffects = [
      ...hand,
      ...npcMonsters,
      ...npcSupports,
    ].filter((c) => c.getCardData().effects);
    return {
      hasKillTraps: hand.some(
        (c) =>
          c.getType() == "TRAP" &&
          ["DESTROY", "BOUNCE"].includes(c.getCardData().effects?.type || ""),
      ),
      atkModifiers: allAvailableEffects.filter((c) =>
        c.getCardData().effects?.type.includes("ATK"),
      ),
      posModifiers: allAvailableEffects.filter(
        (c) => c.getCardData().effects?.type == "CHANGE_POS",
      ),
      protectionCards: allAvailableEffects.filter(
        (c) => c.getCardData().effects?.type == "PROTECT",
      ),
    };
  }

  protected getHandMoves(playableCards: Card[], snapshot: FieldSnapshot) {
    const moves: Move[] = [];

    //monster options
    for (const card of playableCards) {
      if (card.getType().includes("MONSTER")) {
        const slot = this.context.field.getFirstAvailableSlot(
          this.side,
          "MONSTER",
        );

        if (slot !== null) {
          moves.push({
            card,
            mode: this.determineOptimalPlacementMode(card, snapshot),
            slot,
            type: "PLAY_MONSTER",
          });
        }
      }
    }

    //support options
    for (const card of playableCards) {
      if (card.getType() == "SPELL" || card.getType() == "TRAP") {
        const effect = card.getCardData().effects;
        if (!effect) continue;

        const slot = this.context.field.getFirstAvailableSlot(
          this.side,
          "SPELL",
        );

        const target = this.evaluator.getBestTarget(effect, snapshot);

        if (EFFECTS_REQUIRING_TARGET.includes(effect.type) && !target) {
          continue;
        }

        if (slot !== null) {
          const mode = card.getType() === "SPELL" ? "FACE_UP" : "SET";
          const monsterToEvaluate =
            effect.type === "REVIVE" && target ? target : card;
          const revivalMonsterPlacementMode: "ATK" | "DEF" =
            this.determineOptimalPlacementMode(monsterToEvaluate, snapshot);

          moves.push({
            card,
            mode,
            type: "PLAY_SPELL",
            slot,
            params: { mode: revivalMonsterPlacementMode, target },
          });
        }
      }
    }

    return moves;
  }

  protected getFieldMoves(snapshot: FieldSnapshot): Move[] {
    const fieldMonsters = FieldAnalyzer.getValidFieldCards(
      snapshot.npcMonsters,
    );
    // const fieldSupports = FieldAnalyzer.getValidFieldCards(
    //   this.context.field.spellSlots.OPPONENT,
    // );

    const moves: Move[] = [];

    for (const monster of fieldMonsters) {
      const hasAdvantage = FieldAnalyzer.getSimpleFieldSideAdvantage(
        this.context,
      );
      const isFaceDown = monster.isFaceDown;
      const isAtkMode = monster.isAtkMode;
      const currentTurn = this.context.gameState.currentTurn;
      const hasWaited = currentTurn > monster.setTurn;

      const canChangePos =
        hasWaited && !monster.hasChangedPosition && !monster.hasAttacked;

      if (!canChangePos) {
        continue;
      }

      if (hasAdvantage < 0 && isAtkMode) {
        moves.push({
          type: "CHANGE_POS",
          card: monster,
          newMode: "DEF",
          isFlip: false,
        });
      } else if (isFaceDown) {
        moves.push({
          type: "CHANGE_POS",
          card: monster,
          newMode: "FACE_UP",
          isFlip: true,
        });
      }
    }

    return moves;
  }

  protected override determineOptimalPlacementMode(
    monsterToPlay: Card,
    data: FieldSnapshot,
  ): "ATK" | "DEF" {
    const { advantage, currentMana } = data;
    const monsterData = monsterToPlay.getCardData();
    const remainingMana = currentMana - monsterData.manaCost;

    if (this.canSwingGameWithBuff(remainingMana)) return "ATK";

    if (advantage.isThreatened) return "DEF";

    if (advantage.isWinning) return "ATK";

    return "DEF";
  }

  private canSwingGameWithBuff(remainingMana: number): boolean {
    const hand = this.context.getHand(this.side).hand;
    const buff = hand.find(
      (card) =>
        card.getType() === "SPELL" &&
        card.getCardData().effects?.type === "BOOST_ATK" &&
        card.getCardData().manaCost <= remainingMana,
    );

    if (!buff) return false;

    const buffValue = buff.getCardData().effects?.value || 0;
    const potential = EffectAnalyzer.analyzeCombatStatShiftPotential(
      this.context,
      buffValue,
      "atk",
      true,
      remainingMana,
      "ALL",
    );

    return potential.isGameChanger;
  }
}
