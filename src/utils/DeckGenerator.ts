import { CARD_DATABASE } from "../constants/CardDatabase";
import type { DeckList } from "../constants/DeckConfig";
import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import type { Difficulty } from "../types/GameTypes";

export class DeckGenerator {
  public static generateNPCDeck(difficulty: Difficulty): DeckList {
    const deck: DeckList = [];
    const allIds = Object.keys(CARD_DATABASE);

    const monsters = allIds.filter(
      (id) =>
        CARD_DATABASE[id].type == "MONSTER" ||
        CARD_DATABASE[id].type == "EFFECT_MONSTER",
    );
    const utilities = allIds.filter(
      (id) =>
        CARD_DATABASE[id].type == "TRAP" || CARD_DATABASE[id].type == "SPELL",
    );

    const targetMonsterCount =
      difficulty == "EASY"
        ? Phaser.Math.Between(12, 14)
        : Phaser.Math.Between(10, 11);

    const targetUtility =
      LAYOUT_CONFIG.GAME_STATE.BASE_DECK - targetMonsterCount;

    this.fillDeck(deck, monsters, targetMonsterCount);
    this.fillDeck(deck, utilities, targetUtility);

    return Phaser.Utils.Array.Shuffle(deck);
  }

  private static fillDeck(
    deck: string[],
    category: string[],
    targetCount: number,
  ): void {
    let count = 0;

    while (count < targetCount) {
      const randomId = category[Math.floor(Math.random() * category.length)];
      const copies = deck.filter((id) => id == randomId).length;

      if (copies < 3) {
        deck.push(randomId);
        count++;
      }

      if (count < targetCount && category.length == 0) break;
    }
  }
}
