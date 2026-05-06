import { CARD_DATABASE } from "../constants/CardDatabase";
import type { DeckList } from "../constants/DeckConfig";
import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import type { Difficulty } from "../types/GameTypes";

export class DeckGenerator {
  public static generateNPCDeck(difficulty: Difficulty): DeckList {
    const deck: DeckList = [];
    const allIds = Object.keys(CARD_DATABASE);

    const monsterPool = allIds.filter((id) => {
      const card = CARD_DATABASE[id];
      const isMonster = card.type == "MONSTER";
      const isEffect = card.type == "EFFECT_MONSTER";

      if (difficulty == "EASY") return isMonster;
      return isMonster || isEffect;
    });

    const utilityPool = allIds.filter((id) => {
      const card = CARD_DATABASE[id];
      const isSpell = card.type == "SPELL";
      const isTrap = card.type == "TRAP";

      if (difficulty == "EASY") return isSpell;
      if (difficulty == "MEDIUM") return isSpell || isTrap;

      return (isSpell || isTrap) && card.manaCost <= 3;
    });

    let targetMonsterCount: number;

    switch (difficulty) {
      case "EASY":
        targetMonsterCount = Phaser.Math.Between(12, 14);
        break;
      case "MEDIUM":
        // targetMonsterCount = Phaser.Math.Between(11, 12);
        targetMonsterCount = Phaser.Math.Between(7, 8);
        break;
      case "HARD":
        targetMonsterCount = 10;
        break;
    }

    const targetUtility =
      LAYOUT_CONFIG.GAME_STATE.BASE_DECK - targetMonsterCount;

    this.fillDeck(deck, monsterPool, targetMonsterCount);
    this.fillDeck(deck, utilityPool, targetUtility);

    return Phaser.Utils.Array.Shuffle(deck);
  }

  private static fillDeck(
    deck: string[],
    category: string[],
    targetCount: number,
  ): void {
    if (category.length == 0) return;

    //ensure that target never exceeds the limit (3 per card)
    const maxPossibleCards = category.length * 3;
    const finalTarget = Math.min(targetCount, maxPossibleCards);

    let count = 0;
    const availableCategory = [...category]; //copy

    while (count < finalTarget && availableCategory.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableCategory.length);
      const randomId = availableCategory[randomIndex];

      const copies = deck.filter((id) => id == randomId).length;

      if (copies < 3) {
        deck.push(randomId);
        count++;
      } else {
        //if all 3 copies have been over remove it from draw pool
        availableCategory.splice(randomIndex, 1);
      }
    }
  }
}
