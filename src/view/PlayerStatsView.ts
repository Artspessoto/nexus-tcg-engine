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

  private enemyAvatarImage?: Phaser.GameObjects.Image;
  private playerAvatarImage?: Phaser.GameObjects.Image;
  private maxLP: number;

  constructor(config: PlayerStatsViewConfig) {
    this.scene = config.scene;

    this.lpContainer = this.buildLPBar(
      config.side,
      config.playerName,
      config.initialLP,
    );

    this.maxLP = config.initialLP;

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

    // bg.fillStyle(COLORS.OVERLAY_BLACK, 0.5);
    // bg.fillRoundedRect(4, 4, WIDTH, HEIGHT, RADIUS);

    // bg.fillStyle(COLORS.STONE_DARK, 1);
    // bg.fillRoundedRect(0, 0, WIDTH, HEIGHT, RADIUS);

    // bg.lineStyle(4, COLORS.GOLD_METAL, 1);
    // bg.strokeRoundedRect(0, 0, WIDTH, HEIGHT, RADIUS);

    // bg.lineStyle(2, COLORS.OVERLAY_BLACK, 0.3);
    // bg.strokeRoundedRect(3, 3, WIDTH - 6, HEIGHT - 6, RADIUS - 2);
    bg.fillStyle(COLORS.OVERLAY_BLACK, 0.6);
    bg.fillRoundedRect(4, 6, WIDTH, HEIGHT, RADIUS);

    //gradient
    //4 colors(top left, top right, left bottom, right bottom)
    bg.fillGradientStyle(
      COLORS.UI_BG_TOP,
      COLORS.UI_BG_TOP,
      COLORS.UI_BG_BOTTOM,
      COLORS.UI_BG_BOTTOM,
      1,
    );
    bg.fillRoundedRect(0, 0, WIDTH, HEIGHT, RADIUS);

    bg.lineStyle(3, COLORS.GOLD_METAL, 1);
    bg.strokeRoundedRect(0, 0, WIDTH, HEIGHT, RADIUS);

    bg.lineStyle(1, COLORS.OVERLAY_BLACK, 0.5);
    bg.strokeRoundedRect(3, 3, WIDTH - 6, HEIGHT - 6, RADIUS - 2);

    const nameText = this.scene.add
      .text(0, 0, playerName, {
        fontFamily: THEME_CONFIG.FONTS.FAMILY_DISPLAY,
        fontSize: "16px",
        color: "#EAEAEA",
      })
      .setOrigin(0.0);

    const labelLP = this.scene.add
      .text(0, 0, "LP", {
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
      .text(0, 0, `${initialLP}`, textStyle)
      .setOrigin(0, 0.5)
      .setShadow(2, 2, "#000000", 4, true, false);

    const elementsToRender: Phaser.GameObjects.GameObject[] = [
      bg,
      nameText,
      labelLP,
      this.lpText,
    ];

    nameText.setPosition(110, 15);
    labelLP.setPosition(110, 60);
    this.lpText.setPosition(145, 60);

    if (side === "OPPONENT") {
      this.enemyAvatarImage = this.scene.add
        .image(55, HEIGHT / 2, "avatars_profile", "enemy_face_1")
        .setOrigin(0.5, 0.5)
        .setDisplaySize(105, 105);

      elementsToRender.push(this.enemyAvatarImage);
    } else {
      this.playerAvatarImage = this.scene.add
        .image(55, HEIGHT / 2, "avatars_profile", "player_face_1")
        .setOrigin(0.5, 0.5)
        .setDisplaySize(120, 120);

      elementsToRender.push(this.playerAvatarImage);
    }

    container.add(elementsToRender);

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
      duration: ANIMATIONS.DURATIONS.VERY_SLOW,
      ease: ANIMATIONS.EASING.SMOOTH,
      onUpdate: () => {
        this.lpText.setText(Math.floor(lpCounter.value).toString());
      },
      onComplete: () => {
        this.updateAvatarExpression(targetLP);
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
      duration: ANIMATIONS.DURATIONS.BASE,
      ease: ANIMATIONS.EASING.SMOOTH,
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
      duration: ANIMATIONS.DURATIONS.VERY_FAST,
      yoyo: true,
      ease: ANIMATIONS.EASING.SPRING,
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

  private updateAvatarExpression(currentLP: number): void {
    if (!this.enemyAvatarImage) return;

    const healthPercent = Math.max(0, currentLP / this.maxLP);

    if (healthPercent > 0.75) {
      this.enemyAvatarImage.setTexture("avatars_profile", "enemy_face_1");
    } else if (healthPercent > 0.4) {
      this.enemyAvatarImage.setTexture("avatars_profile", "enemy_face_5");
    } else if (healthPercent > 0.15) {
      this.enemyAvatarImage.setTexture("avatars_profile", "enemy_face_4");
    } else {
      this.enemyAvatarImage.setTexture("avatars_profile", "enemy_face_2");
    }
  }
}
