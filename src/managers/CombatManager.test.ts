import { beforeEach, describe, expect, it, vi } from "vitest";
import { CombatManager } from "./CombatManager";
import type { IBattleContext } from "../interfaces/IBattleContext";

describe("CombatManager", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockContext: any;
  let combatManager: CombatManager;

  const createMockCard = (params: {
    owner: "PLAYER" | "OPPONENT";
    atk?: number;
    def?: number;
    type?: string;
    isFaceDown?: boolean;
    angle?: number;
    hasAttacked?: boolean;
    missingVisualMethods?: boolean;
  }) => {
    const spriteMock = params.missingVisualMethods
      ? {}
      : { setTint: vi.fn(), clearTint: vi.fn() };

    return {
      owner: params.owner,
      getCardData: () => ({ atk: params.atk, def: params.def }),
      getType: () => params.type ?? "MONSTER",
      setAlpha: vi.fn(),
      setScale: vi.fn(),
      setFaceUp: vi.fn(),
      disableInteractive: vi.fn(),
      visualElements: {
        iterate: vi.fn((cb) => cb(spriteMock)),
      },
      isFaceDown: params.isFaceDown ?? false,
      hasAttacked: params.hasAttacked ?? false,
      angle: params.angle ?? 0,
      x: 100,
      y: 100,
      _spriteMock: spriteMock, // Reference for expectations
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as unknown as any;
  };

  beforeEach(() => {
    mockContext = {
      translationText: {
        combat_notices: {
          select_attack_target: "SELECT TARGET",
          invalid_own_card: "INVALID OWN CARD",
          direct_attack: "DIRECT ATTACK",
        },
      },
      gameState: { currentPhase: "BATTLE" },
      getUI: vi.fn((side) =>
        side === "PLAYER" ? mockContext.playerUI : mockContext.opponentUI,
      ),
      playerUI: { showNotice: vi.fn(), updateLP: vi.fn() },
      opponentUI: { showNotice: vi.fn(), updateLP: vi.fn() },
      field: {
        releaseSlot: vi.fn(),
        moveToGraveyard: vi.fn(),
        monsterSlots: { PLAYER: [], OPPONENT: [] },
        spellSlots: { PLAYER: [], OPPONENT: [] },
      },
      tweens: {
        add: vi.fn((config) => {
          if (config.onStart) config.onStart();
          if (config.onYoyo) config.onYoyo();
          if (config.onComplete) config.onComplete();
        }),
      },
      cameras: { main: { shake: vi.fn() } },
      time: { delayedCall: vi.fn((_ms, cb) => cb()) },
    };

    combatManager = new CombatManager(mockContext as IBattleContext);
  });

  describe("prepareTargeting & Direct Attack Logic", () => {
    it("should execute direct attack for PLAYER and target Y: 50", () => {
      const attacker = createMockCard({ owner: "PLAYER", atk: 500 });
      mockContext.field.monsterSlots.OPPONENT = [null, null];

      combatManager.prepareTargeting(attacker);

      expect(mockContext.tweens.add).toHaveBeenCalledWith(
        expect.objectContaining({ y: 50 }),
      );
      expect(mockContext.opponentUI.updateLP).toHaveBeenCalledWith(
        "OPPONENT",
        -500,
      );
    });

    it("should execute direct attack for OPPONENT and target Y: 650", () => {
      const attacker = createMockCard({ owner: "OPPONENT", atk: 300 });
      mockContext.field.monsterSlots.PLAYER = [null];

      combatManager.prepareTargeting(attacker);

      expect(mockContext.tweens.add).toHaveBeenCalledWith(
        expect.objectContaining({ y: 650 }),
      );
      expect(mockContext.playerUI.updateLP).toHaveBeenCalledWith(
        "PLAYER",
        -300,
      );
    });

    it("should use '?? 0' fallback if card ATK is undefined", () => {
      const attacker = createMockCard({ owner: "PLAYER", atk: undefined });
      mockContext.field.monsterSlots.OPPONENT = [];

      combatManager.prepareTargeting(attacker);

      expect(mockContext.opponentUI.updateLP).toHaveBeenCalledWith(
        "OPPONENT",
        -0,
      );
    });
  });

  describe("handleCardSelection & Validations", () => {
    it("should return early if not in selection mode or no attacker set", () => {
      combatManager.isSelectingTarget = false;
      const target = createMockCard({ owner: "OPPONENT" });
      combatManager.handleCardSelection(target);
      expect(mockContext.tweens.add).not.toHaveBeenCalled();
    });

    it("should cancel targeting if phase is not BATTLE", () => {
      const attacker = createMockCard({ owner: "PLAYER" });
      const target = createMockCard({ owner: "OPPONENT" });
      mockContext.gameState.currentPhase = "MAIN";

      combatManager.currentAttacker = attacker;
      combatManager.isSelectingTarget = true;

      combatManager.handleCardSelection(target);
      expect(combatManager.isSelectingTarget).toBe(false);
      expect(attacker.setAlpha).toHaveBeenCalledWith(1);
    });

    it("should block attacking own cards", () => {
      const attacker = createMockCard({ owner: "PLAYER" });
      const target = createMockCard({ owner: "PLAYER" });
      combatManager.currentAttacker = attacker;
      combatManager.isSelectingTarget = true;

      combatManager.handleCardSelection(target);
      expect(mockContext.playerUI.showNotice).toHaveBeenCalledWith(
        mockContext.translationText.combat_notices.invalid_own_card,
        "WARNING",
      );
    });

    it("should block attacking non-monster cards", () => {
      const attacker = createMockCard({ owner: "PLAYER" });
      const target = createMockCard({ owner: "OPPONENT", type: "SPELL" });
      combatManager.currentAttacker = attacker;
      combatManager.isSelectingTarget = true;

      combatManager.handleCardSelection(target);
      expect(mockContext.playerUI.showNotice).toHaveBeenCalledWith(
        mockContext.translationText.combat_notices.select_attack_target,
        "WARNING",
      );
    });
  });

  describe("Combat Resolution Logic (Branches)", () => {
    it("ATK vs ATK: Tie (Both destroyed) covers 'default' branch", () => {
      const attacker = createMockCard({ owner: "PLAYER", atk: 500 });
      const target = createMockCard({ owner: "OPPONENT", atk: 500 });
      mockContext.field.monsterSlots.PLAYER = [attacker];
      mockContext.field.monsterSlots.OPPONENT = [target];

      combatManager.currentAttacker = attacker;
      combatManager.isSelectingTarget = true;
      combatManager.handleCardSelection(target);

      expect(mockContext.field.releaseSlot).toHaveBeenCalledWith(
        target,
        "OPPONENT",
      );
      expect(mockContext.field.releaseSlot).toHaveBeenCalledWith(
        attacker,
        "PLAYER",
      );
    });

    it("ATK vs DEF: Tie covers 'default' branch in resolveAtkVsDef", () => {
      const attacker = createMockCard({ owner: "PLAYER", atk: 100 });
      const target = createMockCard({
        owner: "OPPONENT",
        def: 100,
        angle: 270,
      });
      mockContext.field.monsterSlots.OPPONENT = [target];

      combatManager.currentAttacker = attacker;
      combatManager.isSelectingTarget = true;
      combatManager.handleCardSelection(target);

      expect(mockContext.field.releaseSlot).not.toHaveBeenCalled();
      expect(mockContext.playerUI.updateLP).not.toHaveBeenCalled();
    });

    it("ATK vs DEF: Attacker loses (Reflect Damage)", () => {
      const attacker = createMockCard({ owner: "PLAYER", atk: 100 });
      const target = createMockCard({
        owner: "OPPONENT",
        def: 400,
        angle: 270,
      });
      mockContext.field.monsterSlots.OPPONENT = [target];

      combatManager.currentAttacker = attacker;
      combatManager.isSelectingTarget = true;
      combatManager.handleCardSelection(target);

      expect(mockContext.playerUI.updateLP).toHaveBeenCalledWith(
        "PLAYER",
        -300,
      );
    });

    it("should reveal face-down card when attacked", () => {
      const attacker = createMockCard({ owner: "PLAYER", atk: 1000 });
      const target = createMockCard({
        owner: "OPPONENT",
        atk: 10,
        isFaceDown: true,
      });
      mockContext.field.monsterSlots.OPPONENT = [target];

      combatManager.currentAttacker = attacker;
      combatManager.isSelectingTarget = true;
      combatManager.handleCardSelection(target);

      expect(target.setFaceUp).toHaveBeenCalled();
    });
  });

  describe("cancelTarget & Visuals", () => {
    it("should NOT reset alpha on cancel if card already attacked", () => {
      const attacker = createMockCard({ owner: "PLAYER", hasAttacked: true });
      combatManager.currentAttacker = attacker;
      combatManager.cancelTarget();
      expect(attacker.setAlpha).not.toHaveBeenCalledWith(1);
    });

    it("should clear tints when applyTint is called with null", () => {
      const target = createMockCard({ owner: "OPPONENT" });
      combatManager.triggerImpactEffects(target);
      expect(target._spriteMock.clearTint).toHaveBeenCalled();
    });

    it("should handle sprites without tint methods (safety branches)", () => {
      const target = createMockCard({
        owner: "OPPONENT",
        missingVisualMethods: true,
      });
      expect(() => combatManager.triggerImpactEffects(target)).not.toThrow();
    });
  });

  describe("destroyCard Logic", () => {
    it("should use spellSlots branch for non-monster cards", () => {
      const trap = createMockCard({ owner: "PLAYER", type: "TRAP" });
      mockContext.field.spellSlots.PLAYER = [trap];
      combatManager.destroyCard(trap, "PLAYER");
      expect(mockContext.field.releaseSlot).toHaveBeenCalledWith(
        trap,
        "PLAYER",
      );
    });

    it("should return early if card is not found in any slot", () => {
      const card = createMockCard({ owner: "PLAYER" });
      mockContext.field.monsterSlots.PLAYER = [null, null];
      combatManager.destroyCard(card, "PLAYER");
      expect(mockContext.field.releaseSlot).not.toHaveBeenCalled();
    });

    it("should execute full destroy animation with tints", () => {
      const card = createMockCard({ owner: "PLAYER" });
      mockContext.field.monsterSlots.PLAYER = [card];
      combatManager.destroyCard(card, "PLAYER");
      expect(card._spriteMock.setTint).toHaveBeenCalledWith(0xff0000);
      expect(card._spriteMock.clearTint).toHaveBeenCalled();
    });
  });
});
