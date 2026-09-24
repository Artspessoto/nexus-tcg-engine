import Phaser from "phaser";
import { TRANSLATIONS } from "../../constants/Translations";
import { EventBus } from "../../events/EventBus";
import { GameEvent } from "../../events/GameEvents";
import type { IBattleContext } from "../../interfaces/IBattleContext";
import type { BattleLogEntry } from "../../types/BattleLogType";
import type { HistoryLogTranslations } from "../../types/GameTypes";
import { formatTemplate } from "../../utils/TranslationUtils";
import { LanguageManager } from "../language/LanguageManager";
import type { IBattleLogManager } from "./IBattleLogManager";

export class BattleLogManager implements IBattleLogManager {
  private context: IBattleContext;
  private entries: BattleLogEntry[] = [];
  private translations: HistoryLogTranslations;

  constructor(context: IBattleContext) {
    this.context = context;
    this.setupListeners();

    const lang = LanguageManager.getInstance().currentLang;
    this.translations = TRANSLATIONS[lang].history_log;
  }

  private setupListeners(): void {
    //turn started
    EventBus.on(GameEvent.TURN_STARTED, (data) => {
      this.addEntry({
        type: "TURN_START",
        side: data.side,
        actor: data.actor,
        messageKey: formatTemplate(this.translations.turn_started, {
          turnCount: data.turnCount,
          actor: data.actor,
        }),
      });
    });

    //card played
    EventBus.on(GameEvent.CARD_PLAYED, (data) => {
      const cardNameKey = data.card.getCardData().nameKey;
      this.addEntry({
        type: "PLAY_CARD",
        side: data.side,
        cardNameKey,
        messageKey: formatTemplate(this.translations.play_card, {
          side: data.side,
          cardName: cardNameKey,
          mode: data.mode, //"ATK" | "DEF" | "FACE_UP" | "SET" << need improve for translations response
        }),
      });

      //battle resolution
      EventBus.on(GameEvent.BATTLE_RESOLVED, (data) => {
        const attackerName = data.attacker.getCardData().nameKey;
        const targetName = data.target.getCardData().nameKey;
        this.addEntry({
          type: "ATTACK",
          side: data.attacker.owner,
          cardNameKey: attackerName,
          targetNameKey: targetName,
          amount: data.damage,
          messageKey: formatTemplate(this.translations.battle_resolved, {
            attackerName,
            targetName,
            damage: data.damage,
          }),
        });
      });

      //direct attack
      EventBus.on(GameEvent.DIRECT_ATTACK, (data) => {
        const attackerName = data.attacker.getCardData().nameKey;
        const damage = data.damage;
        this.addEntry({
          type: "ATTACK",
          side: data.attacker.owner,
          cardNameKey: data.attacker.getCardData().nameKey,
          amount: damage,
          messageKey: formatTemplate(this.translations.direct_attack, {
            attackerName,
            damage,
          }),
        });
      });

      //card effect ativation
      EventBus.on(GameEvent.EFFECT_ACTIVATED, (data) => {
        const cardName = data.card.getCardData().nameKey;
        this.addEntry({
          type: "EFFECT",
          side: data.card.owner,
          cardNameKey: cardName,
          messageKey: formatTemplate(this.translations.effect_activated, {
            cardName,
            effectType: data.effect.type, //improve translations to resolve this error cases: "DRAW_CARD"
          }),
        });
      });

      //to do other events to history
    });
  }

  private addEntry(
    entry: Omit<BattleLogEntry, "id" | "turn" | "timeStamp">,
  ): void {
    const fullEntry: BattleLogEntry = {
      ...entry,
      id: Phaser.Utils.String.UUID(),
      turn: this.context.gameState.currentTurn,
      timeStamp: Date.now(),
    };

    this.entries.push(fullEntry);
  }

  public getEntries(): BattleLogEntry[] {
    return [...this.entries];
  }

  public clear(): void {
    this.entries = [];
  }
}
