import { LAYOUT_CONFIG } from "../../../constants/LayoutConfig";
import type { IBattleContext } from "../../../interfaces/IBattleContext";
import type { EffectTargetSide } from "../../../types/EffectTypes";
import { FieldAnalyzer } from "./FieldAnalyzer";

export class EffectAnalyzer {
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

  //destroy potential
  public static analyzeMonsterDestructionPotential(
    context: IBattleContext,
  ): number {
    const strongestPlayerMonster = FieldAnalyzer.getStrongestPlayerTarget(
      context.field.monsterSlots.PLAYER,
    );

    if (!strongestPlayerMonster) return 0;

    return strongestPlayerMonster.getCardData().atk || 0;
  }

  public static analyzeSupportDestructionPotential(
    context: IBattleContext,
  ): number {
    const playerSupports = context.field.spellSlots.PLAYER.length;

    if (!playerSupports) return 0;

    return playerSupports;
  }

  //revive potential
  public static analyzeRevivePotential(
    context: IBattleContext,
    targetSide: EffectTargetSide,
  ) {
    const npcGraveyard = FieldAnalyzer.getGraveyardMonsters(
      context,
      "OPPONENT",
    );
    const playerGraveyard =
      targetSide === "BOTH"
        ? FieldAnalyzer.getGraveyardMonsters(context, "PLAYER")
        : [];

    const availableMonsters = [...npcGraveyard, ...playerGraveyard];

    if (availableMonsters.length == 0) return 0;

    const bestMonster = availableMonsters.sort(
      (a, b) => (b.getCardData().atk || 0) - (a.getCardData().atk || 0),
    )[0];

    return bestMonster.getCardData().atk || 0;
  }

  //burn priority (increases as the player's life decreases)
  public static analyzeBurnUrgency(context: IBattleContext, burnValue: number) {
    const playerLP = context.gameState.getHP("PLAYER");

    if (burnValue >= playerLP) return 9999;

    const dmgPriority = LAYOUT_CONFIG.GAME_STATE.BASE_LP - playerLP;
    return dmgPriority;
  }
}
