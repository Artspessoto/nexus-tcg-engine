import type { IAIStrategy } from "../../../interfaces/IAIStrategy";
import type { IBattleContext } from "../../../interfaces/IBattleContext";
import type { Card } from "../../../objects/Card";
import type { GameSide, Move } from "../../../types/GameTypes";
import { FieldAnalyzer } from "../analyzers/FieldAnalyzer";

export class EasyStrategy implements IAIStrategy {
  public readonly context: IBattleContext;
  public readonly side: GameSide = "OPPONENT";

  constructor(context: IBattleContext) {
    this.context = context;
  }

  public async playMainPhase(): Promise<void> {
    let safetyBreak = 0; //security lock (preventing bugs)

    while (safetyBreak < 15) {
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
    const hand = this.context.getHand(this.side).hand;
    const currentMana = this.context.gameState.getMana(this.side);

    const playableCards = FieldAnalyzer.getPlayableCards(hand, currentMana);

    if (currentPhase == "MAIN") {
      const mainMoves = this.mainPhaseAvailableMoves(playableCards);
      moves.push(...mainMoves);
    }

    if (currentPhase == "BATTLE") {
      const battleMoves = this.battlePhaseAvailableMoves();
      moves.push(...battleMoves);
    }

    moves.push({ type: "PASS" });

    return moves;
  }

  private mainPhaseAvailableMoves(playableCards: Card[]): Move[] {
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
        const slot = this.context.field.getFirstAvailableSlot(
          this.side,
          "SPELL",
        );

        if (slot !== null) {
          const mode = card.getType() === "SPELL" ? "FACE_UP" : "SET";
          moves.push({
            card,
            mode,
            type: "PLAY_SPELL",
            slot,
          });
        }
      }
    }

    return moves;
  }

  private battlePhaseAvailableMoves(): Move[] {
    const moves: Move[] = [];
    const NPCMonsters = this.context.field.monsterSlots.OPPONENT;
    const playerMonsters = this.context.field.monsterSlots.PLAYER;

    const attackers = FieldAnalyzer.getValidMonsters(NPCMonsters);
    const targets = FieldAnalyzer.getValidMonsters(playerMonsters);

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
    let finalScore: number = 0;

    if (move.type == "PASS") return 5;

    switch (move.type) {
      case "PLAY_MONSTER":
        finalScore += this.evaluateMonsterPlay(move.card);
        break;
      case "PLAY_SPELL":
        finalScore += 0;
        break;
      case "ATTACK":
        finalScore += this.evaluateAttack(move.attacker, move.target);
        break;
    }

    return finalScore;
  }

  private evaluateMonsterPlay(card: Card): number {
    let actionScore: number = 0;
    const hand = this.context.getHand(this.side).hand;
    const currentMana = this.context.gameState.getMana(this.side);

    const mostEfficient = FieldAnalyzer.getMostEfficientMonster(
      hand,
      currentMana,
    );
    const strongestOption = FieldAnalyzer.getStrongestMonsterOption(
      hand,
      currentMana,
      "ATK",
    );
    const numericMonstersAdvantage = FieldAnalyzer.hasNumericMonstersAdvantage(
      this.context,
    );

    //efficient cost (atk + def / mana cost)
    if (
      mostEfficient && !numericMonstersAdvantage &&
      card.getCardData().id == mostEfficient.getCardData().id
    ) {
      actionScore += 50;
    }

    //atk value
    if (
      strongestOption && !numericMonstersAdvantage &&
      card.getCardData().id == strongestOption.getCardData().id
    ) {
      actionScore += 40;
    }

    //field analyze advantage
    const advantage = FieldAnalyzer.getFieldSideAdvantage(this.context);

    //NPC being at a disadvantage => monster with high defense priority
    if (advantage < 0 || !numericMonstersAdvantage) {
      actionScore += (card.getCardData().def || 0) * 0.5;
    }

    return actionScore;
  }

  private evaluateAttack(attacker: Card, target?: Card): number {
    if (!target) return 100;

    let baseScore = 50;
    const attackerAtk = attacker.getCardData().atk || 0;
    const targetData = target.getCardData();
    const targetIsFaceDown = target.isFaceDown;

    let targetValue = 0;
    const isDefenseMode = target.angle === -90 || targetIsFaceDown;

    if (targetIsFaceDown) {
      targetValue = 5; //lower defense value for AI (easy) priorize attack
      baseScore += 40;
    } else {
      targetValue = isDefenseMode ? targetData.def || 0 : targetData.atk || 0;
    }

    //NPC monster with advantage against the player's monster (atk > atk || atk > def)
    if (attackerAtk > targetValue) {
      baseScore += 30;
    }
    // equal 1x1
    else if (attackerAtk == targetValue) {
      const finalPrediction =
        FieldAnalyzer.continueWithAdvantageAfterCombatTrade(
          this.context,
          isDefenseMode,
        );

      if (finalPrediction.hasDisadvantage) {
        baseScore -= 70;
      } else if (finalPrediction.hasAdvantage) {
        baseScore += 40;
      } else {
        baseScore -= 20;
      }
    }
    //no advantage against the player's monster
    else {
      baseScore -= 50;
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

  public async executeMove(move: Move) {
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
          this.context.cardActivation(move.card, this.side);
        }
        break;
      case "ATTACK":
        this.context.onAttackDeclared(move.attacker, move.target);
        break;
    }
  }

  private delay(ms: number) {
    return new Promise((resolve) => this.context.time.delayedCall(ms, resolve));
  }
}
