import type { Card } from "../objects/Card";
import type { GameSide, PlacementMode } from "../types/GameTypes";

export interface IFieldPlayResult {
  valid: boolean;
  reason?: "MANA" | "SLOT" | "TYPE" | "PHASE";
  slot?: { x: number; y: number; index: number };
}

export interface IFieldManager {
  monsterSlots: { PLAYER: (Card | null)[]; OPPONENT: (Card | null)[] };
  spellSlots: { PLAYER: (Card | null)[]; OPPONENT: (Card | null)[] };
  graveyardSlot: { PLAYER: Card[]; OPPONENT: Card[] };

  setupFieldZones(): void;
  resetAttackFlags(): void;

  releaseSlot(card: Card, side: GameSide): void;
  occupySlot(
    side: GameSide,
    type: "MONSTER" | "SPELL",
    index: number,
    card: Card,
  ): void;

  getFirstAvailableSlot(
    side: GameSide,
    type: "MONSTER" | "SPELL",
  ): {
    index: number;
    x: number;
    y: number;
  } | null;

  getValidSlotToPlay(
    card: Card,
    side: GameSide,
    zoneType: "MONSTER" | "SPELL",
  ): IFieldPlayResult;

  validatePlay(card: Card, zone: Phaser.GameObjects.Zone): IFieldPlayResult;

  moveToGraveyard(card: Card): void;
  playCardToZone(
    card: Card,
    targetX: number,
    targetY: number,
    mode: PlacementMode,
  ): void;
  previewPlacement(card: Card, targetX: number, targetY: number): void;
}
