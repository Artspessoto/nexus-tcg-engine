import { LAYOUT_CONFIG } from "../../../constants/LayoutConfig";
import { EventBus } from "../../../events/EventBus";
import { GameEvent } from "../../../events/GameEvents";
import type { IAIStrategy } from "../../../interfaces/IAIStrategy";
import type { IBattleContext } from "../../../interfaces/IBattleContext";
import type { Card } from "../../../objects/Card";
import type { BurnAnalysis } from "../../../types/AnalyzerTypes";
import type { CardData } from "../../../types/CardTypes";
import type { CardEffect, EffectTypes } from "../../../types/EffectTypes";
import type { GameSide, Move } from "../../../types/GameTypes";
import type { FieldSnapshot, TacticalAdvantage } from "../../../types/StrategyTypes";
import { Logger } from "../../../utils/Logger";
import { EffectAnalyzer } from "../analyzers/EffectAnalyzer";
import { FieldAnalyzer } from "../analyzers/FieldAnalyzer";

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
      const snapshot = this.createFieldSnapshot();
      const moves = this.generateMoves(snapshot);

      const betterChoice = this.chooseBestMove(moves, snapshot);

      //TODO in hard strategy:
      //hard difficulty detects if score move is good or bad, if score is bad it pass the play
      if (!betterChoice || this.evaluateMove(betterChoice, snapshot) < 5) break;

      await this.delay(1200);
      await this.executeMove(betterChoice);

      safetyBreak++;
    }
  }

  private createFieldSnapshot(): FieldSnapshot {
    const npcHand = this.context.getHand(this.side).hand;
    const cardList = (
      side: GameSide,
      slotType: "monsterSlots" | "spellSlots",
    ) => FieldAnalyzer.getValidFieldCards(this.context.field[slotType][side]);

    const npcMonsters = cardList(this.side, "monsterSlots");
    const npcSupports = cardList(this.side, "spellSlots");
    const playerMonsters = cardList("PLAYER", "monsterSlots");

    const allAvailableEffects = [
      ...npcHand,
      ...npcMonsters,
      ...npcSupports,
    ].filter((c) => c.getCardData().effects);

    return {
      npcMonsters,
      npcSupports,
      playerMonsters,
      advantage: this.calculateTacticalAdvantage(),
      currentMana: this.context.gameState.getMana(this.side),
      npcHandCards: npcHand,
      synergies: {
        hasKillTraps: npcHand.some(
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
      },
    };
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

  private getHandMoves(playableCards: Card[], snapshot: FieldSnapshot) {
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
            mode: this.evaluateMonsterPlacement(card, snapshot),
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
            this.evaluateMonsterPlacement(monsterToEvaluate, snapshot);

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

  private getFieldMoves(snapshot: FieldSnapshot): Move[] {
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

  public chooseBestMove(moves: Move[], snapshot: FieldSnapshot): Move {
    const finalScored = moves.map((move) => ({
      move,
      score: this.evaluateMove(move, snapshot),
    }));

    finalScored.sort((a, b) => b.score - a.score);
    return finalScored[0].move;
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

  private evaluateMonsterPlacement(
    monsterToPlay: Card,
    data: FieldSnapshot,
  ): "ATK" | "DEF" {
    const { advantage, currentMana } = data;
    const monsterData = monsterToPlay.getCardData();
    const remainingMana = currentMana - monsterData.manaCost;

    if (this.canBuffTurnTable(remainingMana)) return "ATK";

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
      const snapshot = this.createFieldSnapshot();
      const moves = this.generateMoves(snapshot);

      const combatMoves = moves.filter(
        (action) => action.type == "ATTACK" || action.type == "PASS",
      );

      const bestAttack = combatMoves[0];

      if (!bestAttack || bestAttack.type == "PASS") break;

      await this.executeMove(bestAttack);
      await this.delay(1200);

      atkLimit++;
    }
  }

  public evaluateMove(move: Move, data: FieldSnapshot): number {
    if (move.type == "PASS") return 2;
    Logger.debug(
      "AI",
      `NPC cards: ${data.npcHandCards.map((c) => c.getCardData().nameKey)}`,
    );

    let finalScore = 0;

    switch (move.type) {
      case "PLAY_MONSTER":
        finalScore += this.evaluateMonsterPlay(move.card, data);
        break;
      case "PLAY_SPELL":
        finalScore += this.evaluateSupport(move.card, data, move.params);
        break;
      case "ACTIVATE_EFFECT":
        finalScore = 0;
        break;
      case "CHANGE_POS":
        finalScore = 0;
        break;
      default:
        break;
    }
    return finalScore;
  }

  private evaluateMonsterPlay(card: Card, snapshot: FieldSnapshot): number {
    const cardData = card.getCardData();
    const monsterStat: "ATK" | "DEF" = card.angle == 0 ? "ATK" : "DEF";

    //monster power
    const powerValue =
      monsterStat == "ATK" ? cardData.atk || 0 : cardData.def || 0;

    let actionScore = 10 + powerValue;

    actionScore += this.evaluateFieldUrgency(snapshot);
    actionScore += this.evaluateManaEfficiency(cardData, snapshot, actionScore);
    actionScore += this.evaluateTacticalSynergy(card, snapshot, monsterStat);
    actionScore += this.evaluateThreatResponse(card, snapshot, monsterStat);

    //agressive potential
    if (monsterStat == "ATK" && snapshot.playerMonsters.length > 0) {
      const strongestEnemy = FieldAnalyzer.getStrongestMonsterTarget(
        snapshot.playerMonsters,
        "ATK",
      );
      if (
        strongestEnemy &&
        cardData.atk! > (strongestEnemy.getCardData().atk || 0)
      ) {
        actionScore += 35;
      }
    }

    return actionScore;
  }

  private evaluateManaEfficiency(
    data: CardData,
    snapshot: FieldSnapshot,
    currentScore: number,
  ): number {
    const { currentMana, synergies } = snapshot;
    const ratio = data.manaCost / currentMana;
    let value = 0;

    if (ratio > 0.7 && currentScore < 50) value -= 25;
    if (currentMana - data.manaCost >= 2 && synergies.hasKillTraps) value += 15;

    return value;
  }

  private evaluateFieldUrgency(snapshot: FieldSnapshot): number {
    const { npcMonsters } = snapshot;

    if (npcMonsters.length == 0) return 25;
    if (npcMonsters.length == 3) return -20;

    return 0;
  }

  private evaluateThreatResponse(
    card: Card,
    snapshot: FieldSnapshot,
    mode: "ATK" | "DEF",
  ): number {
    const { advantage } = snapshot;
    const cardData = card.getCardData();

    if (!advantage.isThreatened) return 0;

    if (mode === "DEF") {
      const threatPower = Math.abs(advantage.defensiveGap);
      return cardData.def! > threatPower ? 40 : 15;
    }

    return -25;
  }

  private evaluateTacticalSynergy(
    card: Card,
    snapshot: FieldSnapshot,
    mode: "ATK" | "DEF",
  ): number {
    const { synergies, playerMonsters } = snapshot;
    const cardData = card.getCardData();
    let finalScore = 0;

    //logic bait (try to bait player with weakness monster)
    if (synergies.hasKillTraps && mode === "ATK" && (cardData.atk || 0) < 35) {
      finalScore += 20;
    }

    if (mode !== "ATK") return finalScore;

    const strongestEnemy = FieldAnalyzer.getStrongestMonsterTarget(
      playerMonsters,
      "ATK",
    );

    if (!strongestEnemy || strongestEnemy.isFaceDown) return finalScore;

    const enemyAtk = strongestEnemy.getCardData().atk || 0;
    const enemyDef = strongestEnemy.getCardData().def || 0;
    const myAtk = cardData.atk || 0;

    // synergy with buffs and nerfs (atk)
    if (synergies.atkModifiers.length > 0) {
      const bestMod = Math.max(
        ...synergies.atkModifiers.map(
          (m) => m.getCardData().effects?.value || 0,
        ),
      );
      //if npc monster is weak against other card (but wins with buff/nerf)
      if (myAtk <= enemyAtk && myAtk + bestMod > enemyAtk) {
        finalScore += 45;
      }
    }

    //change position
    if (synergies.posModifiers.length > 0) {
      //npc monster is weak against player's monster DEF, but wins with change pos
      if (myAtk <= enemyAtk && myAtk > enemyDef) {
        finalScore += 50;
      }
    }

    return finalScore;
  }

  public evaluateSupport(
    card: Card,
    snapshot: FieldSnapshot,
    params?: { target?: Card | null },
  ): number {
    const { advantage, currentMana, npcMonsters } = snapshot;
    const effect = card.getCardData().effects;
    if (!effect) return 0;

    const targetEffects: EffectTypes[] = [
      "BOOST_ATK",
      "BOOST_DEF",
      "NERF_ATK",
      "NERF_DEF",
      "DESTROY",
      "BOUNCE",
      "CHANGE_POS",
    ];

    //dont apply effects in wrong situations
    if (targetEffects.includes(effect.type) && !params?.target) return 0;

    let baseScore = 0;
    const effectValue = effect.value || 0;
    const totalLP = LAYOUT_CONFIG.GAME_STATE.BASE_LP;

    switch (effect.type) {
      case "BURN": {
        const burn: BurnAnalysis = EffectAnalyzer.analyzeBurnImpact(
          this.context,
          effectValue,
        );

        if (burn.isLethal) return 9999;
        baseScore +=
          EffectAnalyzer.getRelativeImpact(effectValue, totalLP) * 1000;

        if (burn.damagePotential > totalLP * 0.5) baseScore += 30;
        break;
      }
      case "HEAL": {
        const healPriority = EffectAnalyzer.analyzeHealUrgency(this.context);
        if (healPriority == 0) return 0;
        baseScore +=
          EffectAnalyzer.getRelativeImpact(healPriority, totalLP) * 200;
        break;
      }
      case "DRAW_CARD": {
        const newCardPriority = EffectAnalyzer.analyzeCardUrgency(this.context);
        baseScore += newCardPriority * 25;
        break;
      }
      case "GAIN_MANA": {
        const manaPriority = EffectAnalyzer.analyzeManaUrgency(this.context);
        baseScore += effectValue * 5 + manaPriority * 10;
        break;
      }
      case "DESTROY": {
        const dangerousMonster = FieldAnalyzer.getInvincibleMonsters(
          this.context,
          "PLAYER",
        );
        if (
          effect.targetType?.includes("MONSTER") &&
          dangerousMonster.length !== 0
        ) {
          baseScore += dangerousMonster.length * 3;
        } else if (
          effect.targetType == "SPELL" ||
          effect.targetType == "TRAP"
        ) {
          const playerSupports = EffectAnalyzer.analyzeSupportDestructionCount(
            this.context,
          );

          baseScore += playerSupports * 3;
        }

        break;
      }
      case "REVIVE": {
        const npcMonsters = FieldAnalyzer.getValidFieldCards(
          this.context.field.monsterSlots.OPPONENT,
        );
        //field fully
        if (npcMonsters.length == 3) return 0;

        const potential = EffectAnalyzer.analyzeRevivePotential(
          this.context,
          effect.targetSide,
          effect.targetType,
          "ATK",
        );

        if (potential) {
          const cardData = potential.getCardData();
          baseScore += 40 + (cardData.atk || 0);
          if (npcMonsters.length == 0) baseScore += 20;
        }

        break;
      }
      case "BOUNCE":
        if (params?.target) {
          const targetData = params?.target?.getCardData();
          if (advantage.isThreatened) baseScore += 45;
          baseScore += targetData.manaCost * 5;
        }
        break;
      case "BOOST_ATK":
      case "NERF_ATK": {
        if (!params?.target) return 0;
        const target = params.target;
        const isEnemy = target.owner !== this.side;
        const isAtkMode = target.angle == 0;

        if (!isEnemy && !isAtkMode) return 0;
        if (isEnemy && !isAtkMode) return 0; //no nerf enemy atk if is def mode

        const impact = EffectAnalyzer.analyzeCombatStatShiftPotential(
          this.context,
          effect.value,
          "atk",
          effect.type == "BOOST_ATK",
          currentMana,
          "ALL",
        );

        if (impact.isGameChanger) baseScore += 60;
        if (isEnemy && advantage.isThreatened) baseScore += 20;
        break;
      }
      case "BOOST_DEF":
      case "NERF_DEF": {
        if (!params?.target) return 0;
        const target = params.target;
        const isEnemy = target.owner !== this.side;
        const isDefMode = target.angle == 270 || target.angle == -90;

        if (!isEnemy && !isDefMode) return 0;

        if (isEnemy) {
          const npcBestAtk =
            FieldAnalyzer.getStrongestMonsterTarget(npcMonsters)?.getCardData()
              .atk || 0;
          if ((target.getCardData().def || 0) <= npcBestAtk) return 0;
          baseScore += 30;
        }
      }
      // case "PROTECT":
      // case "NEGATE":
    }

    return baseScore;
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
