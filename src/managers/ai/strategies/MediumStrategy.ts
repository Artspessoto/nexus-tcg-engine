import {
  AI_CONFIG,
  DEFENSIVE_EFFECTS,
  EFFECTS_REQUIRING_TARGET,
  OFFENSIVE_EFFECTS,
} from "../../../constants/AIConfig";
import { LAYOUT_CONFIG } from "../../../constants/LayoutConfig";
import { EventBus } from "../../../events/EventBus";
import { GameEvent } from "../../../events/GameEvents";
import type { IAIStrategy } from "../../../interfaces/IAIStrategy";
import type { IBattleContext } from "../../../interfaces/IBattleContext";
import type { Card } from "../../../objects/Card";
import type { BurnAnalysis } from "../../../types/AnalyzerTypes";
import type { CardData } from "../../../types/CardTypes";
import type {
  ActionEffect,
  CardEffect,
  EffectTypes,
  NumericEffect,
} from "../../../types/EffectTypes";
import type { GameSide, Move } from "../../../types/GameTypes";
import type {
  FieldSnapshot,
  SupportScorer,
  TacticalAdvantage,
} from "../../../types/StrategyTypes";
import { Logger } from "../../../utils/Logger";
import { EffectAnalyzer } from "../analyzers/EffectAnalyzer";
import { FieldAnalyzer } from "../analyzers/FieldAnalyzer";

export class MediumStrategy implements IAIStrategy {
  public readonly context: IBattleContext;
  public readonly side: GameSide = "OPPONENT";

  private readonly supportScorers: Partial<Record<EffectTypes, SupportScorer>>;

  constructor(context: IBattleContext) {
    this.context = context;

    this.supportScorers = {
      BURN: (value) => this.scoreBurnEffect(value),
      HEAL: () => this.scoreHealEffect(),
      DRAW_CARD: () => this.scoreDrawEffect(),
      GAIN_MANA: (value) => this.scoreManaEffect(value),
      DESTROY: (_, effect) => this.scoreDestroyEffect(effect as ActionEffect),
      REVIVE: (_, effect, snapshot) => this.scoreReviveEffect(effect as ActionEffect, snapshot),
      BOUNCE: (_val, _eff, snapshot, params) => this.scoreBounceEffect(snapshot, params?.target),
      CHANGE_POS: (_val, _eff, snapshot, params) => this.scoreChangePosEffect(snapshot, params?.target),

      BOOST_ATK: (_, effect, snapshot, params) => this.scoreAtkShift(effect as NumericEffect, snapshot, params?.target),
      NERF_ATK: (_, effect, snapshot, params) => this.scoreAtkShift(effect as NumericEffect, snapshot, params?.target),

      BOOST_DEF: (_, effect, snapshot, params) => this.scoreDefShift(effect as NumericEffect, snapshot, params?.target),
      NERF_DEF: (_, effect, snapshot, params) => this.scoreDefShift(effect as NumericEffect, snapshot, params?.target)
    }
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
      currentLP: this.context.gameState.getHP(this.side),
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

        const target = this.getBestTargetToApplyEffect(effect, snapshot);

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

  public chooseBestMove(moves: Move[], snapshot: FieldSnapshot): Move {
    const finalScored = moves.map((move) => ({
      move,
      score: this.evaluateMove(move, snapshot),
    }));

    finalScored.sort((a, b) => b.score - a.score);
    return finalScored[0].move;
  }

  private getBestTargetToApplyEffect(effect: CardEffect, snapshot: FieldSnapshot): Card | null {
    const { npcMonsters } = snapshot;

    const category = this.getEffectCategory(effect.type);

    switch (category) {
      case "OFFENSIVE": return this.getOffensiveTarget(effect, snapshot);
      case "DEFENSIVE": return this.getDefensiveTarget(npcMonsters);
      case "REVIVE": return this.getReviveTarget(effect as ActionEffect);
      default: return null;
    }
  }

  private getEffectCategory(type: EffectTypes): "OFFENSIVE" | "DEFENSIVE" | "REVIVE" | "NONE" {
    if (OFFENSIVE_EFFECTS.includes(type)) return "OFFENSIVE";
    if (DEFENSIVE_EFFECTS.includes(type)) return "DEFENSIVE";
    if (type == "REVIVE") return "REVIVE";
    return "NONE";
  }

  private getOffensiveTarget(effect: CardEffect, snapshot: FieldSnapshot): Card | null {
    const { playerMonsters, npcMonsters, advantage } = snapshot;
    const playerSupports = this.context.field.spellSlots.PLAYER;

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

    if (effect.type == "CHANGE_POS") {
      for (const target of sortedEnemies) {
        //NPC with advantage and strong monster in field (proative action)
        if (target.isFaceDown && advantage.isWinning && npcMaxAtk >= 55) {
          return target;
        }

        //Enemy monster strong in attack but weak in def
        if (target.isAtkMode && (target.getCardData().def || 0) < npcMaxAtk) {
          return target;
        }

        //Enemy monster strong in def but weak in atk
        if (target.isDefMode && !target.isFaceDown && (target.getCardData().atk || 0) < npcMaxAtk) {
          return target;
        }
      }
    }

    for (const target of sortedEnemies) {
      let targetPowerStat: number;

      if (target.isFaceDown) {
        targetPowerStat = assumedDefWhenIsFaceDown;
      } else {
        const isDef = target.isDefMode;
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

  private getDefensiveTarget(npcMonsters: Card[]) {
    return FieldAnalyzer.getStrongestMonsterTarget(npcMonsters, "ATK") || null
  }

  private getReviveTarget(effect: ActionEffect): Card | null {
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

  private determineOptimalPlacementMode(
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

      const combatMoves = moves.filter(m => m.type == "ATTACK" || m.type == "PASS");
      const bestAttack = this.chooseBestMove(combatMoves, snapshot);

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
      case "ATTACK":
        finalScore += this.evaluateAttack(move.attacker, move.target)
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
    const effect = card.getCardData().effects;
    if (!effect) return 0;

    //dont apply effects in wrong situations
    if (EFFECTS_REQUIRING_TARGET.includes(effect.type) && !params?.target)
      return 0;

    const effectValue = effect.value || 0;

    const scorer = this.supportScorers[effect.type];


    return scorer ? scorer(effectValue, effect, snapshot, params
    ) : AI_CONFIG.SCORES.BASE_MOVE
  }

  public evaluateAttack(attacker: Card, target?: Card | null): number {
    if (!target) return AI_CONFIG.SCORES.GAME_CHANGER;

    const attackerValue = attacker.getCardData().atk || 0;
    const targetData = target.getCardData();

    const targetValue = (target.isAtkMode ? targetData.atk : targetData.def) ?? 0;

    if (attackerValue > targetValue) return 200;

    return -50;
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

  private scoreBurnEffect(value: number): number {
    const burn: BurnAnalysis = EffectAnalyzer.analyzeBurnImpact(
      this.context,
      value,
    );

    if (burn.isLethal) return AI_CONFIG.SCORES.LETHAL_BURN;

    const totalLP = LAYOUT_CONFIG.GAME_STATE.BASE_LP;
    let score = EffectAnalyzer.getRelativeImpact(value, totalLP) * 1000;

    if (burn.damagePotential > totalLP * 0.5)
      score += AI_CONFIG.TACTICS.KILL_POTENTIAL;
    return score;
  }

  private scoreHealEffect(): number {
    const healPriority = EffectAnalyzer.analyzeHealUrgency(this.context);
    if (healPriority == 0) return 0;
    return (
      EffectAnalyzer.getRelativeImpact(
        healPriority,
        LAYOUT_CONFIG.GAME_STATE.BASE_LP,
      ) * 200
    );
  }

  private scoreDrawEffect(): number {
    const priority = EffectAnalyzer.analyzeCardUrgency(this.context);
    return priority * AI_CONFIG.TACTICS.DRAW_URGENCY;
  }

  private scoreManaEffect(value: number): number {
    const urgency = EffectAnalyzer.analyzeManaUrgency(this.context);
    return value * 5 + urgency * AI_CONFIG.TACTICS.MANA_RESERVE;
  }

  private scoreDestroyEffect(effect: ActionEffect): number {
    if (effect.targetType?.includes("MONSTER")) {
      const dangerousOnes = FieldAnalyzer.getInvincibleMonsters(
        this.context,
        "PLAYER",
      );
      return dangerousOnes.length * AI_CONFIG.TACTICS.KILL_POTENTIAL;
    }

    if (effect.targetType == "SPELL" || effect.targetType == "TRAP") {
      const targets = EffectAnalyzer.analyzeSupportDestructionCount(
        this.context,
      );

      return targets * 20;
    }

    return AI_CONFIG.SCORES.BASE_MOVE;
  }

  private scoreReviveEffect(
    effect: ActionEffect,
    snapshot: FieldSnapshot,
  ): number {
    //field fully
    if (snapshot.npcMonsters.length == 3) return 0;

    const potential = EffectAnalyzer.analyzeRevivePotential(
      this.context,
      effect.targetSide,
      effect.targetType,
      "ATK",
    );

    if (!potential) return -500;

    let score = 40 + (potential.getCardData().atk || 0);
    if (snapshot.npcMonsters.length == 0) score += AI_CONFIG.FIELD.EMPTY_BONUS;

    return score;
  }

  private scoreBounceEffect(
    snapshot: FieldSnapshot,
    target?: Card | null,
  ): number {
    if (!target) return 0;

    let score = AI_CONFIG.SCORES.BASE_MOVE;
    const { advantage } = snapshot;
    const targetData = target.getCardData();

    if (advantage.isThreatened) score += AI_CONFIG.FIELD.THREAT_HIGH;
    score += targetData.manaCost * 5;

    return score;
  }

  private scoreAtkShift(
    effect: NumericEffect,
    snapshot: FieldSnapshot,
    target?: Card | null,
  ): number {
    if (!target) return 0;

    const isEnemy = target.owner !== this.side;

    if (!isEnemy && !target.isAtkMode) return 0;
    if (isEnemy && !target.isAtkMode) return 0; //no nerf enemy atk if is def mode

    const impact = EffectAnalyzer.analyzeCombatStatShiftPotential(
      this.context,
      effect.value,
      "atk",
      effect.type == "BOOST_ATK",
      snapshot.currentMana,
      "ALL",
    );

    let score = impact.isGameChanger
      ? AI_CONFIG.SCORES.GAME_CHANGER
      : AI_CONFIG.SCORES.BASE_MOVE;

    if (isEnemy && snapshot.advantage.isThreatened)
      score += AI_CONFIG.FIELD.THREAT_HIGH;

    return score;
  }

  private scoreDefShift(
    effect: NumericEffect,
    snapshot: FieldSnapshot,
    target?: Card | null,
  ): number {
    if (!target || target.owner == this.side || !target.isDefMode) return 0;

    const npcBestAtk =
      FieldAnalyzer.getStrongestMonsterTarget(
        snapshot.npcMonsters,
      )?.getCardData().atk || 0;
    const currentDef = target.getCardData().def || 0;

    if (
      currentDef > npcBestAtk &&
      currentDef - (effect.value || 0) <= npcBestAtk
    ) {
      return AI_CONFIG.TACTICS.KILL_POTENTIAL + 10;
    }

    return 0;
  }

  private scoreChangePosEffect(snapshot: FieldSnapshot, target?: Card | null): number {
    if (!target || target.owner == this.side) return 0;

    const npcBestAtk = FieldAnalyzer.getStrongestMonsterTarget(snapshot.npcMonsters, "ATK")?.getCardData().atk ?? 0;

    const targetData = target.getCardData();
    const targetAk = targetData.atk ?? 0;
    const targetDef = targetData.def ?? 0;
    const advantage = snapshot.advantage;

    const currentEnemyStat = target.isAtkMode ? targetAk : targetDef;

    //security cure
    const goodHealSituation = snapshot.currentLP > 50

    //1°: NPC monster can kill without change_pos
    if (npcBestAtk > currentEnemyStat) {
      return AI_CONFIG.SCORES.BASE_MOVE;
    }

    //2°: NPC with advantage and a strong monster in field priorize agressive action
    if (target.isFaceDown && advantage.isWinning && npcBestAtk >= 55 && goodHealSituation) {
      return AI_CONFIG.TACTICS.POS_CHANGE + AI_CONFIG.TACTICS.KILL_POTENTIAL - 10
    }

    //2°: Enemy monster is strong against NPC monster in attack, but your def is low
    if (target.isAtkMode && npcBestAtk > targetDef) {
      return AI_CONFIG.TACTICS.POS_CHANGE + AI_CONFIG.TACTICS.KILL_POTENTIAL + 20
    }

    //3°: Enemy monster with strong def against NPC monster atk, but your atk is low
    if (target.isDefMode && npcBestAtk > targetAk) {
      return AI_CONFIG.TACTICS.POS_CHANGE + AI_CONFIG.TACTICS.KILL_POTENTIAL + 10
    }

    //4°: Def urgency (enemy monster is invincible - lethal atk)
    if (target.isAtkMode && npcBestAtk < targetAk) {
      if (advantage.isThreatened) {
        return AI_CONFIG.TACTICS.POS_CHANGE + 15;
      }
    }

    return AI_CONFIG.SCORES.BASE_MOVE;
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

  private canSwingGameWithBuff(remainingMana: number): boolean {
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
