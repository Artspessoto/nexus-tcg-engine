import { EventBus } from "../../../events/EventBus";
import { GameEvent } from "../../../events/GameEvents";
import type { IAIStrategy } from "../../../interfaces/IAIStrategy";
import type { IBattleContext } from "../../../interfaces/IBattleContext";
import type { Card } from "../../../objects/Card";
import type { CardEffect, EffectTypes } from "../../../types/EffectTypes";
import type { GameSide, Move } from "../../../types/GameTypes";
import { Logger } from "../../../utils/Logger";
import { EffectAnalyzer } from "../analyzers/EffectAnalyzer";
import { FieldAnalyzer } from "../analyzers/FieldAnalyzer";

interface TacticalAdvantage {
  isThreatened: boolean; // does the player have an invincible monster on field?
  resourceLead: number; // hand card diff between npc x player
  defensiveGap: number; // best monster def (ai) x best monster atk (player)
  isWinning: boolean; // final situation
}

export class MediumStrategy implements IAIStrategy {
  public readonly context: IBattleContext;
  public readonly side: GameSide = "OPPONENT";

  constructor(context: IBattleContext) {
    this.context = context;
  }
  public async playMainPhase(): Promise<void> {
    let safetyBreak = 0;

    //limit AI to 10 moves
    while (safetyBreak < 10) {
      const moves = this.generateMoves();

      const betterChoice = moves[0]; //example

      if (!betterChoice || betterChoice.type == "PASS") {
        Logger.debug("AI", "PASS");
        break;
      }

      //TODO in hard strategy:
      //hard difficulty detects if score move is good or bad, if score is bad it pass the play
      // if (this.evaluateMove(betterChoice) < 50) break;

      await this.delay(1200);
      await this.executeMove(betterChoice);

      safetyBreak++;
    }
  }

  public generateMoves(): Move[] {
    const moves: Move[] = [];
    const currentPhase = this.context.currentPhase;

    if (currentPhase == "MAIN") {
      moves.push(...this.mainPhaseAvailableMoves());
    }

    if (currentPhase == "BATTLE") {
      moves.push(...this.battlePhaseAvailableMoves());
    }

    moves.push({ type: "PASS" });

    return moves;
  }

  public mainPhaseAvailableMoves(): Move[] {
    const hand = this.context.getHand(this.side).hand;
    const currentMana = this.context.gameState.getMana(this.side);
    const playableCards = FieldAnalyzer.getPlayableCards(hand, currentMana);

    const moves: Move[] = [];

    moves.push(...this.getHandMoves(playableCards));
    moves.push(...this.getFieldMoves());

    return moves;
  }

  private getHandMoves(playableCards: Card[]) {
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
            mode: this.evaluateMonsterPlacement(card),
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

        const needsTarget: EffectTypes[] = [
          "DESTROY",
          "BOUNCE",
          "NERF_ATK",
          "BOOST_ATK",
          "REVIVE",
          "CHANGE_POS",
        ];
        const target = this.getBestTargetToApplyEffect(effect);

        if (needsTarget.includes(effect.type) && !target) {
          continue;
        }

        if (slot !== null) {
          const mode = card.getType() === "SPELL" ? "FACE_UP" : "SET";
          const monsterToEvaluate =
            effect.type === "REVIVE" && target ? target : card;
          const revivalMonsterPlacementMode: "ATK" | "DEF" =
            this.evaluateMonsterPlacement(monsterToEvaluate);

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

  private getFieldMoves(): Move[] {
    const fieldMonsters = FieldAnalyzer.getValidFieldCards(
      this.context.field.monsterSlots.OPPONENT,
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
      const isAtkMode = monster.angle == 0;
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

  private getBestTargetToApplyEffect(effect: CardEffect): Card | null {
    const playerMonsters = FieldAnalyzer.getValidFieldCards(
      this.context.field.monsterSlots.PLAYER,
    );
    const npcMonsters = FieldAnalyzer.getValidFieldCards(
      this.context.field.monsterSlots.OPPONENT,
    );
    const playerSupports = this.context.field.spellSlots.PLAYER;

    const offensiveEffects: EffectTypes[] = [
      "NERF_ATK",
      "NERF_DEF",
      "CHANGE_POS",
      "BOUNCE",
      "DESTROY",
    ];
    const defensiveEffects: EffectTypes[] = [
      "BOOST_ATK",
      "BOOST_DEF",
      "PROTECT",
    ];

    if (offensiveEffects.includes(effect.type)) {
      if (playerMonsters.length == 0) return null;

      if (
        effect.type == "DESTROY" &&
        (effect.targetType == "SPELL" || effect.targetType == "TRAP")
      ) {
        const validOptions = playerSupports.filter(
          (s) => s !== null && s.getType() == effect.targetType,
        )[0];

        return validOptions || null;
      }

      //npc best attacker
      const npcBestMonster = FieldAnalyzer.getStrongestMonsterTarget(
        npcMonsters,
        "ATK",
      );
      const npcMaxAtk = npcBestMonster?.getCardData().atk || 0;
      const effectValue = effect.value || 0;
      const assumedDefWhenIsFaceDown = 30;

      // enemy danger
      const sortedEnemies = [...playerMonsters].sort((a, b) => {
        const valA = a.isFaceDown
          ? assumedDefWhenIsFaceDown
          : a.getCardData().atk || 0;
        const valB = b.isFaceDown
          ? assumedDefWhenIsFaceDown
          : b.getCardData().atk || 0;

        return valB - valA;
      });

      for (const target of sortedEnemies) {
        let targetPowerStat: number;

        if (target.isFaceDown) {
          targetPowerStat = assumedDefWhenIsFaceDown;
        } else {
          const isDef = target.angle == 270 || target.angle == -90;
          targetPowerStat = isDef
            ? target.getCardData().def || 0
            : target.getCardData().atk || 0;
        }

        if (
          targetPowerStat > npcMaxAtk &&
          targetPowerStat - effectValue < npcMaxAtk
        )
          return target;
      }

      return sortedEnemies[0];
    }

    if (defensiveEffects.includes(effect.type)) {
      return (
        FieldAnalyzer.getStrongestMonsterTarget(npcMonsters, "ATK") || null
      );
    }

    if (effect.type == "REVIVE") {
      const targetType = effect.targetType;
      const advantage = this.calculateTacticalAdvantage();

      let stat: "ATK" | "DEF" = "DEF";

      if (advantage.isWinning && !advantage.isThreatened) stat = "ATK";

      return (
        EffectAnalyzer.analyzeRevivePotential(
          this.context,
          effect.targetSide || "OWNER",
          targetType,
          stat,
        ) || null
      );
    }

    return null;
  }

  private evaluateMonsterPlacement(monsterToPlay: Card): "ATK" | "DEF" {
    const monsterData = monsterToPlay.getCardData();
    const currentMana = this.context.gameState.getMana(this.side);
    const remainingMana = currentMana - monsterData.manaCost;

    if (this.canBuffTurnTable(remainingMana)) return "ATK";

    const advantage = this.calculateTacticalAdvantage();

    if (advantage.isThreatened) return "DEF";

    if (advantage.isWinning) return "ATK";

    return "DEF";
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

  public async playBattlePhase(): Promise<void> {
    let atkLimit = 0;

    while (atkLimit < 3) {
      const moves = this.generateMoves();

      const combatMoves = moves.filter(
        (action) => action.type == "ATTACK" || action.type == "PASS",
      );

      const bestAttack = combatMoves[0];

      if (!bestAttack || bestAttack.type == "PASS") break;

      this.executeMove(bestAttack);
      await this.delay(1200);

      atkLimit++;
    }
  }

  public evaluateMove(move: Move): number {
    if (move.type == "PASS") return 2;
    return 1;
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
          this.context.cardActivation(move.card, this.side, move.params);
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
        this.context.onAttackDeclared(move.attacker, move.target);
        break;
      case "ACTIVATE_EFFECT":
        //reactive priority (active effect of monster or trap)
        this.context.cardActivation(move.card, this.side, {
          target: move.target,
        });
        break;
      default:
        break;
    }
  }

  public async delay(ms: number): Promise<Phaser.Time.TimerEvent> {
    return new Promise((resolve) => this.context.time.delayedCall(ms, resolve));
  }

  private calculateTacticalAdvantage(): TacticalAdvantage {
    const invincibleEnemies = FieldAnalyzer.getInvincibleMonsters(
      this.context,
      "PLAYER",
    );
    const handDiff = FieldAnalyzer.simpleHandAdvantage(this.context);
    const defDiff = FieldAnalyzer.getDefensiveAdvantageLevel(this.context);

    const isWinning =
      invincibleEnemies.length == 0 && (handDiff >= 0 || defDiff > 0);

    return {
      isWinning,
      defensiveGap: defDiff,
      resourceLead: handDiff,
      isThreatened: invincibleEnemies.length > 0,
    };
  }

  private canBuffTurnTable(remainingMana: number): boolean {
    const hand = this.context.getHand("OPPONENT").hand;
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
