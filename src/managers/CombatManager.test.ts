/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CombatManager } from "./CombatManager";
import { createMockBattleContext, createMockCard } from "../utils/mocks";
import { EventBus } from "../events/EventBus";
import { GameEvent } from "../events/GameEvents";
import type { IBattleContext } from "../interfaces/IBattleContext";
import type { Card } from "../objects/Card";
import { THEME_CONFIG } from "../constants/ThemeConfig";

describe("CombatManager", () => {
  let mockContext: any;
  let combatManager: CombatManager;

  const setupTestCard = (overrides: any) => {
    const card = createMockCard(overrides) as any;

    card.getCardData = vi.fn().mockReturnValue({
      id: "test-id",
      type: overrides.type ?? "MONSTER",
      nameKey: "test_card",
      manaCost: 1,
      atk: overrides.atk ?? 0,
      def: overrides.def ?? 0,
    });

    card.visualElements = {
      iterate: vi.fn((cb) =>
        cb({
          setTint: vi.fn(),
          clearTint: vi.fn(),
          setAlpha: vi.fn(),
        }),
      ),
    };

    return card as Card;
  };

  beforeEach(() => {
    mockContext = createMockBattleContext();
    (mockContext.gameState as any).currentPhase = "BATTLE";

    combatManager = new CombatManager(mockContext as unknown as IBattleContext);
  });

  describe("Constructor & Listeners", () => {
    it("cancel targeting on phase change", () => {
      combatManager.isSelectingTarget = true;

      EventBus.emit(GameEvent.PHASE_CHANGED, {
        newPhase: "MAIN",
        activePlayer: "PLAYER",
      });

      expect(combatManager.isSelectingTarget).toBe(false);
    });

    it("cancel targeting if attacker goes to graveyard", () => {
      const attacker = setupTestCard({ owner: "PLAYER" });

      combatManager.currentAttacker = attacker;
      combatManager.isSelectingTarget = true;

      EventBus.emit(GameEvent.CARD_SENT_TO_GRAVEYARD, {
        card: attacker,
        side: "PLAYER",
      });

      expect(combatManager.currentAttacker).toBeNull();
      expect(combatManager.isSelectingTarget).toBe(false);
    });
  });

  describe("prepareTargeting", () => {
    it("direct attack when opponent field empty", async () => {
      const attacker = setupTestCard({ owner: "PLAYER", atk: 500 });

      mockContext.field.monsterSlots.OPPONENT = [null, null];

      await combatManager.prepareTargeting(attacker);

      expect(mockContext.getUI("OPPONENT").showNotice).toHaveBeenCalled();
    });

    it("enable targeting when monsters exist", () => {
      const attacker = setupTestCard({ owner: "PLAYER", atk: 500 });
      const enemy = setupTestCard({ owner: "OPPONENT" });

      mockContext.field.monsterSlots.OPPONENT = [enemy];

      combatManager.prepareTargeting(attacker);

      expect(combatManager.currentAttacker).toBe(attacker);
      expect(combatManager.isSelectingTarget).toBe(true);
    });
  });

  describe("handleCardSelection validations", () => {
    it("block attacking own card", async () => {
      const attacker = setupTestCard({ owner: "PLAYER" });
      const target = setupTestCard({ owner: "PLAYER" });

      attacker.location = "FIELD";
      target.location = "FIELD";

      combatManager.currentAttacker = attacker;
      combatManager.isSelectingTarget = true;

      await combatManager.handleCardSelection(target);

      expect(mockContext.getUI("PLAYER").showNotice).toHaveBeenCalled();
    });

    it("block non monster target", async () => {
      const attacker = setupTestCard({ owner: "PLAYER" });
      const target = setupTestCard({ owner: "OPPONENT" });

      attacker.location = "FIELD";
      target.location = "FIELD";

      target.getType = vi.fn().mockReturnValue("SPELL");

      combatManager.currentAttacker = attacker;
      combatManager.isSelectingTarget = true;

      await combatManager.handleCardSelection(target);

      expect(mockContext.getUI("PLAYER").showNotice).toHaveBeenCalled();
    });

    it("should cancel attack if phase changed", async () => {
      const attacker = setupTestCard({ owner: "PLAYER" });
      const target = setupTestCard({ owner: "OPPONENT" });

      mockContext.gameState.currentPhase = "MAIN";

      attacker.location = "FIELD";
      target.location = "FIELD";

      combatManager.currentAttacker = attacker;
      combatManager.isSelectingTarget = true;

      await combatManager.handleCardSelection(target);

      expect(combatManager.currentAttacker).toBeNull();
      expect(combatManager.isSelectingTarget).toBe(false);
    });
  });

  describe("Battle Resolution", () => {
    it("Atk vs Def attacker wins", async () => {
      const attacker = setupTestCard({ owner: "PLAYER", atk: 1000 });
      const target = setupTestCard({ owner: "OPPONENT", def: 500 });

      target.angle = 270;
      attacker.location = "FIELD";
      target.location = "FIELD";

      mockContext.field.monsterSlots.OPPONENT = [target];

      combatManager.currentAttacker = attacker;
      combatManager.isSelectingTarget = true;

      await combatManager.handleCardSelection(target);

      expect(mockContext.field.releaseSlot).toHaveBeenCalledWith(
        target,
        "OPPONENT",
      );
    });

    it("Atk vs Def defender wins", () => {
      const attacker = setupTestCard({ owner: "PLAYER", atk: 500 });
      const target = setupTestCard({ owner: "OPPONENT", def: 1000 });

      attacker.location = "FIELD";
      target.location = "FIELD";
      target.angle = 270;

      mockContext.field.monsterSlots.OPPONENT = [target];

      combatManager.currentAttacker = attacker;
      combatManager.isSelectingTarget = true;

      combatManager.handleCardSelection(target);

      expect(mockContext.field.releaseSlot).not.toHaveBeenCalledWith(
        target,
        "OPPONENT",
      );
    });

    it("Atk vs Def tie", () => {
      const attacker = setupTestCard({ owner: "PLAYER", atk: 500 });
      const target = setupTestCard({ owner: "OPPONENT", def: 500 });

      target.angle = 270;
      attacker.location = "FIELD";
      target.location = "FIELD";

      mockContext.field.monsterSlots.OPPONENT = [target];

      combatManager.currentAttacker = attacker;
      combatManager.isSelectingTarget = true;

      combatManager.handleCardSelection(target);

      expect(mockContext.field.releaseSlot).not.toHaveBeenCalled();
    });

    it("Atk vs Atk tie", async () => {
      const attacker = setupTestCard({ owner: "PLAYER", atk: 500 });
      const target = setupTestCard({ owner: "OPPONENT", atk: 500 });

      mockContext.field.monsterSlots.PLAYER = [attacker];
      mockContext.field.monsterSlots.OPPONENT = [target];

      attacker.location = "FIELD";
      target.location = "FIELD";

      combatManager.currentAttacker = attacker;
      combatManager.isSelectingTarget = true;

      await combatManager.handleCardSelection(target);

      expect(mockContext.field.releaseSlot).toHaveBeenCalledWith(
        attacker,
        "PLAYER",
      );

      expect(mockContext.field.releaseSlot).toHaveBeenCalledWith(
        target,
        "OPPONENT",
      );
    });

    it("Atk vs Atk attacker wins", async () => {
      const attacker = setupTestCard({ owner: "PLAYER", atk: 1000 });
      const target = setupTestCard({ owner: "OPPONENT", atk: 500 });

      mockContext.field.monsterSlots.OPPONENT = [target];

      combatManager.currentAttacker = attacker;
      combatManager.isSelectingTarget = true;

      attacker.location = "FIELD";
      target.location = "FIELD";

      await combatManager.handleCardSelection(target);

      expect(mockContext.field.releaseSlot).toHaveBeenCalledWith(
        target,
        "OPPONENT",
      );
    });

    it("Atk vs Atk defender wins", async () => {
      const attacker = setupTestCard({ owner: "PLAYER", atk: 500 });
      const target = setupTestCard({ owner: "OPPONENT", atk: 1000 });

      mockContext.field.monsterSlots.PLAYER = [attacker];

      combatManager.currentAttacker = attacker;
      combatManager.isSelectingTarget = true;

      attacker.location = "FIELD";
      target.location = "FIELD";

      await combatManager.handleCardSelection(target);

      expect(mockContext.field.releaseSlot).toHaveBeenCalledWith(
        attacker,
        "PLAYER",
      );
    });
  });

  describe("Impact Effects", () => {
    it("should apply and remove tint", () => {
      const card = setupTestCard({ owner: "OPPONENT" });

      const delayedSpy = vi.spyOn(mockContext.time, "delayedCall");

      combatManager.triggerImpactEffects(card);

      expect(mockContext.cameras.main.shake).toHaveBeenCalled();

      const callback = delayedSpy.mock.calls[0][1] as () => void;
      callback();

      expect(card.visualElements.iterate).toHaveBeenCalled();
    });
  });

  describe("destroyCard", () => {
    it("should return if card not in slot", () => {
      const card = setupTestCard({ owner: "PLAYER" });

      mockContext.field.monsterSlots.PLAYER = [null];

      combatManager.destroyCard(card, "PLAYER");

      expect(mockContext.field.releaseSlot).not.toHaveBeenCalled();
    });

    it("silent destroy animation", () => {
      const card = setupTestCard({ owner: "PLAYER" });

      mockContext.field.monsterSlots.PLAYER = [card];

      combatManager.destroyCard(card, "PLAYER", true);

      expect(mockContext.tweens.add).toHaveBeenCalledWith(
        expect.objectContaining({
          alpha: 0,
          duration: THEME_CONFIG.ANIMATIONS.DURATIONS.NORMAL,
        }),
      );
    });

    it("should destroy card with animation when silentEffect is false", () => {
      const card = setupTestCard({ owner: "PLAYER" });

      mockContext.field.monsterSlots.PLAYER = [card];

      const tweenMock = vi.fn((config) => {
        if (config.onStart) config.onStart();
        if (config.onComplete) config.onComplete();
      });

      mockContext.tweens.add = tweenMock;

      combatManager.destroyCard(card, "PLAYER");

      expect(mockContext.field.releaseSlot).toHaveBeenCalledWith(
        card,
        "PLAYER",
      );

      expect(card.disableInteractive).toHaveBeenCalled();

      expect(mockContext.field.moveToGraveyard).toHaveBeenCalledWith(card);

      expect(card.setAlpha).toHaveBeenCalledWith(1);
      expect(card.setScale).toHaveBeenCalledWith(1);
    });

    it("destroy spell card using spellSlots", () => {
      const spell = setupTestCard({
        owner: "PLAYER",
        type: "SPELL",
      });

      spell.getType = vi.fn().mockReturnValue("SPELL");

      mockContext.field.spellSlots.PLAYER = [spell];

      combatManager.destroyCard(spell, "PLAYER");

      expect(mockContext.field.releaseSlot).toHaveBeenCalledWith(
        spell,
        "PLAYER",
      );
    });
  });
});
