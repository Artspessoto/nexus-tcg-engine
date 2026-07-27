import Phaser from "phaser";

export interface ButtonConfig {
  x: number;
  y: number;
  text: string;
  icon?: string;
  width?: number;
  height?: number;
  color?: number;
  fontSize?: string;
  hoverColor?: number;
  textColor?: string;
  fontFamily?: string;
  borderWidth?: number;
  borderColor?: number;
  headerText?: string;
  headerFontSize?: string;
  alpha?: number; // 0 = invisible, 1 = solid, 0.5 = 50% transparent
}

export class ToonButton extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private headerLabel!: Phaser.GameObjects.Text;
  private iconImage?: Phaser.GameObjects.Image;
  private config: Required<ButtonConfig>;

  constructor(scene: Phaser.Scene, config: ButtonConfig) {
    //container position
    super(scene, config.x, config.y);

    this.config = {
      width: 250,
      height: 60,
      color: 0xffcc00,
      hoverColor: 0xffe066,
      textColor: "#000000",
      fontSize: "24px",
      fontFamily: "Arial Black",
      icon: "",
      borderWidth: 3,
      borderColor: 0x000000,
      alpha: 1,
      headerFontSize: "",
      headerText: "",
      ...config,
    };

    //background
    this.bg = scene.add.graphics();
    this.drawBackground(this.config.color);

    //header text
    const labelY = config.headerText ? 10 : 0;

    //text
    this.label = scene.add
      .text(0, labelY, this.config.text, {
        fontSize: this.config.fontSize,
        color: this.config.textColor,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    
    this.adjustTextScale();

    if (config.headerText) {
      this.headerLabel = scene.add
        .text(0, -15, config.headerText.toUpperCase(), {
          fontSize: config.headerFontSize || "12px",
          color: this.config.textColor,
          fontFamily: this.config.fontFamily,
        })
        .setOrigin(0.5);
      this.add(this.headerLabel);
    }

    //add into container
    this.add([this.bg, this.label]);

    if (this.config.icon) {
      this.iconImage = this.scene.add.image(0, 0, this.config.icon);

      const imgHeight = this.iconImage.height || 32;
      const iconScale = (this.config.height * 0.8) / imgHeight;
      this.iconImage.setScale(iconScale);

      this.add(this.iconImage);
      this.label.setVisible(false);
    }

    const hitArea = new Phaser.Geom.Rectangle(
      -this.config.width / 2,
      -this.config.height / 2,
      this.config.width,
      this.config.height,
    );
    this.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

    this.input!.cursor = "pointer";

    this.on("pointerover", () =>
      this.drawBackground(this.config.hoverColor ?? 0xffe066),
    );
    this.on("pointerout", () => this.drawBackground(this.config.color));

    scene.add.existing(this);
  }

  private drawBackground(color: number): void {
    this.bg.clear();

    const halfW = this.config.width / 2;
    const halfH = this.config.height / 2;
    const borderWidth = this.config.borderWidth ?? 3;
    const borderColor = this.config.borderColor ?? 0x000000;

    // background
    this.bg.fillStyle(color, this.config.alpha);
    this.bg.fillRoundedRect(
      -halfW,
      -halfH,
      this.config.width,
      this.config.height,
      12,
    );

    // toon border
    this.bg.lineStyle(borderWidth, borderColor, this.config.alpha);
    this.bg.strokeRoundedRect(
      -halfW,
      -halfH,
      this.config.width,
      this.config.height,
      12,
    );
  }

  public setText(newText: string): void {
    this.label.setText(newText);
    this.adjustTextScale();
  }

  public setHeaderText(text: string): void {
    if (!this.headerLabel) {
      this.headerLabel = this.scene.add
        .text(0, -15, text.toUpperCase(), {
          fontSize: "12px",
          color: this.config.textColor,
          fontFamily: this.config.fontFamily,
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setAlpha(0.8);

      this.add(this.headerLabel);

      this.label.setY(10);
    } else {
      this.headerLabel.setText(text.toUpperCase());
    }
  }

  public setButtonColor(color: number): void {
    this.config.color = color;
    this.drawBackground(color);
  }

  public updatePhase(turn: string, phaseText: string, color?: number): void {
    this.config.alpha = 1;

    this.label.setAlpha(1);
    if (this.headerLabel) {
      this.headerLabel.setAlpha(0.8);
    }

    this.setHeaderText(turn);
    this.setText(phaseText.toUpperCase());

    if (color !== undefined) {
      this.setButtonColor(color);
    }
  }

  public setDisabledState(text: string, color: number = 0x333333): void {
    this.disableInteractive();
    this.config.color = color;
    this.config.alpha = 0.7;
    this.setText(text.toUpperCase());
    this.drawBackground(this.config.color);

    this.label.setAlpha(0.5);
    if (this.headerLabel) this.headerLabel.setAlpha(0.5);
  }

  private adjustTextScale(): void {
    this.label.setScale(1);

    const padding = 20; //margin 10 for each side
    const maxWidth = this.config.width - padding;

    if (this.label.displayWidth > maxWidth) {
      const scaleFactor = maxWidth / this.label.displayWidth;
      this.label.setScale(scaleFactor);
    }
  }
}
