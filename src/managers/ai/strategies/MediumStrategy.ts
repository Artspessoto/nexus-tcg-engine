import type { IAIStrategy } from "../../../interfaces/IAIStrategy";
import type { IBattleContext } from "../../../interfaces/IBattleContext";
import type { Card } from "../../../objects/Card";
import type { CardEffect, EffectTypes } from "../../../types/EffectTypes";
import type { GameSide, Move } from "../../../types/GameTypes";
import { EffectAnalyzer } from "../analyzers/EffectAnalyzer";
import { FieldAnalyzer } from "../analyzers/FieldAnalyzer";

export class MediumStrategy implements IAIStrategy {
  public readonly context: IBattleContext;
  public readonly side: GameSide = "OPPONENT";

  constructor(context: IBattleContext) {
    this.context = context;
  }
  public async playMainPhase(): Promise<void> {
    const moves = this.generateMoves();
    console.log(moves);
  }

  public generateMoves(): Move[] {
    const moves: Move[] = [];
    const currentPhase = this.context.currentPhase;
    const hand = this.context.getHand(this.side).hand;
    const currentMana = this.context.gameState.getMana(this.side);
    const playableCards = FieldAnalyzer.getPlayableCards(hand, currentMana);

    if (currentPhase == "MAIN") {
      moves.push(...this.mainPhaseAvailableMoves(playableCards));
    }

    if (currentPhase == "BATTLE") {
      moves.push(...this.battlePhaseAvailableMoves());
    }

    moves.push({ type: "PASS" });

    return moves;
  }

  public mainPhaseAvailableMoves(playableCards: Card[]): Move[] {
    const moves: Move[] = [];
    const currentMana = this.context.gameState.getMana(this.side);

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
            mode: this.evaluateMonsterPlacement(
              card,
              playableCards,
              currentMana,
            ),
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
          const revivalMonsterPlacementMode: "ATK" | "DEF" =
            this.evaluateMonsterPlacement(card, playableCards, currentMana);

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

  private getBestTargetToApplyEffect(effect: CardEffect): Card | null {
    const hasAdvantage = FieldAnalyzer.getFieldSideAdvantage(this.context);
    const playerMonsters = FieldAnalyzer.getValidMonsters(
      this.context.field.monsterSlots.PLAYER,
    );
    const npcMonsters = FieldAnalyzer.getValidMonsters(
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

        if (targetPowerStat > npcMaxAtk) return target;
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
      let stat: "ATK" | "DEF" = "DEF";

      if (hasAdvantage > 0) {
        stat = "ATK";
      }

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

  private evaluateMonsterPlacement(
    monsterToPlay: Card,
    hand: Card[],
    currentMana: number,
  ): "ATK" | "DEF" {
    const monsterData = monsterToPlay.getCardData();
    const remainingMana = currentMana - monsterData.manaCost;

    const currentAdvantage = FieldAnalyzer.getFieldSideAdvantage(this.context);
    if (currentAdvantage >= 0) return "ATK";

    const buff = hand.find(
      (card) =>
        card.getType() === "SPELL" &&
        card.getCardData().effects?.type === "BOOST_ATK" &&
        card.getCardData().manaCost <= remainingMana,
    );

    if (buff) {
      const buffValue = buff.getCardData().effects?.value || 0;
      const potential = EffectAnalyzer.analyzeCombatStatShiftPotential(
        this.context,
        buffValue,
        "atk",
        true,
      );

      if (potential.isGameChanger) return "ATK";
    }
    return "DEF";
  }

  public battlePhaseAvailableMoves(): Move[] {
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

  public async playBattlePhase(): Promise<void> {}

  public evaluateMove(move: Move): number {
    if (move.type == "PASS") return 2;
    return 1;
  }

  public async executeMove(move: Move): Promise<void> {
    console.log(move);
    await this.delay(200);
  }

  public async delay(ms: number): Promise<Phaser.Time.TimerEvent> {
    return new Promise((resolve) => this.context.time.delayedCall(ms, resolve));
  }
}
