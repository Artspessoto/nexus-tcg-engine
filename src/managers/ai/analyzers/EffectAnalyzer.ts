import { LAYOUT_CONFIG } from "../../../constants/LayoutConfig";
import type { IBattleContext } from "../../../interfaces/IBattleContext";
import type { Card } from "../../../objects/Card";
import type {
  BurnAnalysis,
  BuffAnalysis,
  BounceAnalysis,
  ChangePosAnalysis,
} from "../../../types/AnalyzerTypes";
import type { EffectTargetSide } from "../../../types/EffectTypes";
import { FieldAnalyzer } from "./FieldAnalyzer";

export class EffectAnalyzer {
  public static getRelativeImpact(value: number, totalLP: number): number {
    return value / totalLP;
  }

  public static analyzeCardUrgency(context: IBattleContext): number {
    const actualHand = context.getHand("OPPONENT").hand.length;
    const maxHand = context.getHand("OPPONENT").maxHandSize;

    return Math.max(0, maxHand - actualHand);
  }

  public static analyzeHealUrgency(context: IBattleContext): number {
    const actualLP = context.gameState.getHP("OPPONENT");
    const initialLP = LAYOUT_CONFIG.GAME_STATE.BASE_LP;

    return Math.max(0, initialLP - actualLP);
  }

  public static analyzeManaUrgency(context: IBattleContext): number {
    const actualMana = context.gameState.getMana("OPPONENT");
    const initialMana = LAYOUT_CONFIG.GAME_STATE.BASE_MANA;

    return Math.max(0, initialMana - actualMana);
  }

  //destroy monster potential
  public static analyzeMonsterDestructionValue(
    context: IBattleContext,
  ): number {
    const strongestPlayerMonster = FieldAnalyzer.getStrongestMonsterTarget(
      context.field.monsterSlots.PLAYER,
    );

    if (!strongestPlayerMonster) return 0;

    return strongestPlayerMonster.getCardData().atk || 0;
  }

  //destroy spell/trap potential
  public static analyzeSupportDestructionCount(
    context: IBattleContext,
  ): number {
    const playerSupports = context.field.spellSlots.PLAYER.filter(
      (support): support is Card => support !== null,
    );

    if (!playerSupports) return 0;

    return playerSupports.length;
  }

  //revive potential
  public static analyzeRevivePotential(
    context: IBattleContext,
    targetSide: EffectTargetSide,
    targetType?: string,
    stat: "ATK" | "DEF" = "ATK",
  ): Card | null {
    const npcGraveyard = FieldAnalyzer.getGraveyardMonsters(
      context,
      "OPPONENT",
    );
    const playerGraveyard =
      targetSide === "BOTH"
        ? FieldAnalyzer.getGraveyardMonsters(context, "PLAYER")
        : [];

    let availableCards = [...npcGraveyard, ...playerGraveyard];

    if (targetType) {
      availableCards = availableCards.filter((c) =>
        c.getType().includes(targetType),
      );
    }

    if (availableCards.length == 0) return null;

    if (stat == "ATK") {
      return availableCards.sort(
        (a, b) => (b.getCardData().atk || 0) - (a.getCardData().atk || 0),
      )[0];
    } else {
      return availableCards.sort(
        (a, b) => (b.getCardData().def || 0) - (a.getCardData().def || 0),
      )[0];
    }
  }

  //burn priority (increases as the player's life decreases)
  public static analyzeBurnImpact(
    context: IBattleContext,
    burnValue: number,
  ): BurnAnalysis {
    const playerLP = context.gameState.getHP("PLAYER");
    const initialLP = LAYOUT_CONFIG.GAME_STATE.BASE_LP;

    return {
      isLethal: burnValue >= playerLP,
      damagePotential: initialLP - playerLP,
    };
  }

  // boost or nerf priority
  public static analyzeCombatStatShiftPotential(
    context: IBattleContext,
    value: number,
    statType: "atk" | "def",
    isBuff: boolean,
    availableMana: number,
    targetSelection: "STRONGEST" | "ALL" = "STRONGEST",
  ): BuffAnalysis {
    const playerMonsters = context.field.monsterSlots.PLAYER;

    // targets by AI level
    const targets =
      targetSelection === "STRONGEST"
        ? [FieldAnalyzer.getStrongestMonsterTarget(playerMonsters)].filter(
            (m): m is Card => m !== null,
          )
        : FieldAnalyzer.getValidFieldCards(playerMonsters);

    if (targets.length === 0) return { isGameChanger: false, targetValue: 0 };

    const npcFieldMonsters = FieldAnalyzer.getValidFieldCards(
      context.field.monsterSlots.OPPONENT,
    );

    const npcHandMonster = FieldAnalyzer.getStrongestMonsterOptionOnHand(
      context.getHand("OPPONENT").hand,
      availableMana,
      statType === "atk" ? "ATK" : "DEF",
    );

    const myOptions = [...npcFieldMonsters];
    if (npcHandMonster) myOptions.push(npcHandMonster);

    let canChangeAdvantage = false;
    let highestValueMet = 0;

    // verify all ai monsters have game change against player monsters
    for (const myMonster of myOptions) {
      const myStat =
        statType === "atk"
          ? myMonster.getCardData().atk || 0
          : myMonster.getCardData().def || 0;

      for (const enemy of targets) {
        const enemyStat =
          statType === "atk"
            ? enemy.getCardData().atk || 0
            : enemy.getCardData().def || 0;

        const condition = isBuff
          ? myStat <= enemyStat && myStat + value > enemyStat
          : enemyStat >= myStat && enemyStat - value < myStat;

        if (condition) {
          canChangeAdvantage = true;
          highestValueMet = Math.max(highestValueMet, enemyStat);

          if (targetSelection === "STRONGEST") break;
        }
      }
      if (canChangeAdvantage && targetSelection === "STRONGEST") break;
    }

    return { isGameChanger: canChangeAdvantage, targetValue: highestValueMet };
  }

  //bounce priority
  public static analyzeBouncePotential(
    context: IBattleContext,
  ): BounceAnalysis {
    const playerField = context.field.monsterSlots.PLAYER;

    const strongestAtk = FieldAnalyzer.getStrongestMonsterTarget(
      playerField,
      "ATK",
    );
    const strongestDef = FieldAnalyzer.getStrongestMonsterTarget(
      playerField,
      "DEF",
    );

    if (!strongestAtk || !strongestDef)
      return { targetAtk: 0, targetDef: 0, manaCost: 0, isTank: false };

    const atkValue = strongestAtk.getCardData().atk || 0;
    const defValue = strongestDef.getCardData().def || 0;

    const bestTarget = defValue > atkValue ? strongestDef : strongestAtk;
    const cardData = bestTarget.getCardData();

    return {
      targetAtk: cardData.atk || 0,
      targetDef: cardData.def || 0,
      manaCost: cardData.manaCost,
      isTank: (cardData.def || 0) > 30,
    };
  }

  public static analyzePositionChangePotential(
    context: IBattleContext,
  ): ChangePosAnalysis {
    const playerField = context.field.monsterSlots.PLAYER;

    const target = FieldAnalyzer.getStrongestMonsterTarget(playerField, "ATK");

    if (!target)
      return { targetAtk: 0, targetDef: 0, isCurrentAtkMode: true, statGap: 0 };

    const cardData = target.getCardData();
    const atk = cardData.atk || 0;
    const def = cardData.def || 0;

    return {
      targetAtk: atk,
      targetDef: def,
      isCurrentAtkMode: target.angle == 0 || target.angle == 360,
      statGap: Math.abs(atk - def),
    };
  }

  //TODO: protect and negate priority
}
