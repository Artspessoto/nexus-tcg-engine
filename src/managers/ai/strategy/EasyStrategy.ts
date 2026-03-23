import type { IAIStrategy } from "../../../interfaces/IAIStrategy";
import type { IBattleContext } from "../../../interfaces/IBattleContext";
import type { Card } from "../../../objects/Card";
import type { GameSide, Move } from "../../../types/GameTypes";
import { FieldAnalyzer } from "../FieldAnalyzer";

export class EasyStrategy implements IAIStrategy {
  public readonly context: IBattleContext;
  public readonly side: GameSide = "OPPONENT";

  constructor(context: IBattleContext) {
    this.context = context;
  }

  public async playMainPhase(): Promise<void> {
    let actionMoves = 5;
    let turnActive = true;

    while (actionMoves > 0  && turnActive) {
      const moves = this.generateMoves();

      const betterChoice = this.chooseBestMove(moves);

      if(!betterChoice || betterChoice.type == "PASS") {
        turnActive = false;
        break;
      }

      await this.delay(1200);
      await this.executeMove(betterChoice);

      actionMoves--;
    }
  }

  public async playBattlePhase(): Promise<void> {}

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
        finalScore += 30;
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

    //efficient cost (atk + def / mana cost)
    if (
      mostEfficient &&
      card.getCardData().id == mostEfficient.getCardData().id
    ) {
      actionScore += 50;
    }

    //atk value
    if (
      strongestOption &&
      card.getCardData().id == strongestOption.getCardData().id
    ) {
      actionScore += 40;
    }

    //field analyze advantage
    const advantage = FieldAnalyzer.getFieldSideAdvantage(this.context);
    //NPC being at a disadvantage => monster with high defense priority
    if (advantage < 0) {
      actionScore += (card.getCardData().def || 0) * 0.5;
    }

    return actionScore;
  }

  private evaluateAttack(attacker: Card, target?: Card): number {
    if (!target) return 100;

    const playerField: (Card | null)[] = this.context.field.monsterSlots.PLAYER;
    let baseAtkScore = 50;

    const weakestTarget = FieldAnalyzer.getWeaknessPlayerTarget(playerField);
    const strongestTarget = FieldAnalyzer.getStrongestPlayerTarget(playerField);

    if (
      weakestTarget &&
      target.getCardData().id == weakestTarget.getCardData().id
    ) {
      baseAtkScore += 30;
    }

    if (
      strongestTarget &&
      target.getCardData().id === strongestTarget.getCardData().id
    ) {
      // gain bonus if attacker wins against strongest player card
      if (attacker.getCardData().atk! > strongestTarget.getCardData().atk!) {
        baseAtkScore += 20;
      } else {
        baseAtkScore -= 20;
      }
    }

    return baseAtkScore;
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
    }
  }

  private delay(ms: number) {
    return new Promise((resolve) => this.context.time.delayedCall(ms, resolve));
  }
}
