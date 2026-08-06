import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { THEME_CONFIG } from "../constants/ThemeConfig";
import type { GameSide } from "../types/GameTypes";

export interface PlayerStatsViewConfig {
  scene: Phaser.Scene;
  initialLP: number;
  initialMana: number;
  playerName: string;
  side: GameSide;
}

export class PlayerStatsView {
  private scene: Phaser.Scene;

  public lpContainer: Phaser.GameObjects.Container;
  private lpText!: Phaser.GameObjects.Text;

  public manaContainer: Phaser.GameObjects.Container;
  private manaText!: Phaser.GameObjects.Text;
  private manaIcon!: Phaser.GameObjects.Image;
  private manaAura!: Phaser.GameObjects.Image;

  constructor(config: PlayerStatsViewConfig) {
    this.scene = config.scene;

    this.lpContainer = this.buildLPBar(
      config.side,
      config.playerName,
      config.initialLP,
    );

    this.manaContainer = this.buildManaDisplay(config.side, config.initialMana);
  }

  private buildLPBar(
    side: GameSide,
    playerName: string,
    initialLP: number,
  ): Phaser.GameObjects.Container {
    const { HEIGHT, RADIUS, WIDTH, Y_OPPONENT, Y_PLAYER, X } =
      LAYOUT_CONFIG.UI.LP_BAR;
    const { COLORS } = THEME_CONFIG;

    const yPos = side == "PLAYER" ? Y_PLAYER : Y_OPPONENT;
    const container = this.scene.add.container(X, yPos);

    const bg = this.scene.add.graphics();

    bg.fillStyle(COLORS.OVERLAY_BLACK, 0.5);
    bg.fillRoundedRect(4, 4, WIDTH, HEIGHT, RADIUS);

    bg.fillStyle(COLORS.STONE_DARK, 1);
    bg.fillRoundedRect(0, 0, WIDTH, HEIGHT, RADIUS);

    bg.lineStyle(4, COLORS.GOLD_METAL, 1);
    bg.strokeRoundedRect(0, 0, WIDTH, HEIGHT, RADIUS);

    bg.lineStyle(2, COLORS.OVERLAY_BLACK, 0.3);
    bg.strokeRoundedRect(3, 3, WIDTH - 6, HEIGHT - 6, RADIUS - 2);

    const nameText = this.scene.add
      .text(20, 8, playerName, {
        fontFamily: THEME_CONFIG.FONTS.FAMILY_DISPLAY,
        fontSize: "16px",
        color: "#EAEAEA",
      })
      .setOrigin(0.0);

    const labelLP = this.scene.add
      .text(20, 45, "LP", {
        fontFamily: THEME_CONFIG.FONTS.FAMILY_DISPLAY,
        fontSize: "18px",
        color: COLORS.GOLD_GLOW,
      })
      .setOrigin(0, 0.5);

    const textStyle = {
      fontFamily: THEME_CONFIG.FONTS.FAMILY_DISPLAY,
      fontSize: "36px",
      color: COLORS.GOLD_GLOW,
    };

    this.lpText = this.scene.add
      .text(55, 45, `${initialLP}`, textStyle)
      .setOrigin(0, 0.5)
      .setShadow(2, 2, "#000000", 4, true, false);

    container.add([bg, nameText, labelLP, this.lpText]);

    if (side === "PLAYER") {
      container.setY(yPos - 10);
    }

    return container;
  }

  private buildManaDisplay(
    side: GameSide,
    initialMana: number,
  ): Phaser.GameObjects.Container {
    const { DEPTHS, FONTS } = THEME_CONFIG;
    const position = LAYOUT_CONFIG.UI.MANA[side];
    const container = this.scene.add
      .container(position.x, position.y)
      .setDepth(0);

    this.manaAura = this.scene.add
      .image(0, 0, "battle_ui", "mana_icon")
      .setScale(0.5)
      .setAlpha(0)
      .setTint(0xffffff)
      .setDepth(DEPTHS.UI_BASE - 1);

    this.manaIcon = this.scene.add
      .image(0, 0, "battle_ui", "mana_icon")
      .setScale(0.4)
      .setDepth(DEPTHS.UI_BASE);

    this.manaText = this.scene.add
      .text(
        this.manaAura.x,
        this.manaAura.y,
        `${initialMana}`,
        FONTS.STYLES.MANA_DISPLAY,
      )
      .setOrigin(0.5)
      .setDepth(DEPTHS.UI_BASE + 1);

    container.add([this.manaIcon, this.manaAura, this.manaText]);

    return container;
  }

  public animateLPChange(amount: number, startLP: number, targetLP: number) {
    const { ANIMATIONS } = THEME_CONFIG;

    this.animateLPImpact(amount);

    const lpCounter = { value: startLP };

    this.scene.tweens.add({
      targets: lpCounter,
      value: targetLP,
      duration: ANIMATIONS.DURATIONS.LP_ROLL,
      ease: ANIMATIONS.EASING.SMOOTH,
      onUpdate: () => {
        this.lpText.setText(Math.floor(lpCounter.value).toString());
      },
    });
  }

  public animateManaChange(amount: number) {
    const { ANIMATIONS } = THEME_CONFIG;

    this.manaText.setText(`${amount}`);

    this.scene.tweens.add({
      targets: this.manaAura,
      alpha: { from: 0.8, to: 0 },
      scale: { from: 0.5, to: 0.8 }, //shock wave effect
      duration: ANIMATIONS.DURATIONS.NORMAL,
      ease: ANIMATIONS.EASING.QUART_OUT,
      onComplete: () => {
        this.manaAura.setScale(0.5).setAlpha(0);
      },
    });
  }

  private animateLPImpact(amount: number) {
    const { COLORS, ANIMATIONS } = THEME_CONFIG;
    const isDamage = amount < 0; //take dmg is negative value
    const impactColor = isDamage ? COLORS.LP_DAMAGE : COLORS.LP_HEAL;

    this.lpText.setColor(impactColor);

    this.scene.tweens.add({
      targets: this.lpText,
      scale: 1.4,
      duration: ANIMATIONS.DURATIONS.UI_POP,
      yoyo: true,
      ease: ANIMATIONS.EASING.BOUNCE,
      onComplete: () => {
        this.lpText.setColor(COLORS.GOLD_GLOW);
        this.lpText.setScale(1);
      },
    });

    if (isDamage) {
      this.scene.cameras.main.shake(
        ANIMATIONS.SHAKES.STRONG.duration,
        ANIMATIONS.SHAKES.STRONG.intensity,
      );
    }
  }
}
