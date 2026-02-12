import type { Card } from "../objects/Card";
import { ToonButton } from "../objects/ToonButton";
import { BattleScene } from "../scenes/BattleScene";
import type {
  GameSide,
  Notice,
  PlacementMode,
  TranslationStructure,
} from "../types/GameTypes";

export class UIManager {
  private scene: BattleScene;
  private side: GameSide;
  private translations!: TranslationStructure;
  private bannerText!: Phaser.GameObjects.Text;
  private bannerBg!: Phaser.GameObjects.Rectangle;
  private manaText!: Phaser.GameObjects.Text;
  private manaIcon!: Phaser.GameObjects.Image;
  private manaAura!: Phaser.GameObjects.Image;
  private manaPosition: { x: number; y: number };
  private hpText!: Phaser.GameObjects.Text;

  private selectionButtons: ToonButton[] = [];

  constructor(scene: BattleScene, side: GameSide) {
    this.scene = scene;
    this.side = side;

    this.manaPosition =
      this.side == "PLAYER" ? { x: 1232, y: 650 } : { x: 1232, y: 73 };
  }

  public setTranslations(translations: TranslationStructure) {
    this.translations = translations;
  }

  public setupUI() {
    const initialMana = this.scene.gameState.getMana(this.side);
    this.manaAura = this.scene.add
      .image(this.manaPosition.x, this.manaPosition.y, "mana_icon")
      .setScale(0.5)
      .setAlpha(0)
      .setTint(0xffffff)
      .setDepth(99);

    this.manaIcon = this.scene.add
      .image(this.manaPosition.x, this.manaPosition.y, "mana_icon")
      .setScale(0.4)
      .setDepth(100);

    this.manaText = this.scene.add
      .text(this.manaIcon.x, this.manaIcon.y, `${initialMana}`, {
        fontSize: "32px",
        fontFamily: "Arial Black",
        color: "#FFD966",
        stroke: "#4D2600",
        strokeThickness: 5,
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(101);

    this.bannerBg = this.scene.add
      .rectangle(640, 360, 1280, 80, 0x000000, 0.85)
      .setVisible(false)
      .setDepth(10000);

    this.bannerText = this.scene.add
      .text(640, 360, "", {
        fontSize: "25px",
        color: "#FFFFFF",
        fontStyle: "bold italic",
        fontFamily: "Arial Black",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(10001);
  }

  public setupLifePoints() {
    const currentHP = this.scene.gameState.getHP(this.side);
    const yPos = this.side == "PLAYER" ? 630 : 40;

    this.createLPBar(30, yPos, currentHP);
  }

  public updateMana(amount: number) {
    this.scene.gameState.modifyMana(this.side, amount);

    const newMana = this.scene.gameState.getMana(this.side);
    this.manaText.setText(`${newMana}`);

    this.scene.tweens.add({
      targets: this.manaAura,
      alpha: { from: 0.8, to: 0 },
      scale: { from: 0.5, to: 0.8 }, //shock wave effect
      duration: 300,
      ease: "Quad.easeOut",
      onComplete: () => {
        this.manaAura.setScale(0.5).setAlpha(0);
      },
    });
  }

  public showNotice(message: string, type: Notice) {
    if (!this.bannerBg || !this.bannerText) return;

    let color: number;

    switch (type) {
      case "PHASE":
        color = 0xffcc00;
        break;
      case "WARNING":
        color = 0xcc0000;
        break;
      case "TURN":
        color = 0x0077ff;
        break;
      case "NEUTRAL":
        color = 0xbdc3c7;
        break;
      default:
        color = 0xffcc00;
        break;
    }

    this.bannerBg.setStrokeStyle(4, color);

    this.animateBanner(message, type);
  }

  private animateBanner(message: string, type: Notice) {
    this.bannerText
      .setText(message.toUpperCase())
      .setAlpha(1)
      .setVisible(true)
      .setScale(0.5);
    this.bannerBg.setAlpha(1).setVisible(true).setScale(1, 0);

    this.scene.tweens.killTweensOf([this.bannerText, this.bannerBg]);

    // start animation
    this.scene.tweens.add({
      targets: this.bannerBg,
      scaleY: 1,
      duration: 150,
      ease: "Quad.easeOut",
    });

    // pop animation
    this.scene.tweens.add({
      targets: this.bannerText,
      scale: 1,
      duration: 200,
      ease: "Back.easeOut",
      onComplete: () => {
        //shake effect
        if (type === "WARNING") {
          this.scene.tweens.add({
            targets: [this.bannerText, this.bannerBg],
            x: "+=3",
            yoyo: true,
            duration: 40,
            repeat: 3,
          });
        }
      },
    });

    this.scene.time.delayedCall(1500, () => {
      this.scene.tweens.add({
        targets: [this.bannerText, this.bannerBg],
        alpha: 0,
        y: "-=20",
        duration: 400,
        onComplete: () => {
          this.bannerText.setVisible(false).setY(360);
          this.bannerBg.setVisible(false).setY(360);

          this.bannerText.setX(640);
          this.bannerBg.setX(640);
        },
      });
    });
  }

  private createLPBar(x: number, y: number, initialHP: number) {
    const width = 180;
    const height = 60;
    const radius = 12;

    const stoneDark = 0x262626; // background
    const metalGold = 0xcfb35d; // border
    const magicGlow = "#FFD966"; // color text

    const container = this.scene.add.container(x, y);
    const bg = this.scene.add.graphics();

    bg.fillStyle(0x000000, 0.5);
    bg.fillRoundedRect(4, 4, width, height, radius);

    bg.fillStyle(stoneDark, 1);
    bg.fillRoundedRect(0, 0, width, height, radius);

    bg.lineStyle(4, metalGold, 1);
    bg.strokeRoundedRect(0, 0, width, height, radius);

    bg.lineStyle(2, 0x000000, 0.3);
    bg.strokeRoundedRect(3, 3, width - 6, height - 6, radius - 2);

    container.add(bg);

    const labelLP = this.scene.add
      .text(20, 18, "LP", {
        fontFamily: "Arial Black",
        fontSize: "18px",
        color: magicGlow,
      })
      .setOrigin(0, 0.5);
    container.add(labelLP);

    const textStyle = {
      fontFamily: "Arial Black",
      fontSize: "36px",
      color: magicGlow,
    };

    this.hpText = this.scene.add
      .text(60, 30, `${initialHP}`, textStyle)
      .setOrigin(0, 0.5)
      .setShadow(2, 2, "#000000", 4, true, false);

    container.add(this.hpText);

    if (this.side === "PLAYER") {
      container.setY(y - 10);
    }
  }

  public showSelectionMenu(
    x: number,
    y: number,
    card: Card,
    cb: (mode: PlacementMode) => void,
  ) {
    this.clearSelectionMenu();

    const cardType = card.getType();
    const isMonster = cardType.includes("MONSTER");
    const buttonTexts = this.translations.battle_scene.battle_buttons;

    let leftConfig = null;
    let rightConfig = null;

    if (isMonster) {
      leftConfig = { text: "", icon: "sword_icon", width: 70 };
      rightConfig = { text: "", icon: "shield_icon", width: 70 };
    } else if (cardType === "SPELL") {
      leftConfig = { text: buttonTexts.active, width: 90 };
      rightConfig = { text: buttonTexts.set, width: 110 };
    } else if (cardType === "TRAP") {
      rightConfig = { text: buttonTexts.set, width: 110 };
    }

    if (leftConfig) {
      const leftBtn = new ToonButton(this.scene, {
        x: x - (rightConfig ? 75 : 0),
        y: y - 100,
        height: 42,
        fontSize: "18px",
        color: 0x302b1f,
        textColor: "#FFD966",
        hoverColor: 0x302b1f,
        borderColor: 0xeee5ae,
        ...leftConfig,
      }).setDepth(10002);

      this.selectionButtons.push(leftBtn);

      leftBtn.on("pointerdown", () => {
        this.clearSelectionMenu();
        cb(isMonster ? "ATK" : "FACE_UP"); //FACE_UP trigger cardActivation method
      });
    }

    if (rightConfig) {
      const rightBtn = new ToonButton(this.scene, {
        x: x + 75,
        y: y - 100,
        height: 42,
        fontSize: "16px",
        color: 0x302b1f,
        textColor: "#FFD966",
        hoverColor: 0x302b1f,
        borderColor: 0xeee5ae,
        ...rightConfig,
      }).setDepth(10002);

      this.selectionButtons.push(rightBtn);

      rightBtn.on("pointerdown", () => {
        this.clearSelectionMenu();
        cb(isMonster ? "DEF" : "SET");
      });
    }
  }

  public clearSelectionMenu() {
    this.selectionButtons.forEach((btn) => btn.destroy());
    this.selectionButtons = [];
  }

  public showFieldCardMenu(x: number, y: number, card: Card) {
    this.clearSelectionMenu();
    if (this.side !== "PLAYER") return;

    const battleTexts = this.translations["battle_scene"];
    const buttonTexts = battleTexts.battle_buttons;

    //npc monster slot limit -> y: 270 | npc spell slot limit -> y: 120,
    const isPlayerCard = card.y > 270;

    const buttons: ToonButton[] = [];
    const cardData = card.getCardData();
    const currentTurn = this.scene.gameState.currentTurn;
    const myTurn = this.scene.gameState.activePlayer == "PLAYER";

    //attack phase
    const currentPhase = this.scene.currentPhase;
    const isAttackPosition = card.angle == 0;
    const canAttack =
      cardData.atk !== undefined && isAttackPosition && !card.isFaceDown;

    const isEffectCard =
      card.getType() === "TRAP" || card.getType() == "EFFECT_MONSTER";
    const hasWaitedOneTurn = currentTurn > card.setTurn;

    if (card.isFaceDown && isPlayerCard && myTurn) {
      const canActive = isEffectCard ? hasWaitedOneTurn : true;

      //trap or effect monster need wait 1 turn to active
      if (canActive) {
        const activeBtn = new ToonButton(this.scene, {
          text: buttonTexts.active,
          x: x - 70,
          y: y - 80,
          height: 42,
          width: 120,
          fontSize: "16px",
          color: 0x302b1f,
          textColor: "#FFD966",
          hoverColor: 0x4d4533,
          borderColor: 0xeee5ae,
        }).setDepth(10002);

        activeBtn.on("pointerdown", () => {
          this.clearSelectionMenu();
          this.scene.cardActivation(card, this.side);
        });

        buttons.push(activeBtn);
      }
    }

    //always visible
    if (!card.isFaceDown || isPlayerCard) {
      if (currentPhase == "BATTLE" && canAttack && myTurn) {
        const attackBtn = new ToonButton(this.scene, {
          text: "ATACAR",
          x: x + 70,
          y: y - 35,
          height: 42,
          width: 120,
          fontSize: "16px",
          color: 0x302b1f,
          textColor: "#FFD966",
          hoverColor: 0x4d4533,
          borderColor: 0xeee5ae,
        }).setDepth(10002);

        attackBtn.on("pointerdown", () => {
          this.clearSelectionMenu();
          console.log("atk", card);
        });

        buttons.push(attackBtn);
      }
      const detailsBtn = new ToonButton(this.scene, {
        text: buttonTexts.details,
        x: x - 70,
        y: y - 35,
        height: 42,
        width: 120,
        fontSize: "16px",
        color: 0x302b1f,
        textColor: "#FFD966",
        hoverColor: 0x4d4533,
        borderColor: 0xeee5ae,
      }).setDepth(10002);
      detailsBtn.on("pointerdown", () => {
        this.clearSelectionMenu();
        this.scene.playerHand.showHand();
        this.scene.scene.launch("CardDetailScene", {
          cardData: cardData,
          owner: card.owner,
          location: card.location,
        });
      });

      buttons.push(detailsBtn);
    }

    this.selectionButtons = buttons;
  }

  public showGraveyardMenu(graveyardCards: Card[], x: number, y: number) {
    this.clearSelectionMenu();

    const battleTexts = this.translations["battle_scene"];
    const buttonTexts = battleTexts.battle_buttons;

    const detailsBtn = new ToonButton(this.scene, {
      text: buttonTexts.details,
      x: x + 70,
      y: y - 35,
      height: 42,
      width: 120,
      fontSize: "16px",
      color: 0x302b1f,
      textColor: "#FFD966",
      hoverColor: 0x4d4533,
      borderColor: 0xeee5ae,
    }).setDepth(10002);

    detailsBtn.on("pointerdown", () => {
      this.clearSelectionMenu();
      this.scene.scene.launch("CardListScene", graveyardCards);
    });

    this.selectionButtons = [detailsBtn];
  }
}
