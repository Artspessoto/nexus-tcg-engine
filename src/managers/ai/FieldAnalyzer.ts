import type { IBattleContext } from "../../interfaces/IBattleContext";
import { Card } from "../../objects/Card";
import type { GameSide } from "../../types/GameTypes";

export class FieldAnalyzer {
  public static getPlayableCards(hand: Card[], currentMana: number): Card[] {
    return hand.filter((card) => card.getCardData().manaCost <= currentMana);
  }

  public static getBestSupportOption(
    hand: Card[],
    currentMana: number,
  ): Card | null {
    const supports = this.getPlayableCards(hand, currentMana).filter(
      (c) => c.getType() === "SPELL" || c.getType() === "TRAP",
    );

    if (supports.length === 0) return null;

    return [...supports].sort(
      (a, b) => b.getCardData().manaCost - a.getCardData().manaCost,
    )[0];
  }

  public static getMostEfficientMonster(
    hand: Card[],
    currentMana: number,
  ): Card | null {
    const playableOptions = this.getPlayableCards(hand, currentMana);

    return (
      [...playableOptions].sort((a, b) => {
        const x =
          ((a.getCardData().atk || 0) + (a.getCardData().def || 0)) /
          (a.getCardData().manaCost + 1);
        const y =
          ((b.getCardData().atk || 0) + (b.getCardData().def || 0)) /
          (b.getCardData().manaCost + 1);

        return y - x;
      })[0] || null
    );
  }

  public static getStrongestMonsterOption(
    hand: Card[],
    currentMana: number,
    option: "ATK" | "DEF",
  ): Card | void {
    const monsters = this.getPlayableCards(hand, currentMana).filter((card) =>
      card.getType().includes("MONSTER"),
    );

    if (monsters.length == 0) return;

    if (option == "ATK") {
      return [...monsters].sort(
        (a, b) => (b.getCardData().atk || 0) - (a.getCardData().atk || 0),
      )[0];
    } else {
      return [...monsters].sort(
        (a, b) => (b.getCardData().def || 0) - (a.getCardData().def || 0),
      )[0];
    }
  }

  public static getValidMonsters(monsters: (Card | null)[]): Card[] {
    return monsters.filter((m): m is Card => m !== null);
  }

  public static getWeaknessPlayerTarget(
    playerMonsters: (Card | null)[],
  ): Card | null {
    const activeMonsters = playerMonsters.filter(
      (monster): monster is Card => monster !== null && !monster.isFaceDown,
    );

    if (activeMonsters.length == 0) return null;

    return [...activeMonsters].sort(
      (a, b) => (a.getCardData().atk || 0) - (b.getCardData().atk || 0),
    )[0];
  }

  public static getStrongestPlayerTarget(
    playerMonsters: (Card | null)[],
  ): Card | null {
    const activeMonsters = playerMonsters.filter(
      (monster): monster is Card => monster !== null && !monster.isFaceDown,
    );

    if (activeMonsters.length == 0) return null;

    return [...activeMonsters].sort(
      (a, b) => (b.getCardData().atk || 0) - (a.getCardData().atk || 0),
    )[0];
  }

  public static getPlayerMonstersField(
    playerMonsters: (Card | null)[],
  ): Card[] | null {
    const activeMonsters = playerMonsters.filter(
      (monster): monster is Card => monster !== null && !monster.isFaceDown,
    );

    if (activeMonsters.length == 0) return null;

    return activeMonsters;
  }

  public static getFieldSideAdvantage(context: IBattleContext): number {
    const npcAtk = context.field.monsterSlots.OPPONENT.reduce(
      (acc, card) => acc + (card?.getCardData().atk || 0),
      0,
    );
    const playerAtk = context.field.monsterSlots.PLAYER.reduce(
      (acc, card) => acc + (card?.getCardData().atk || 0),
      0,
    );

    return npcAtk - playerAtk;
  }

  public static hasNumericMonstersAdvantage(context: IBattleContext): boolean {
    const npcCount = this.getValidMonsters(
      context.field.monsterSlots.OPPONENT,
    ).length;
    const playerCount = this.getValidMonsters(
      context.field.monsterSlots.PLAYER,
    ).length;

    return npcCount > playerCount;
  }

  public static hasNumericSupportAdvantage(context: IBattleContext): boolean {
    const npcCount = this.getValidMonsters(
      context.field.spellSlots.OPPONENT,
    ).length;
    const playerCount = this.getValidMonsters(
      context.field.spellSlots.PLAYER,
    ).length;

    return npcCount > playerCount;
  }

  public static getGraveyardMonsters(
    context: IBattleContext,
    side: GameSide,
  ) {
    return this.getValidMonsters(context.field.graveyardSlot[side]);
  }

  public static continueWithAdvantageAfterCombatTrade(
    context: IBattleContext,
    isTargetInDefense: boolean,
  ) {
    const npcMonsters = this.getValidMonsters(
      context.field.monsterSlots.OPPONENT,
    );
    const playerMonsters = this.getValidMonsters(
      context.field.monsterSlots.PLAYER,
    );

    // equal monsters atk x atk (destroy both => NPC and player lost 1)
    // equal monsters atk x def (destroy attacker => NPC lost 1)
    const npcCountAfter = npcMonsters.length - 1;
    const playerCountAfter = isTargetInDefense
      ? playerMonsters.length
      : playerMonsters.length - 1;

    return {
      hasDisadvantage: npcCountAfter === 0 && playerCountAfter > 0,
      hasAdvantage: npcCountAfter >= playerCountAfter,
    };
  }
}
