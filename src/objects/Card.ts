import Phaser, { Scene } from "phaser";
import type { GameSide } from "../types/GameTypes";
import { CARD_CONFIG } from "../constants/CardConfig";
import type { CardLocation, CardData, CardType } from "../types/CardTypes";
import { EventBus } from "../events/EventBus";
import { GameEvent } from "../events/GameEvents";

export class Card extends Phaser.GameObjects.Container {
  public location: CardLocation = "DECK"; //card initial location
  public readonly originalOwner: GameSide; //real owner of card
  public owner: GameSide; //card controller
  public hasAttacked: boolean = false;
  private frame!: Phaser.GameObjects.Image;
  private cardImage?: Phaser.GameObjects.Image;
  private nameText!: Phaser.GameObjects.Text;
  private manaText!: Phaser.GameObjects.Text;
  private descText!: Phaser.GameObjects.Text;
  private atkText?: Phaser.GameObjects.Text;
  private defText?: Phaser.GameObjects.Text;
  private _isFaceDown: boolean = false;
  private baseData: CardData;
  private currentData: CardData;
  public cardType: CardType;
  public setTurn: number = -1;
  public hasChangedPosition: boolean = false;

  public visualElements!: Phaser.GameObjects.Container;

  constructor(
    scene: Scene,
    x: number,
    y: number,
    data: CardData,
    owner: GameSide,
    originalOwner: GameSide,
  ) {
    super(scene, x, y);
    this.owner = owner;
    this.originalOwner = originalOwner;

    this.currentData = { ...data };
    this.baseData = { ...data };

    const width = data.width ?? CARD_CONFIG.WIDTH;
    const height = data.height ?? CARD_CONFIG.HEIGHT;

    this.cardType = data.type;

    this.setupContainer();
    this.setFrame(width, height);
    this.setImage(scene, data, height, width);
    this.setTexts(data);
    this.setStats(data);

    this.setSize(width, height);
    this.setInteractive({ useHandCursor: true, draggable: false });
    scene.add.existing(this);
  }

  private setupContainer() {
    this.visualElements = this.scene.add.container(0, 0);
    this.add(this.visualElements);
  }

  private setFrame(width: number, height: number) {
    const frameKey = this.getFrameKey(this.cardType);
    this.frame = this.scene.add.image(0, 0, "battle_ui", frameKey);
    this.frame.setDisplaySize(width, height);
    this.visualElements.add(this.frame);
  }

  private setImage(
    scene: Phaser.Scene,
    data: CardData,
    height: number,
    width: number,
  ) {
    if (!data.imageKey || data.imageKey.trim() == "") return;

    //create card sprite (x: center, y: -50);
    this.cardImage = scene.add.image(0, -50, data.imageKey);

    //defines that sprite occupies 85% of total width  of the card
    const targetWidth = width * 0.85;
    if (this.cardImage.width > 0) {
      this.cardImage.setScale(targetWidth / this.cardImage.width);
    }

    this.visualElements.add(this.cardImage);

    const offsetY = -72; //vertical align for the mask
    const maskWidth = width * 0.82;
    const maskHeight = height * 0.42;
    const archHeight = height * 0.16;

    //create "ghost" object (background template) for card image
    const maskShape = scene.add.graphics();
    maskShape.setVisible(false); //hide the drawning
    maskShape.fillStyle(0xffffff);

    //draw rectangular base of mask
    maskShape.fillRect(
      -(maskWidth / 2),
      offsetY - maskHeight / 4,
      maskWidth,
      maskHeight,
    );

    // draw an ellipse at the top of the rectangle to create the smooth dome effect
    maskShape.fillEllipse(
      0,
      offsetY - maskHeight / 4,
      maskWidth,
      archHeight * 2,
    );

    const mask = maskShape.createGeometryMask();
    this.cardImage.setMask(mask);

    //force mask to following the card in animations (hover, drag)
    const updateListener = () => {
      if (!this.active || !this.visualElements) return;
      const worldPos = this.visualElements.getWorldTransformMatrix();
      maskShape.setPosition(worldPos.tx, worldPos.ty);
      maskShape.setRotation(worldPos.rotation);
      maskShape.setScale(worldPos.scaleX, worldPos.scaleY);
    };

    scene.events.on("update", updateListener);

    this.once("destroy", () => {
      scene.events.off("update", updateListener);
      maskShape.destroy();
    });
  }

  private setTexts(data: CardData) {
    const { NAME, MANA, DESC } = CARD_CONFIG.POSITIONS;

    this.nameText = this.scene.add
      .text(NAME.x, NAME.y, data.nameKey.toUpperCase(), {
        ...CARD_CONFIG.STYLES.NAME,
        align: "center",
        fixedWidth: 160,
      })
      .setOrigin(0.5);

    this.manaText = this.scene.add
      .text(MANA.x, MANA.y, data.manaCost.toString(), CARD_CONFIG.STYLES.STATS)
      .setOrigin(0.5);

    this.descText = this.scene.add
      .text(DESC.x, DESC.y, data.descriptionKey || "...", {
        ...CARD_CONFIG.STYLES.DESC,
      })
      .setOrigin(0.5);

    this.visualElements.add([this.nameText, this.manaText, this.descText]);
  }

  private setStats(data: CardData) {
    if (data.type === "MONSTER" || data.type === "EFFECT_MONSTER") {
      const { ATK, DEF } = CARD_CONFIG.POSITIONS;

      this.atkText = this.scene.add
        .text(ATK.x, ATK.y, `${data.atk || 0}`, CARD_CONFIG.STYLES.STATS)
        .setOrigin(0.5);
      this.defText = this.scene.add
        .text(DEF.x, DEF.y, `${data.def || 0}`, CARD_CONFIG.STYLES.STATS)
        .setOrigin(0.5);

      this.visualElements.add([this.atkText, this.defText]);
    }
  }

  private getFrameKey(type: CardType): string {
    switch (type) {
      case "EFFECT_MONSTER":
        return "effect_monster_card";
      case "SPELL":
        return "spell_card";
      case "TRAP":
        return "trap_card";
      default:
        return "monster_card";
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
    this.frame.setTexture("battle_ui", "card_back2");

    this.nameText.setVisible(false);
    this.manaText.setVisible(false);
    this.descText.setVisible(false);

    if (this.cardImage) this.cardImage.setVisible(false);
    if (this.atkText) this.atkText.setVisible(false);
    if (this.defText) this.defText.setVisible(false);

    this.setFieldVisuals();
  }

  public setFaceUp() {
    this._isFaceDown = false;
    const frameKey = this.getFrameKey(this.currentData.type);
    this.frame.setTexture("battle_ui", frameKey);
    this.cardImage?.setVisible(true);

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

    this.frame.setTexture("battle_ui", this.getFrameKey(data.type));

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

    EventBus.emit(GameEvent.CARD_STATS_CHANGED, {
      card: this,
      statType,
      newValue,
      isBuff,
    });

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
