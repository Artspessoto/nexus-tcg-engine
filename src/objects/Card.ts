import Phaser, { Scene } from "phaser";
import type { GameSide } from "../types/GameTypes";
import { CARD_CONFIG } from "../constants/CardConfig";
import type { CardLocation, CardData, CardType } from "../types/CardTypes";

export class Card extends Phaser.GameObjects.Container {
  public location: CardLocation = "DECK"; //card initial location
  public owner: GameSide;
  public hasAttacked: boolean = false;
  private frame: Phaser.GameObjects.Image;
  // private cardImage: Phaser.GameObjects.Image;
  private nameText: Phaser.GameObjects.Text;
  private manaText: Phaser.GameObjects.Text;
  private descText: Phaser.GameObjects.Text;
  private atkText?: Phaser.GameObjects.Text;
  private defText?: Phaser.GameObjects.Text;
  private _isFaceDown: boolean = false;
  private baseData: CardData;
  private currentData: CardData;
  public cardType: CardType;
  public setTurn: number = -1;
  public hasChangedPosition: boolean = false;

  public visualElements: Phaser.GameObjects.Container;

  constructor(
    scene: Scene,
    x: number,
    y: number,
    data: CardData,
    owner: GameSide,
  ) {
    super(scene, x, y);
    this.owner = owner;

    this.currentData = { ...data };
    this.baseData = { ...data };

    this.visualElements = scene.add.container(0, 0);
    this.add(this.visualElements);

    const { NAME, MANA, DESC, ATK, DEF } = CARD_CONFIG.POSITIONS;
    const width = data.width ?? CARD_CONFIG.WIDTH;
    const height = data.height ?? CARD_CONFIG.HEIGHT;

    //define model image by type
    const frameKey = this.getFrameKey(data.type);

    // model image
    this.frame = scene.add.image(0, 0, frameKey);
    this.frame.setDisplaySize(width, height);
    this.visualElements.add(this.frame);

    //add cart art
    // this.cardImage = scene.add.image(0, -28, data.imageKey);
    // this.cardImage.setDisplaySize(CARD_CONFIG.WIDTH, CARD_CONFIG.HEIGHT);
    // this.add(this.cardImage);

    //text position
    this.nameText = scene.add
      .text(NAME.x, NAME.y, data.nameKey.toUpperCase(), {
        ...CARD_CONFIG.STYLES.NAME,
        align: "center",
        fixedWidth: 160,
      })
      .setOrigin(0.5);

    this.manaText = scene.add
      .text(MANA.x, MANA.y, data.manaCost.toString(), CARD_CONFIG.STYLES.STATS)
      .setOrigin(0.5);

    this.descText = scene.add
      .text(DESC.x, DESC.y, data.descriptionKey || "...", {
        ...CARD_CONFIG.STYLES.DESC,
      })
      .setOrigin(0.5);

    this.visualElements.add([this.nameText, this.manaText, this.descText]);

    this.cardType = data.type;

    if (data.type == "MONSTER" || data.type == "EFFECT_MONSTER") {
      const atkValue = `${data.atk?.toString() || 0}`;
      const defValue = `${data.def?.toString() || 0}`;

      this.atkText = this.scene.add
        .text(ATK.x, ATK.y, atkValue, CARD_CONFIG.STYLES.STATS)
        .setOrigin(0.5);

      this.defText = this.scene.add
        .text(DEF.x, DEF.y, defValue, CARD_CONFIG.STYLES.STATS)
        .setOrigin(0.5);

      this.visualElements.add([this.atkText, this.defText]);
    }

    this.setSize(width, height);
    this.setInteractive({ useHandCursor: true, draggable: false });
    scene.add.existing(this);
  }

  private getFrameKey(type: CardType): string {
    switch (type) {
      case "EFFECT_MONSTER":
        return "card_template_effect";
      case "SPELL":
        return "card_template_spell";
      case "TRAP":
        return "card_template_trap";
      default:
        return "card_template_monster";
    }
  }

  public getType(): CardType {
    return this.cardType;
  }

  public setFieldVisuals() {
    const FIELD_W = 320;
    const FIELD_H = 450;

    this.frame.setDisplaySize(FIELD_W, FIELD_H);

    this.setSize(FIELD_W, FIELD_H);
  }

  public get isFaceDown(): boolean {
    return this._isFaceDown;
  }

  public setHandVisuals() {
    const width = CARD_CONFIG.WIDTH;
    const height = CARD_CONFIG.HEIGHT;

    this.frame.setDisplaySize(width, height);

    this.setSize(width, height);
  }

  public setFaceDown() {
    this._isFaceDown = true;
    this.frame.setTexture("card_back");

    this.nameText.setVisible(false);
    this.manaText.setVisible(false);
    this.descText.setVisible(false);

    if (this.atkText) this.atkText.setVisible(false);
    if (this.defText) this.defText.setVisible(false);

    this.setFieldVisuals();
  }

  public setFaceUp() {
    this._isFaceDown = false;
    this.frame.setTexture(this.getFrameKey(this.currentData.type));

    this.nameText.setVisible(true);
    this.manaText.setVisible(true);
    this.descText.setVisible(true);
  }

  public setLocation(newLocation: CardLocation, currentTurn?: number) {
    this.location = newLocation;

    if (this.location == "FIELD" && currentTurn) {
      this.setTurn = currentTurn;
    }
  }

  public setOwner(cardOwner: GameSide) {
    this.owner = cardOwner;
  }

  public getCardData(): CardData {
    return this.currentData;
  }

  public getBaseData(): CardData {
    return this.baseData;
  }

  public updateData(data: CardData): this {
    //update card data without create new instance
    this.baseData = { ...data };
    this.currentData = { ...data };
    this.cardType = data.type;

    this.frame.setTexture(this.getFrameKey(data.type));

    this.nameText.setText(data.nameKey.toUpperCase());
    this.descText.setText(data.descriptionKey || "");
    this.manaText.setText(data.manaCost.toString());

    const isMonster = data.type == "MONSTER" || data.type == "EFFECT_MONSTER";

    if (isMonster) {
      const atkValue = data.atk?.toString() || "0";
      const defValue = data.def?.toString() || "0";

      if (this.atkText && this.defText) {
        this.atkText?.setText(atkValue).setVisible(true);
        this.defText?.setText(defValue).setVisible(true);
      }
    } else {
      this.atkText?.setVisible(false);
      this.defText?.setVisible(false);
    }

    return this;
  }

  public resetStats() {
    this.currentData = { ...this.baseData };

    if (this.atkText && this.defText) {
      this.atkText.setText(this.baseData.atk?.toString() || "0");
      this.defText.setText(this.baseData.def?.toString() || "0");

      this.atkText.setColor(CARD_CONFIG.STYLES.STATS.color);
      this.defText.setColor(CARD_CONFIG.STYLES.STATS.color);
    }
  }

  public activate() {
    if (!this._isFaceDown) return;

    this.setFaceUp();
  }

  public updateStat(newValue: number, statType: "atk" | "def") {
    const text = statType == "atk" ? this.atkText : this.defText;
    const baseValue =
      text == this.atkText ? this.baseData.atk : this.baseData.def;

    this.currentData[statType] = newValue;

    if (baseValue == undefined || !text) return;

    text.setText(newValue.toString());

    const isBuff = newValue > baseValue;
    const isNerf = newValue < baseValue;

    const jumpConfig = this._isFaceDown ? { x: -30, y: 0 } : { x: 0, y: -30 };

    if (isBuff) {
      text.setColor("#4dff4d"); //buff
    } else if (isNerf) {
      text.setColor("#ff4d4d"); //nerf
    } else {
      text.setColor("#FFD966"); //original
    }

    this.scene.tweens.add({
      targets: this.visualElements,
      ...jumpConfig,
      scale: 1.1,
      y: -30,
      duration: 200,
      yoyo: true,
      ease: "Back.easeOut",
      onStart: () => {
        this.frame.setTint(newValue > baseValue ? 0x4dff4d : 0xff4d4d);
      },
      onComplete: () => {
        this.frame.clearTint();
        this.visualElements.setPosition(0, 0);
      },
    });

    if (!this.isFaceDown) {
      this.scene.tweens.add({
        targets: this.atkText,
        scale: 1.8,
        duration: 200,
        yoyo: true,
        ease: "Quad.easeOut",
      });
    }
  }

  public animateFlip(onComplete?: () => void) {
    this.hasChangedPosition = true;

    this.scene.tweens.add({
      targets: this,
      angle: 0,
      scale: 0.45,
      duration: 250,
      ease: "Back.easeOut",
      onStart: () => this.setFaceUp(),
      onComplete: () => {
        this.scene.tweens.add({
          targets: this,
          scale: 0.32, // back to original scale
          duration: 150,
          onComplete: () => {
            if (onComplete) onComplete();
          },
        });
      },
    });
  }

  public animateChangePosition(onComplete?: () => void) {
    this.hasChangedPosition = true;
    const isAtk = this.angle === 0;
    const targetAngle = isAtk ? 270 : 0;

    this.scene.tweens.add({
      targets: this,
      angle: targetAngle,
      scale: 0.45,
      duration: 250,
      ease: "Power2",
      onComplete: () => {
        this.scene.tweens.add({
          targets: this,
          scale: 0.32,
          duration: 150,
          onComplete: () => {
            if (onComplete) onComplete();
          },
        });
      },
    });
  }
}
