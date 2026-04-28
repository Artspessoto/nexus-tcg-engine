import type {
  GamePhase,
  GameSide,
  PlacementMode,
  Slot,
} from "../types/GameTypes";
import type { IFieldManager } from "../managers/field/IFieldManager";
import type { IGameState } from "./IGameState";
import type { BattleTranslations } from "../types/GameTypes";
import type { Card } from "../objects/Card";
import type { ToonButton } from "../objects/ToonButton";
import type { IAIManager } from "../managers/ai/interfaces/IAIManager";
import type { ICombatManager } from "../managers/combat/ICombatManager";
import type { IDeckManager } from "../managers/deck/IDeckManager";
import type { IEffectManager } from "../managers/effect/IEffectManager";
import type { IHandManager } from "../managers/hand/IHandManager";
import type { IInputManager } from "../managers/input/IInputManager";
import type { IUIManager } from "../managers/ui/IUIManager";

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
  cardActivation(
    card: Card,
    side: GameSide,
    instructions?: { target?: Card | null },
  ): Promise<void>;
  onAttackDeclared(attacker: Card, target?: Card | null): Promise<void>;
  clearAllMenus(): void;

  add: Phaser.GameObjects.GameObjectFactory;
  tweens: Phaser.Tweens.TweenManager;
  cameras: Phaser.Cameras.Scene2D.CameraManager;
  time: Phaser.Time.Clock;

  translationText: BattleTranslations;
  currentPhase: GamePhase;
  phaseButton: ToonButton;
  playerDisplayName: string;
  selectedCard: Card | null;
}
