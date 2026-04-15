import { EventBus } from "../../../events/EventBus";
import { GameEvent } from "../../../events/GameEvents";
import type { IBattleContext } from "../../../interfaces/IBattleContext";
import type { Card } from "../../../objects/Card";
import type { GameSide, Move } from "../../../types/GameTypes";
import type {
  FieldSnapshot,
  TacticalAdvantage,
} from "../../../types/StrategyTypes";
import { FieldAnalyzer } from "../analyzers/FieldAnalyzer";
import type { IAIStrategy } from "../interfaces/IAIStrategy";
import type { ITacticalEvaluator } from "../interfaces/ITacticalEvaluator";

export abstract class BaseStrategy implements IAIStrategy {
  public readonly side: GameSide = "OPPONENT";

  constructor(
    public readonly context: IBattleContext,
    protected readonly evaluator: ITacticalEvaluator,
  ) {}

  public async playMainPhase(): Promise<void> {
    let safetyBreak = 0;
    while (safetyBreak < 10) {
      const snapshot = this.createFieldSnapshot();
      const moves = this.generateMoves(snapshot);
      const betterChoice = this.chooseBestMove(moves, snapshot);

      if (
        !betterChoice ||
        this.evaluator.shouldStopMainPhase(betterChoice, snapshot)
      ) {
        break;
      }

      await this.delay(1200);
      await this.executeMove(betterChoice);
      safetyBreak++;
    }
  }

  public async playBattlePhase(): Promise<void> {
    let atkLimit = 0;

    while (atkLimit < 3) {
      const snapshot = this.createFieldSnapshot();
      const moves = this.generateMoves(snapshot);

      const combatMoves = moves.filter(
        (m) => m.type == "ATTACK" || m.type == "PASS",
      );
      const bestAttack = this.chooseBestMove(combatMoves, snapshot);

      if (!bestAttack || bestAttack.type == "PASS") break;

      await this.executeMove(bestAttack);
      await this.delay(1200);

      atkLimit++;
    }
  }

  public generateMoves(data: FieldSnapshot): Move[] {
    const moves: Move[] = [];
    const currentPhase = this.context.currentPhase;

    if (currentPhase == "MAIN") {
      moves.push(...this.mainPhaseAvailableMoves(data));
    }

    if (currentPhase == "BATTLE") {
      moves.push(...this.battlePhaseAvailableMoves());
    }

    moves.push({ type: "PASS" });

    return moves;
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

        if (move.mode == "FACE_UP") {
          await this.delay(800);
          await this.context.cardActivation(move.card, this.side, move.params);
        }
        break;
      case "CHANGE_POS":
        move.card.hasChangedPosition = true;

        EventBus.emit(GameEvent.CARD_POSITION_CHANGED, {
          card: move.card,
          isFlip: move.isFlip,
          newMode: move.newMode,
        });

        await this.delay(600);
        break;
      case "ATTACK":
        await this.context.onAttackDeclared(move.attacker, move.target);
        break;
      case "ACTIVATE_EFFECT":
        //reactive priority (active effect of monster or trap)
        await this.delay(1000);
        await this.context.cardActivation(move.card, this.side, {
          target: move.target,
        });
        break;
      default:
        break;
    }
  }

  public mainPhaseAvailableMoves(data: FieldSnapshot): Move[] {
    const hand = this.context.getHand(this.side).hand;
    const playableCards = FieldAnalyzer.getPlayableCards(
      hand,
      data.currentMana,
    );

    const moves: Move[] = [];

    moves.push(...this.getHandMoves(playableCards, data));
    moves.push(...this.getFieldMoves(data));

    return moves;
  }

  public battlePhaseAvailableMoves(): Move[] {
    const attackers = FieldAnalyzer.getValidFieldCards(
      this.context.field.monsterSlots[this.side],
    );
    const targets = FieldAnalyzer.getValidFieldCards(
      this.context.field.monsterSlots.PLAYER,
    );
    const moves: Move[] = [];

    attackers.forEach((attacker) => {
      if (attacker.isFaceDown || attacker.hasAttacked) return;
      if (targets.length > 0) {
        targets.forEach((target) =>
          moves.push({ type: "ATTACK", attacker, target }),
        );
      } else {
        moves.push({ type: "ATTACK", attacker });
      }
    });
    return moves;
  }

  public evaluateMove(move: Move, data: FieldSnapshot): number {
    return this.evaluator.evaluateMove(move, data);
  }

  protected chooseBestMove(moves: Move[], snapshot: FieldSnapshot): Move {
    const scored = moves.map((move) => ({
      move,
      score: this.evaluator.evaluateMove(move, snapshot),
    }));

    return scored.sort((a, b) => b.score - a.score)[0].move;
  }

  protected calculateTacticalAdvantage(): TacticalAdvantage {
    const invincibleEnemies = FieldAnalyzer.getInvincibleMonsters(
      this.context,
      "PLAYER",
    );
    const handDiff = FieldAnalyzer.simpleHandAdvantage(this.context);
    const defDiff = FieldAnalyzer.getDefensiveAdvantageLevel(this.context);

    const isWinning =
      invincibleEnemies.length === 0 && (handDiff >= 0 || defDiff > 0);

    return {
      isWinning,
      defensiveGap: defDiff,
      resourceLead: handDiff,
      isThreatened: invincibleEnemies.length > 0,
    };
  }

  protected createFieldSnapshot(): FieldSnapshot {
    const npcHand = this.context.getHand(this.side).hand;
    const cardList = (
      side: GameSide,
      slotType: "monsterSlots" | "spellSlots",
    ) => FieldAnalyzer.getValidFieldCards(this.context.field[slotType][side]);

    const npcMonsters = cardList(this.side, "monsterSlots");
    const npcSupports = cardList(this.side, "spellSlots");
    const playerMonsters = cardList("PLAYER", "monsterSlots");

    return {
      npcMonsters,
      npcSupports,
      playerMonsters,
      advantage: this.calculateTacticalAdvantage(),
      currentMana: this.context.gameState.getMana(this.side),
      currentLP: this.context.gameState.getHP(this.side),
      npcHandCards: npcHand,
      synergies: this.calculateSynergies(npcHand),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected calculateSynergies(_hand: Card[]) {
    return {
      hasKillTraps: false,
      atkModifiers: [],
      posModifiers: [],
      protectionCards: [],
    };
  }

  public async delay(ms: number): Promise<Phaser.Time.TimerEvent> {
    return new Promise((resolve) => this.context.time.delayedCall(ms, resolve));
  }

  protected abstract getHandMoves(
    playableCards: Card[],
    snapshot: FieldSnapshot,
  ): Move[];

  protected abstract getFieldMoves(snapshot: FieldSnapshot): Move[];

  protected abstract determineOptimalPlacementMode(
    monsterToPlay: Card,
    data: FieldSnapshot,
  ): "ATK" | "DEF";
}
