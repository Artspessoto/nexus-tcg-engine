import { beforeEach, describe, expect, it, vi } from "vitest";
import { CombatManager } from "./CombatManager";
import type { IBattleContext } from "../interfaces/IBattleContext";
import type { Card } from "../objects/Card";

describe("CombatManager", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockContext: any;
  let combatManager: CombatManager;

  const createMockCard = (
    side: "PLAYER" | "OPPONENT",
    atk = 10,
    def = 10,
    isFaceDown = false,
  ) =>
    ({
      owner: side,
      getCardData: () => ({ atk, def }),
      getType: () => "MONSTER",
      setAlpha: vi.fn(),
      setScale: vi.fn(),
      setFaceUp: vi.fn(),
      disableInteractive: vi.fn(),
      visualElements: {
        iterate: vi.fn((cb) =>
          cb({
            setTint: vi.fn(),
            clearTint: vi.fn(),
          }),
        ),
      },
      isFaceDown: isFaceDown,
      hasAttacked: false,
      angle: 0,
      x: 0,
      y: 0,
    }) as unknown as Card;

  beforeEach(() => {
    // Criamos o Mock do Contexto seguindo a nova interface
    mockContext = {
      translationText: {
        combat_notices: {
          select_attack_target: "SELECT TARGET",
          invalid_own_card: "INVALID OWN CARD",
          direct_attack: "DIRECT ATTACK",
        },
      },
      gameState: {
        currentPhase: "BATTLE",
      },
      // Simulamos os métodos de busca do contexto
      getUI: vi.fn((side) => (side === "PLAYER" ? mockContext.playerUI : mockContext.opponentUI)),
      
      // Mocks das UIs individuais
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
      cameras: {
        main: { shake: vi.fn() },
      },
      time: { 
        delayedCall: vi.fn((_time, callback) => callback()) 
      },
    };

    combatManager = new CombatManager(mockContext as unknown as IBattleContext);
  });

  describe("Targeting Management", () => {
    it("should enter selection mode and set alpha on attacker", () => {
      const attacker = createMockCard("PLAYER");
      mockContext.field.monsterSlots.OPPONENT = [createMockCard("OPPONENT")];
      
      combatManager.prepareTargeting(attacker);
      
      expect(combatManager.isSelectingTarget).toBe(true);
      expect(attacker.setAlpha).toHaveBeenCalledWith(0.7);
      expect(mockContext.playerUI.showNotice).toHaveBeenCalledWith(
        mockContext.translationText.combat_notices.select_attack_target,
        "NEUTRAL"
      );
    });

    it("should trigger direct attack if opponent field is empty", () => {
      const attacker = createMockCard("PLAYER", 500);
      mockContext.field.monsterSlots.OPPONENT = [null, null, null];

      combatManager.prepareTargeting(attacker);

      expect(mockContext.opponentUI.updateLP).toHaveBeenCalledWith("OPPONENT", -500);
      expect(combatManager.isSelectingTarget).toBe(false);
    });
  });

  describe("Attack Validations", () => {
    it("should prevent attacking own cards", () => {
      const attacker = createMockCard("PLAYER");
      const target = createMockCard("PLAYER");
      combatManager.currentAttacker = attacker;
      combatManager.isSelectingTarget = true;

      combatManager.handleCardSelection(target);

      expect(mockContext.playerUI.showNotice).toHaveBeenCalledWith(
        mockContext.translationText.combat_notices.invalid_own_card,
        "WARNING"
      );
    });

    it("should cancel if phase is no longer BATTLE", () => {
      const attacker = createMockCard("PLAYER");
      const target = createMockCard("OPPONENT");
      mockContext.gameState.currentPhase = "MAIN";
      
      combatManager.currentAttacker = attacker;
      combatManager.isSelectingTarget = true;

      combatManager.handleCardSelection(target);

      expect(combatManager.isSelectingTarget).toBe(false);
      expect(mockContext.tweens.add).not.toHaveBeenCalled();
    });
  });

  describe("Combat Resolution", () => {
    it("ATK vs ATK: Player wins", () => {
      const attacker = createMockCard("PLAYER", 1000);
      const target = createMockCard("OPPONENT", 500);
      mockContext.field.monsterSlots.OPPONENT = [target];

      combatManager.currentAttacker = attacker;
      combatManager.isSelectingTarget = true;

      combatManager.handleCardSelection(target);

      // Verificamos se o dano foi aplicado na UI correta
      expect(mockContext.opponentUI.updateLP).toHaveBeenCalledWith("OPPONENT", -500);
      // Verificamos se a carta foi removida do campo
      expect(mockContext.field.releaseSlot).toHaveBeenCalledWith(target, "OPPONENT");
    });

    it("ATK vs DEF: Attacker is weaker (Reflect damage)", () => {
      const attacker = createMockCard("PLAYER", 200);
      const target = createMockCard("OPPONENT", 10, 500); // 500 DEF
      target.angle = 270; // Modo Defesa
      mockContext.field.monsterSlots.OPPONENT = [target];

      combatManager.currentAttacker = attacker;
      combatManager.isSelectingTarget = true;

      combatManager.handleCardSelection(target);

      // Jogador deve tomar 300 de dano de reflexo
      expect(mockContext.playerUI.updateLP).toHaveBeenCalledWith("PLAYER", -300);
      // Nenhuma carta deve ser destruída
      expect(mockContext.field.releaseSlot).not.toHaveBeenCalled();
    });
  });

  describe("Visual Effects", () => {
    it("should apply tint and shake camera on impact", () => {
      const target = createMockCard("OPPONENT");
      combatManager.triggerImpactEffects(target);

      expect(mockContext.cameras.main.shake).toHaveBeenCalled();
      // Verifica se iterou sobre os elementos visuais para aplicar o tint
      expect(target.visualElements.iterate).toHaveBeenCalled();
    });
  });
});