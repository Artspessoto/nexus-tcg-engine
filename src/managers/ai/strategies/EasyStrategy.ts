import { LAYOUT_CONFIG } from "../../../constants/LayoutConfig";
import type { IAIStrategy } from "../../../interfaces/IAIStrategy";
import type { IBattleContext } from "../../../interfaces/IBattleContext";
import type { Card } from "../../../objects/Card";
import type { BurnAnalysis } from "../../../types/AnalyzerTypes";
import type { CardEffect } from "../../../types/EffectTypes";
import type { GameSide, Move } from "../../../types/GameTypes";
import { EffectAnalyzer } from "../analyzers/EffectAnalyzer";
import { FieldAnalyzer } from "../analyzers/FieldAnalyzer";

export class EasyStrategy implements IAIStrategy {
  public readonly context: IBattleContext;
  public readonly side: GameSide = "OPPONENT";

  constructor(context: IBattleContext) {
    this.context = context;
  }

  public async playMainPhase(): Promise<void> {
    let safetyBreak = 0; //security lock (preventing bugs)

    //limit AI to 10 moves
    while (safetyBreak < 10) {
      const moves = this.generateMoves();

      const betterChoice = this.chooseBestMove(moves);

      if (!betterChoice || betterChoice.type == "PASS") {
        break;
      }

      await this.delay(1200);
      await this.executeMove(betterChoice);

      safetyBreak++;
    }
  }

  public async playBattlePhase(): Promise<void> {
    let safety = 0;

    while (safety < 3) {
      const moves = this.generateMoves();

      const combatMoves = moves.filter(
        (action) => action.type == "ATTACK" || action.type == "PASS",
      );
      const bestAttack = this.chooseBestMove(combatMoves);

      if (!bestAttack || bestAttack.type == "PASS") break;

      await this.executeMove(bestAttack);
      await this.delay(1200);

      safety++;
    }
  }

  public generateMoves(): Move[] {
    const moves: Move[] = [];
    const currentPhase = this.context.currentPhase;

    if (currentPhase == "MAIN") {
      const mainMoves = this.mainPhaseAvailableMoves();
      moves.push(...mainMoves);
    }

    if (currentPhase == "BATTLE") {
      const battleMoves = this.battlePhaseAvailableMoves();
      moves.push(...battleMoves);
    }

    moves.push({ type: "PASS" });

    return moves;
  }

  public mainPhaseAvailableMoves(): Move[] {
    const hand = this.context.getHand(this.side).hand;
    const currentMana = this.context.gameState.getMana(this.side);
    const playableCards = FieldAnalyzer.getPlayableCards(hand, currentMana);

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
            mode: "ATK",
            slot,
            type: "PLAY_MONSTER",
          });
        }
      }
    }

    //spell and trap options
    for (const card of playableCards) {
      if (card.getType() == "SPELL" || card.getType() == "TRAP") {
        const effect = card.getCardData().effects;
        if (!effect) continue;

        const slot = this.context.field.getFirstAvailableSlot(
          this.side,
          "SPELL",
        );

        const needsTarget = [
          "DESTROY",
          "BOUNCE",
          "NERF_ATK",
          "BOOST_ATK",
          "REVIVE",
          "CHANGE_POS",
        ];
        const target = this.getBestTargetToApplyEffect(effect!);

        if (needsTarget.includes(effect.type) && !target) {
          continue;
        }

        if (slot !== null) {
          const mode = card.getType() === "SPELL" ? "FACE_UP" : "SET";
          const revivalMonsterPlacementMode: "ATK" | "DEF" = "ATK";

          moves.push({
            card,
            mode,
            type: "PLAY_SPELL",
            params: { target, mode: revivalMonsterPlacementMode },
            slot,
          });
        }
      }
    }

    return moves;
  }

  public battlePhaseAvailableMoves(): Move[] {
    const moves: Move[] = [];
    const NPCMonsters = this.context.field.monsterSlots.OPPONENT;
    const playerMonsters = this.context.field.monsterSlots.PLAYER;

    const attackers = FieldAnalyzer.getValidFieldCards(NPCMonsters);
    const targets = FieldAnalyzer.getValidFieldCards(playerMonsters);

    attackers.forEach((attacker) => {
      if (!attacker) return;

      if (!attacker.isFaceDown && !attacker.hasAttacked) {
        if (targets.length > 0) {
          targets.forEach((target) => {
            moves.push({ type: "ATTACK", attacker, target });
          });
        } else {
          moves.push({ type: "ATTACK", attacker });
        }
      }
    });

    return moves;
  }

  public evaluateMove(move: Move): number {
    if (move.type == "PASS") return 2;

    let finalScore: number = 0;
    let cardInvolved: Card | null = null;

    switch (move.type) {
      case "PLAY_MONSTER":
        cardInvolved = move.card;
        finalScore += this.evaluateMonsterPlay(move.card);
        break;
      case "PLAY_SPELL":
        cardInvolved = move.card;
        finalScore += this.evaluateSupport(move.card, move.params);
        break;
      case "ATTACK":
        cardInvolved = move.attacker;
        finalScore += this.evaluateAttack(move.attacker, move.target);
        break;
    }

    if (cardInvolved) {
      finalScore += cardInvolved.getCardData().manaCost * 10;
    }

    return finalScore;
  }

  private getBestTargetToApplyEffect(effect: CardEffect): Card | null {
    const playerField = this.context.field.monsterSlots.PLAYER;
    const playerSpells = this.context.field.spellSlots.PLAYER;
    const npcField = this.context.field.monsterSlots.OPPONENT;

    const offensiveEffects = ["NERF_ATK", "BOUNCE", "CHANGE_POS"];
    const defensiveEffects = ["BOOST_ATK", "BOOST_DEF", "PROTECT"];

    if (offensiveEffects.includes(effect.type)) {
      const targetStat = effect.type === "CHANGE_POS" ? "DEF" : "ATK";

      const monsterTarget = FieldAnalyzer.getStrongestMonsterTarget(
        playerField,
        targetStat,
      );

      return monsterTarget
        ? monsterTarget
        : playerField.filter((m) => m !== null)[0];
    }

    if (defensiveEffects.includes(effect.type)) {
      return FieldAnalyzer.getStrongestMonsterTarget(npcField, "ATK") || null;
    }

    if (effect.type == "DESTROY") {
      if (effect.targetType == "SPELL" || effect.targetType == "TRAP") {
        const validTargets = playerSpells.filter(
          (s) => s !== null && s.getType() == effect.targetType,
        );

        return validTargets[0] || null;
      }

      return (
        FieldAnalyzer.getStrongestMonsterTarget(playerField, "ATK") || null
      );
    }

    if (effect.type == "REVIVE") {
      const targetType = effect.targetType;

      return (
        EffectAnalyzer.analyzeRevivePotential(
          this.context,
          effect.targetSide || "OWNER",
          targetType,
        ) || null
      );
    }

    return null;
  }

  private evaluateMonsterPlay(card: Card): number {
    let actionScore: number = 80;
    const hand = this.context.getHand(this.side).hand;
    const currentMana = this.context.gameState.getMana(this.side);

    const mostEfficient = FieldAnalyzer.getMostEfficientMonster(
      hand,
      currentMana,
    );
    const strongestOption = FieldAnalyzer.getStrongestMonsterOptionOnHand(
      hand,
      currentMana,
      "ATK",
    );
    const numericMonstersAdvantage = FieldAnalyzer.hasNumericMonstersAdvantage(
      this.context,
    );

    //efficient cost (atk + def / mana cost)
    if (
      mostEfficient &&
      !numericMonstersAdvantage &&
      card.getCardData().id == mostEfficient.getCardData().id
    ) {
      actionScore += 50;
    }

    //atk value
    if (
      strongestOption &&
      !numericMonstersAdvantage &&
      card.getCardData().id == strongestOption.getCardData().id
    ) {
      actionScore += 40;
    }

    //field analyze advantage
    const advantage = FieldAnalyzer.getSimpleFieldSideAdvantage(this.context);

    //NPC being at a disadvantage => monster with high defense priority
    if (advantage < 0 || !numericMonstersAdvantage) {
      actionScore += (card.getCardData().def || 0) * 0.5;
    }

    return actionScore;
  }

  private evaluateAttack(attacker: Card, target?: Card | null): number {
    if (!target) return 150;

    const attackerAtk = attacker.getCardData().atk || 0;
    const targetData = target.getCardData();
    const isDefenseMode = target.angle === -90 || target.isFaceDown;

    if (target.isFaceDown) {
      //impulsive action, ignores the enemy support and other problems
      return 200;
    }

    const targetValue = isDefenseMode
      ? targetData.def || 0
      : targetData.atk || 0;

    //NPC monster with advantage against the player's monster (atk > atk || atk > def)
    if (attackerAtk > targetValue) {
      return 100 + (attackerAtk - targetValue);
    }
    // equal 1x1
    else if (attackerAtk == targetValue) {
      return 60;
      //predicition implements into medium strategy
      // const finalPrediction =
      //   FieldAnalyzer.continueWithAdvantageAfterCombatTrade(
      //     this.context,
      //     isDefenseMode,
      //   );

      // if (finalPrediction.hasDisadvantage) {
      //   baseScore -= 70;
      // } else if (finalPrediction.hasAdvantage) {
      //   baseScore += 40;
      // } else {
      //   baseScore -= 20;
      // }
    }

    return -50;
  }

  public evaluateSupport(
    card: Card,
    params?: { target?: Card | null },
  ): number {
    const effect = card.getCardData().effects;
    if (!effect) return 0;

    const needTarget = [
      "DESTROY",
      "BOUNCE",
      "NERF_ATK",
      "BOOST_ATK",
      "REVIVE",
      "CHANGE_POS",
    ];

    if (needTarget.includes(effect.type) && !params?.target) return 0;

    let baseScore = 0;
    const effectValue = effect.value || 0;
    const totalLP = LAYOUT_CONFIG.GAME_STATE.BASE_LP;

    switch (effect.type) {
      case "BURN": {
        const burn: BurnAnalysis = EffectAnalyzer.analyzeBurnImpact(
          this.context,
          effect.value,
        );
        if (burn.isLethal) return 9999;
        baseScore +=
          EffectAnalyzer.getRelativeImpact(effectValue, totalLP) * 1000;

        if (burn.damagePotential > totalLP * 0.5) baseScore += 30;
        break;
      }
      case "HEAL": {
        const healPriority = EffectAnalyzer.analyzeHealUrgency(this.context);
        baseScore +=
          EffectAnalyzer.getRelativeImpact(healPriority, totalLP) * 200;
        break;
      }
      case "BOOST_ATK": {
        const currentMana = this.context.gameState.getMana(this.side);
        const buff = EffectAnalyzer.analyzeCombatStatShiftPotential(
          this.context,
          effectValue,
          "atk",
          true,
          currentMana,
          "STRONGEST",
        );
        if (buff.isGameChanger) baseScore += 150;
        baseScore += buff.targetValue * 2;
        break;
      }
      case "DRAW_CARD": {
        const neededCards = EffectAnalyzer.analyzeCardUrgency(this.context);
        baseScore += neededCards * 25;
        break;
      }
      case "DESTROY": {
        if (
          effect.targetType == "MONSTER" ||
          effect.targetType == "EFFECT_MONSTER"
        ) {
          const destructionValue =
            EffectAnalyzer.analyzeMonsterDestructionValue(this.context);
          baseScore += destructionValue * 1.5;
        } else {
          baseScore += 20;
        }

        break;
      }
      case "BOUNCE": {
        // const bounce: BounceAnalysis = EffectAnalyzer.analyzeBouncePotential(this.context);
        // medium strategy => baseScore += bounce.targetAtk * 0.05 + bounce.manaCost * 20;
        baseScore += 10;
        break;
      }
      case "REVIVE": {
        const emptySlots = this.context.field.monsterSlots.OPPONENT.filter(
          (m) => m === null,
        ).length;

        if (emptySlots) return -500;

        const targetType = effect.targetType;
        const bestCard = EffectAnalyzer.analyzeRevivePotential(
          this.context,
          effect.targetSide || "OWNER",
          targetType,
        );

        if (bestCard) {
          const reviveValuation = bestCard.getCardData().atk || 0;
          baseScore += reviveValuation * 1.2;
        } else {
          baseScore = -500;
        }
        break;
      }
    }

    return baseScore;
  }

  public chooseBestMove(moves: Move[]): Move {
    const finalScored = moves.map((move) => ({
      move,
      score: this.evaluateMove(move),
    }));

    finalScored.sort((a, b) => b.score - a.score);
    return finalScored[0].move;
  }

  public async executeMove(move: Move): Promise<void> {
    switch (move.type) {
      case "PLAY_MONSTER":
        this.context.executePlay(
          move.card,
          this.side,
          "MONSTER",
          move.slot,
          move.mode,
        );
        break;
      case "PLAY_SPELL":
        this.context.executePlay(
          move.card,
          this.side,
          "SPELL",
          move.slot,
          move.mode,
        );
        if (move.mode === "FACE_UP") {
          await this.delay(800);
          await this.context.cardActivation(move.card, this.side, move.params);
        }
        break;
      case "ATTACK":
        await this.context.onAttackDeclared(move.attacker, move.target);
        break;
    }
  }

  public async delay(ms: number): Promise<Phaser.Time.TimerEvent> {
    return new Promise((resolve) => this.context.time.delayedCall(ms, resolve));
  }
}
