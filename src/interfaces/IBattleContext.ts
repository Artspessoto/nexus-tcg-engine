import type { GamePhase, GameSide, PlacementMode, Slot } from "../types/GameTypes";
import type { IFieldManager } from "./IFieldManager";
import type { IGameState } from "./IGameState";
import type { IUIManager } from "./IUIManager";
import type { BattleTranslations } from "../types/GameTypes";
import type { ICombatManager } from "./ICombatManager";
import type { IHandManager } from "./IHandManager";
import type { IInputManager } from "./IInputManager";
import type { Card } from "../objects/Card";
import type { IDeckManager } from "./IDeckManager";
import type { ToonButton } from "../objects/ToonButton";
import type { IEffectManager } from "./IEffectManager";
import type { IAIManager } from "./IAIManager";

export interface IBattleContext {
  engine: Phaser.Scene;
  controls: IInputManager;
  field: IFieldManager;
  gameState: IGameState;
  combat: ICombatManager;
  effects: IEffectManager;
  npcAction: IAIManager;

  getUI(side: GameSide): IUIManager;
  getHand(side: GameSide): IHandManager;
  getDeck(side: GameSide): IDeckManager;

  handlePlayerCard(): void;
  cancelPlacement(): void;
  setPhase(phase: GamePhase): void;
  finalizeTurnTransition(): void;
  handleCardDrop(zone: Phaser.GameObjects.Zone, card: Card): void;
  executePlay(
    card: Card,
    side: GameSide,
    type: "MONSTER" | "SPELL",
    slot: Slot,
    mode: PlacementMode,
  ): void;
  cardActivation(card: Card, side: GameSide): void;
  onAttackDeclared(attacker: Card, target?: Card): void;
  clearAllMenus(): void;

  add: Phaser.GameObjects.GameObjectFactory;
  tweens: Phaser.Tweens.TweenManager;
  cameras: Phaser.Cameras.Scene2D.CameraManager;
  time: Phaser.Time.Clock;

  translationText: BattleTranslations;
  currentPhase: GamePhase;
  phaseButton: ToonButton;
  selectedCard: Card | null;
}
