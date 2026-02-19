import { beforeEach, describe, expect, it, vi } from "vitest";
import { CombatManager } from "./CombatManager";
import type { BattleScene } from "../scenes/BattleScene";
import type { Card } from "../objects/Card";

describe("CombatManager", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockScene: any;
  let combatManager: CombatManager;

  const createMockCard = (side: "PLAYER" | "OPPONENT", atk = 10, def = 10, isFaceDown = false) =>
    ({
      owner: side,
      getCardData: () => ({ atk, def }),
      getType: () => "MONSTER",
      setAlpha: vi.fn(),
      setScale: vi.fn(),
      setFaceUp: vi.fn(),
      disableInteractive: vi.fn(),
      removeAllListeners: vi.fn(),
      visualElements: { 
        iterate: vi.fn((cb) => cb({ 
          setTint: vi.fn(), 
          clearTint: vi.fn() 
        })) 
      },
      isFaceDown: isFaceDown,
      hasAttacked: false,
      angle: 0,
      x: 0,
      y: 0,
    }) as unknown as Card;

  beforeEach(() => {
    mockScene = {
      translationText: {
        combat_notices: {
          select_target: "SELECT THE ATTACK TARGET",
          invalid_own_card: "YOU CANNOT ATTACK YOUR OWN CARDS!",
        },
      },
      currentPhase: "BATTLE",
      playerUI: {
        showNotice: vi.fn(),
        updateLP: vi.fn(),
      },
      opponentUI: {
        updateLP: vi.fn(),
      },
      fieldManager: {
        releaseSlot: vi.fn(),
        moveToGraveyard: vi.fn(),
        monsterSlots: {
          PLAYER: [],
          OPPONENT: [],
        },
        spellSlots: {
          PLAYER: [],
          OPPONENT: [],
        },
      },
      tweens: {
        add: vi.fn((config) => {
          if (config.onStart) config.onStart();
          if (config.onYoyo) config.onYoyo();
          if (config.onComplete) config.onComplete();
        }),
        killTweensOf: vi.fn(),
      },
      cameras: {
        main: { shake: vi.fn() },
      },
      time: { delayedCall: vi.fn((_time, callback) => callback()) },
    };
    combatManager = new CombatManager(mockScene as unknown as BattleScene);
  });

  describe("Targeting Management", () => {
    it("should enter selection mode and set alpha", () => {
      const attacker = createMockCard("PLAYER");
      combatManager.prepareTargeting(attacker);
      expect(combatManager.isSelectingTarget).toBe(true);
      expect(attacker.setAlpha).toHaveBeenCalledWith(0.7);
    });

    it("should cancel targeting and reset alpha if card hasn't attacked", () => {
      const attacker = createMockCard("PLAYER");
      combatManager.prepareTargeting(attacker);
      combatManager.cancelTarget();
      expect(combatManager.isSelectingTarget).toBe(false);
      expect(attacker.setAlpha).toHaveBeenCalledWith(1);
    });

    it("should return early if targeting is not prepared", () => {
      const target = createMockCard("OPPONENT");
      const result = combatManager.handleCardSelection(target);
      expect(result).toBeUndefined();
      expect(mockScene.tweens.add).not.toHaveBeenCalled();
    });
  });

  describe("Validations", () => {
    it("should stop if phase is not BATTLE", () => {
      const attacker = createMockCard("PLAYER");
      const target = createMockCard("OPPONENT");
      mockScene.currentPhase = "MAIN";
      combatManager.prepareTargeting(attacker);
      combatManager.handleCardSelection(target);
      expect(combatManager.isSelectingTarget).toBe(false);
    });

    it("should block attacks on own cards", () => {
      const attacker = createMockCard("PLAYER");
      const target = createMockCard("PLAYER");
      combatManager.prepareTargeting(attacker);
      combatManager.handleCardSelection(target);
      expect(mockScene.playerUI.showNotice).toHaveBeenCalledWith(expect.any(String), "WARNING");
    });

    it("should block attacks on non-monster targets", () => {
      const attacker = createMockCard("PLAYER");
      const target = createMockCard("OPPONENT");
      (target.getType) = () => "SPELL";
      combatManager.prepareTargeting(attacker);
      combatManager.handleCardSelection(target);
      expect(mockScene.playerUI.showNotice).toHaveBeenCalledWith(expect.any(String), "WARNING");
    });

    it("should not reset alpha on cancel if card has already attacked", () => {
      const attacker = createMockCard("PLAYER");
      attacker.hasAttacked = true;
      combatManager.prepareTargeting(attacker);
      
      combatManager.cancelTarget();
      
      expect(attacker.setAlpha).not.toHaveBeenCalledWith(1);
    });
  });

  describe("Combat Logic - ATK vs ATK", () => {
    it("should win: destroy target and deal damage", () => {
      const attacker = createMockCard("PLAYER", 500);
      const target = createMockCard("OPPONENT", 200);
      mockScene.fieldManager.monsterSlots.OPPONENT = [target];

      combatManager.prepareTargeting(attacker);
      combatManager.handleCardSelection(target);

      expect(mockScene.opponentUI.updateLP).toHaveBeenCalledWith("OPPONENT", -300);
      expect(mockScene.fieldManager.releaseSlot).toHaveBeenCalledWith(target, "OPPONENT");
    });

    it("should lose: destroy attacker and take damage", () => {
      const attacker = createMockCard("PLAYER", 100);
      const target = createMockCard("OPPONENT", 400);
      mockScene.fieldManager.monsterSlots.PLAYER = [attacker];
      mockScene.fieldManager.monsterSlots.OPPONENT = [target];

      combatManager.prepareTargeting(attacker);
      combatManager.handleCardSelection(target);

      expect(mockScene.playerUI.updateLP).toHaveBeenCalledWith("PLAYER", -300);
      expect(mockScene.fieldManager.releaseSlot).toHaveBeenCalledWith(attacker, "PLAYER");
    });
  });

  describe("4. Combat Logic - ATK vs DEF", () => {
    it("should win: destroy target and deal NO damage", () => {
      const attacker = createMockCard("PLAYER", 500);
      const target = createMockCard("OPPONENT", 100, 300);
      target.angle = 270; // Modo defesa
      mockScene.fieldManager.monsterSlots.OPPONENT = [target];

      combatManager.prepareTargeting(attacker);
      combatManager.handleCardSelection(target);

      expect(mockScene.fieldManager.releaseSlot).toHaveBeenCalledWith(target, "OPPONENT");
      expect(mockScene.opponentUI.updateLP).not.toHaveBeenCalled();
    });

    it("should lose: reflect damage to player and destroy nothing", () => {
      const attacker = createMockCard("PLAYER", 100);
      const target = createMockCard("OPPONENT", 100, 500);
      target.angle = 270;
      mockScene.fieldManager.monsterSlots.OPPONENT = [target];

      combatManager.prepareTargeting(attacker);
      combatManager.handleCardSelection(target);

      expect(mockScene.playerUI.updateLP).toHaveBeenCalledWith("PLAYER", -400);
      expect(mockScene.fieldManager.releaseSlot).not.toHaveBeenCalled();
    });

    it("should do nothing on ATK vs DEF tie", () => {
      const attacker = createMockCard("PLAYER", 100);
      const target = createMockCard("OPPONENT", 100, 100); // 100 ATK vs 100 DEF
      target.angle = 270;
      mockScene.fieldManager.monsterSlots.OPPONENT = [target];

      combatManager.prepareTargeting(attacker);
      combatManager.handleCardSelection(target);

      expect(mockScene.fieldManager.releaseSlot).not.toHaveBeenCalled();
      expect(mockScene.playerUI.updateLP).not.toHaveBeenCalled();
    });

    it("should reveal face-down cards upon attack", () => {
      const attacker = createMockCard("PLAYER", 1000);
      const target = createMockCard("OPPONENT", 10, 10, true);
      mockScene.fieldManager.monsterSlots.OPPONENT = [target];

      combatManager.prepareTargeting(attacker);
      combatManager.handleCardSelection(target);

      expect(target.setFaceUp).toHaveBeenCalled();
    });
  });

  describe("Visuals", () => {
    it("should handle destruction of spell cards (silent effect)", () => {
      const spell = createMockCard("PLAYER");
      (spell.getType) = () => "SPELL";
      mockScene.fieldManager.spellSlots.PLAYER = [spell];

      combatManager.destroyCard(spell, "PLAYER", true);

      expect(mockScene.fieldManager.releaseSlot).toHaveBeenCalledWith(spell, "PLAYER");
      expect(mockScene.fieldManager.moveToGraveyard).toHaveBeenCalled();
    });

    it("should apply tints to visual elements during impact", () => {
      const target = createMockCard("OPPONENT");
      combatManager.triggerImpactEffects(target);
      
      expect(target.visualElements.iterate).toHaveBeenCalled();
      expect(mockScene.cameras.main.shake).toHaveBeenCalled();
    });

    it("should fully lifecycle tints (set and clear)", () => {
      const target = createMockCard("OPPONENT");
      const spriteMock = { setTint: vi.fn(), clearTint: vi.fn() };
      target.visualElements.iterate = vi.fn((cb) => cb(spriteMock));

      combatManager.triggerImpactEffects(target);
      expect(spriteMock.setTint).toHaveBeenCalledWith(0xff0000);

      expect(spriteMock.clearTint).toHaveBeenCalled();
    });
  });

  describe("Bug Prevention (Double Trigger)", () => {
    it("should not call releaseSlot twice if destroyCard is triggered multiple times for the same card", () => {
      const attacker = createMockCard("PLAYER", 300);
      const target = createMockCard("OPPONENT", 100);

      mockScene.fieldManager.monsterSlots.OPPONENT = [target];

      combatManager.prepareTargeting(attacker);
      combatManager.handleCardSelection(target);

      mockScene.fieldManager.monsterSlots.OPPONENT = [];

      combatManager.handleCardSelection(target);

      expect(mockScene.fieldManager.releaseSlot).toHaveBeenCalledTimes(1);
    });
  });
});
