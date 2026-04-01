import { CARD_DATABASE } from "./CardDatabase";

export type DeckList = Array<keyof typeof CARD_DATABASE>;

export const PLAYER_INITIAL_DECK: DeckList = [
  "TOON_KNIGHT",
  "TOON_KNIGHT",
  "KING_KNIGHT",
  "ALLIGATOR_WARRIOR",
  "BANDIT_ARCHER",
  "SENTINEL_01",
  "MAGE_APPRENTICE",
  "MAGE_APPRENTICE",
  "FIRE_BALL",
  "FIRE_BALL",
  "POT_OF_LUCK",
  "POT_OF_LUCK",
  "BOOST_ATK",
  "BOOST_ATK",
  "DARK_TRAP",
  "DARK_TRAP",
  "REGEN_FLOWER",
  "MANA_CRYSTAL",
  "ICE_SHIELD",
  "REVERSE_TRAP",
];
