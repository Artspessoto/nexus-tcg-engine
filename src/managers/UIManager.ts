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

  public updateLP(side: GameSide, amount: number) {
    const startLP = this.scene.gameState.getHP(side);

    this.scene.gameState.modifyHP(side, amount);

    this.animateLPImpact(amount);

    const targetLP = this.scene.gameState.getHP(side);
    const lpCounter = { value: startLP };

    this.scene.tweens.add({
      targets: lpCounter,
      value: targetLP,
      duration: 1200,
      ease: "Power2",
      onUpdate: () => {
        this.hpText.setText(Math.floor(lpCounter.value).toString());
      },
    });
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
    this.scene.tweens.killTweensOf([this.bannerText, this.bannerBg]);

    this.bannerText
      .setText(message.toUpperCase())
      .setAlpha(1)
      .setVisible(true)
      .setScale(0.5);
    this.bannerBg.setAlpha(1).setVisible(true).setScale(1, 0);

    // start animation
    this.scene.tweens.add({
      targets: this.bannerBg,
      scaleY: 1,
      alpha: 1,
      duration: 100,
      ease: "Quad.easeOut",
    });

    // pop animation
    this.scene.tweens.add({
      targets: this.bannerText,
      scale: 1,
      duration: 150,
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

    this.scene.time.delayedCall(600, () => {
      this.scene.tweens.add({
        targets: [this.bannerText, this.bannerBg],
        alpha: 0,
        y: "-=30",
        duration: 200,
        ease: "Power2.easeIn",
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

    const myTurn = this.scene.gameState.activePlayer == "PLAYER";
    if (!myTurn) return;

    const buttons: ToonButton[] = [];

    const buttonArgs: ButtonParams = { card, buttons, x, y };

    this.addPositionButtons(buttonArgs);
    this.addAttackButton(buttonArgs);
    this.addActivationButton(buttonArgs);
    this.addDetailsButton(buttonArgs);

    this.selectionButtons = buttons;
  }

  public showGraveyardMenu(graveyardCards: Card[], x: number, y: number) {
    this.clearSelectionMenu();

    const battleTexts = this.translations["battle_scene"];
    const buttonTexts = battleTexts.battle_buttons;

    this.selectionButtons.push(
      this.createMenuButton(buttonTexts.details, x + 70, y - 35, () => {
        this.scene.scene.launch("CardListScene", graveyardCards);
      }),
    );
  }

  private addPositionButtons({ card, buttons, x, y }: ButtonParams) {
    const mainPhase = this.scene.currentPhase == "MAIN";
    const currentTurn = this.scene.gameState.currentTurn;
    const hasWaited = currentTurn > card.setTurn;
    const monsterCard = card.getType().includes("MONSTER");
    const battleTexts = this.translations["battle_scene"];
    const buttonTexts = battleTexts.battle_buttons;

    const canChangePos =
      mainPhase &&
      hasWaited &&
      !card.hasChangedPosition &&
      card.owner == "PLAYER" &&
      monsterCard;

    if (!canChangePos) return;

    if (card.isFaceDown) {
      buttons.push(
        this.createMenuButton("VIRAR", x + 70, y - 35, () =>
          this.handleFlipSummon(card),
        ),
      );
    } else {
      const label = buttonTexts.change_pos;
      buttons.push(
        this.createMenuButton(label, x + 70, y - 35, () =>
          this.handleChangePosition(card),
        ),
      );
    }
  }

  private addAttackButton({ card, buttons, x, y }: ButtonParams) {
    const currentPhase = this.scene.currentPhase;
    const cardData = card.getCardData();
    const battleTexts = this.translations["battle_scene"];
    const buttonTexts = battleTexts.battle_buttons;

    //attack phase
    const isAttackPosition = card.angle == 0;
    const canAttack =
      cardData.atk !== undefined &&
      isAttackPosition &&
      card.owner == "PLAYER" &&
      !card.isFaceDown &&
      !card.hasAttacked;
    //atk btn
    if (currentPhase === "BATTLE" && canAttack) {
      buttons.push(
        this.createMenuButton(buttonTexts.attack, x + 70, y - 35, () => {
          this.scene.onAttackDeclared(card);
        }),
      );
    }
  }

  private addActivationButton({ card, buttons, x, y }: ButtonParams) {
    const battleTexts = this.translations["battle_scene"];
    const buttonTexts = battleTexts.battle_buttons;

    const currentTurn = this.scene.gameState.currentTurn;
    const hasWaited = currentTurn > card.setTurn;
    const isEffectCard =
      card.getType() === "TRAP" || card.getType() == "EFFECT_MONSTER";

    if (card.isFaceDown && card.owner == "PLAYER") {
      const canActive = isEffectCard ? hasWaited : true;

      //trap or effect monster need wait 1 turn to active
      if (canActive && card.getType() !== "MONSTER") {
        buttons.push(
          this.createMenuButton(buttonTexts.active, x - 70, y - 35, () => {
            this.scene.cardActivation(card, this.side);
          }),
        );
      }
    }
  }

  private addDetailsButton({ card, buttons, x, y }: ButtonParams) {
    const battleTexts = this.translations["battle_scene"];
    const buttonTexts = battleTexts.battle_buttons;

    //details btn always visible
    if (!card.isFaceDown || card.owner == "PLAYER") {
      buttons.push(
        this.createMenuButton(buttonTexts.details, x - 70, y - 35, () => {
          this.scene.scene.launch("CardDetailScene", {
            cardData: card.getCardData(),
            owner: card.owner,
          });
        }),
      );
    }
  }

  private createMenuButton(
    text: string,
    x: number,
    y: number,
    callback: () => void,
  ): ToonButton {
    const btn = new ToonButton(this.scene, {
      text: text.toUpperCase(),
      x: x,
      y: y,
      height: 40,
      width: 120,
      fontSize: "14px",
      color: 0x302b1f,
      textColor: "#FFD966",
      hoverColor: 0x4d4533,
      borderColor: 0xeee5ae,
    }).setDepth(10002);

    btn.on("pointerdown", () => {
      this.clearSelectionMenu();
      callback();
    });

    return btn;
  }

  public handleFlipSummon(card: Card) {
    card.animateFlip(() => {
      // card impact animation effect
      this.scene.cameras.main.shake(100, 0.002);
      this.scene.playerHand.showHand();
    });
  }

  public handleChangePosition(card: Card) {
    card.animateChangePosition(() => {
      // card impact animation effect
      this.scene.cameras.main.shake(100, 0.002);
      this.scene.playerHand.showHand();
    });
  }

  private animateLPImpact(amount: number) {
    const isDamage = amount < 0; //take dmg is negative value
    const originalColor = "#FFD966"; // magicGlow
    const impactColor = isDamage ? "#ff4d4d" : "#4dff4d";

    this.hpText.setColor(impactColor);

    this.scene.tweens.add({
      targets: this.hpText,
      scale: 1.4,
      duration: 150,
      yoyo: true,
      ease: "Back.easeOut",
      onComplete: () => {
        this.hpText.setColor(originalColor);
        this.hpText.setScale(1);
      },
    });

    if (isDamage) {
      this.scene.cameras.main.shake(200, 0.005);
    }
  }
}

export interface ButtonParams {
  card: Card;
  x: number;
  y: number;
  buttons: ToonButton[];
}
