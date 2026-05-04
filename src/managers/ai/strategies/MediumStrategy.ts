import {
  ASSUMED_DEF_WHEN_IS_FACEDOWN,
  EFFECTS_REQUIRING_TARGET,
} from "../../../constants/AIConfig";
import type { IBattleContext } from "../../../interfaces/IBattleContext";
import type { Card } from "../../../objects/Card";
import type { Move } from "../../../types/GameTypes";
import type {
  FieldSnapshot,
  FieldSynergies,
} from "../../../types/StrategyTypes";
import { Logger } from "../../../utils/Logger";
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
      hasKillTraps: [...hand, ...npcSupports].some(
        (c) =>
          c.getType() == "TRAP" &&
          (c.isFaceDown || hand.includes(c)) &&
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
    const hand = this.context.getHand(this.side).hand;
    const npcHandCards = hand.map((card) => card.getCardData().nameKey);
    Logger.debug("AI", "NPC Cards", npcHandCards);
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
    const fieldSupports = FieldAnalyzer.getValidFieldCards(
      snapshot.npcSupports,
    );

    const moves: Move[] = [];

    //position change
    for (const monster of fieldMonsters) {
      this.addPositionChangeMoves(monster, snapshot, moves);
    }

    //active monster effect
    for (const monster of fieldMonsters) {
      this.addActivationMonsterEffectMoves(monster, snapshot, moves);
    }

    //active spells or trap effects
    for (const supports of fieldSupports) {
      this.addActivationSupportMoves(supports, snapshot, moves);
    }

    return moves;
  }

  private addActivationSupportMoves(
    support: Card,
    snapshot: FieldSnapshot,
    moves: Move[],
  ) {
    const effect = support.getCardData().effects;

    if (!support.isFaceDown || !effect) return;

    const isTrapCard = support.getType() == "TRAP";
    const currentTurn = this.context.gameState.currentTurn;
    const hasWaited = currentTurn > support.setTurn;

    if (isTrapCard && !hasWaited) return;

    const target = this.evaluator.getBestTarget(effect, snapshot);

    if (EFFECTS_REQUIRING_TARGET.includes(effect.type) && !target) return;

    moves.push({
      type: "ACTIVATE_EFFECT",
      card: support,
      target,
    });
  }

  private addActivationMonsterEffectMoves(
    monster: Card,
    snapshot: FieldSnapshot,
    moves: Move[],
  ): void {
    const effect = monster.getCardData().effects;
    const currentTurn = this.context.gameState.currentTurn;
    const hasWaited = currentTurn > monster.setTurn;

    if (
      !monster.isFaceDown ||
      !effect ||
      !hasWaited ||
      monster.hasActivatedEffect
    )
      return;

    const target = this.evaluator.getBestTarget(effect, snapshot);

    if (EFFECTS_REQUIRING_TARGET.includes(effect.type) && !target) return;

    moves.push({
      type: "ACTIVATE_EFFECT",
      card: monster,
      target,
    });
  }

  private addPositionChangeMoves(
    monster: Card,
    snapshot: FieldSnapshot,
    moves: Move[],
  ): void {
    const { playerMonsters, synergies, currentMana } = snapshot;
    const isFaceDown = monster.isFaceDown;
    const isAtkMode = monster.isAtkMode;
    const currentTurn = this.context.gameState.currentTurn;
    const hasWaited = currentTurn > monster.setTurn;

    const canChangePos =
      hasWaited &&
      !monster.hasChangedPosition &&
      !monster.hasAttacked &&
      monster.location == "FIELD";

    if (!canChangePos) return;

    const strongestEnemy = FieldAnalyzer.getStrongestMonsterTarget(
      playerMonsters,
      "ATK",
    );
    const enemyAtk = strongestEnemy?.getCardData().atk || 0;
    const enemyDef = strongestEnemy?.getCardData().def || 0;
    const myAtk = monster.getCardData().atk || 0;

    //has lettal trap
    const isBaiting = synergies.hasKillTraps;
    //buff game change
    const canTrickToWin = this.hasCombatTrickGameChanger(currentMana, snapshot);
    //change pos trap/spell
    const canExposeDef = synergies.posModifiers.length > 0 && myAtk > enemyDef;

    if (isAtkMode) {
      if (enemyAtk > myAtk && !isBaiting && !canTrickToWin && !canExposeDef) {
        moves.push({
          type: "CHANGE_POS",
          card: monster,
          newMode: "DEF",
          isFlip: false,
        });
      }
    } else {
      const canAttack =
        myAtk > enemyAtk || canTrickToWin || canExposeDef || isBaiting;

      if (canAttack) {
        moves.push({
          type: "CHANGE_POS",
          card: monster,
          newMode: isFaceDown ? "FACE_UP" : "ATK",
          isFlip: isFaceDown,
        });
      }
    }
  }

  protected override determineOptimalPlacementMode(
    monsterToPlay: Card,
    data: FieldSnapshot,
  ): "ATK" | "DEF" {
    const { advantage, currentMana, playerMonsters, synergies } = data;
    const monsterData = monsterToPlay.getCardData();
    const atk = monsterData.atk || 0;
    const remainingMana = currentMana - monsterData.manaCost;

    const strongestEnemy = FieldAnalyzer.getStrongestMonsterTarget(
      playerMonsters,
      "ATK",
    );

    if (!strongestEnemy) {
      if (atk > ASSUMED_DEF_WHEN_IS_FACEDOWN) return "ATK";
    } else {
      const enemyValue = strongestEnemy.isAtkMode
        ? strongestEnemy.getCardData().atk || 0
        : (strongestEnemy.getCardData().def ?? 0);

      if (atk > enemyValue) return "ATK";
    }

    if (this.hasCombatTrickGameChanger(remainingMana, data)) return "ATK";

    if (synergies.hasKillTraps) return "ATK";

    if (advantage.isThreatened) return "DEF";

    if (advantage.isWinning) return "ATK";

    return "DEF";
  }

  private hasCombatTrickGameChanger(
    remainingMana: number,
    snapshot: FieldSnapshot,
  ): boolean {
    const { atkModifiers } = snapshot.synergies;
    const hand = this.context.getHand(this.side).hand;

    for (const modifierCard of atkModifiers) {
      const isFromHand = hand.includes(modifierCard);
      const cost = modifierCard.getCardData().manaCost;

      if (isFromHand && cost > remainingMana) continue;

      const effect = modifierCard.getCardData().effects;
      if (!effect) continue;

      const isBuff = effect.type == "BOOST_ATK";
      const effectValue = effect.value || 0;

      const availableManaForMonster = remainingMana - (isFromHand ? cost : 0);

      const potencial = EffectAnalyzer.analyzeCombatStatShiftPotential(
        this.context,
        effectValue,
        "atk",
        isBuff,
        availableManaForMonster,
        "ALL",
      );

      if (potencial.isGameChanger) {
        return true;
      }
    }

    return false;
  }
}
