import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { THEME_CONFIG } from "../constants/ThemeConfig";
import type { Notice } from "../types/GameTypes";

export class NoticeBannerView {
  private scene: Phaser.Scene;

  private container!: Phaser.GameObjects.Container;
  private bannerText!: Phaser.GameObjects.Text;
  private bannerBg!: Phaser.GameObjects.Rectangle;
  private bannerTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.buildBanner();
  }

  public buildBanner() {
    const { SCREEN } = LAYOUT_CONFIG;
    const { COLORS, COMPONENTS, DEPTHS, FONTS } = THEME_CONFIG;

    this.container = this.scene.add
      .container(SCREEN.CENTER_X, SCREEN.CENTER_Y)
      .setVisible(false)
      .setDepth(DEPTHS.BANNERS);

    this.bannerBg = this.scene.add
      .rectangle(
        0,
        0,
        SCREEN.WIDTH,
        COMPONENTS.UI.PHASE_BANNER_HEIGHT,
        COLORS.OVERLAY_BLACK,
        0.85,
      )
      .setVisible(false)
      .setDepth(DEPTHS.BANNERS);

    this.bannerText = this.scene.add
      .text(0, 0, "", FONTS.STYLES.BANNER_TEXT)
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(DEPTHS.BANNERS + 1);

    this.container.add([this.bannerBg, this.bannerText]);
  }

  public showNotice(message: string, type: Notice) {
    if (!this.bannerBg || !this.bannerText) return;
    const { COLORS } = THEME_CONFIG;

    const colorMap: Record<Notice, number> = {
      PHASE: COLORS.NOTICE_PHASE,
      WARNING: COLORS.NOTICE_WARNING,
      TURN: COLORS.NOTICE_TURN,
      NEUTRAL: COLORS.NOTICE_NEUTRAL,
    };

    const targetColor = colorMap[type] || COLORS.NOTICE_PHASE;

    this.bannerBg.setStrokeStyle(4, targetColor);

    this.animateBanner(message, type);
  }

  private animateBanner(message: string, type: Notice) {
    const { SCREEN } = LAYOUT_CONFIG;
    const { ANIMATIONS } = THEME_CONFIG;

    this.scene.tweens.killTweensOf([
      this.bannerText,
      this.bannerBg,
      this.container,
    ]);

    if (this.bannerTimer) {
      this.bannerTimer.remove();
      this.bannerTimer = undefined;
    }

    this.container.setVisible(true);
    this.container.setAlpha(1);
    this.container.setX(SCREEN.CENTER_X);
    this.container.setY(SCREEN.CENTER_Y);

    this.bannerText
      .setText(message.toUpperCase())
      .setAlpha(1)
      .setVisible(true)
      .setScale(0.5)
      .setY(0)
      .setX(0);
    this.bannerBg.setY(0).setX(0).setAlpha(1).setVisible(true).setScale(1, 0);

    // start animation
    this.scene.tweens.add({
      targets: this.bannerBg,
      scaleY: 1,
      alpha: 1,
      duration: ANIMATIONS.DURATIONS.FAST,
      ease: ANIMATIONS.EASING.QUART_OUT,
    });

    // pop animation
    this.scene.tweens.add({
      targets: this.bannerText,
      scale: 1,
      duration: ANIMATIONS.DURATIONS.UI_POP,
      ease: ANIMATIONS.EASING.BOUNCE,
      onComplete: () => {
        //shake effect
        if (type === "WARNING") {
          this.scene.tweens.add({
            targets: [this.container],
            x: "+=3",
            yoyo: true,
            duration: 40,
            repeat: 3,
          });
        }
      },
    });

    this.bannerTimer = this.scene.time.delayedCall(600, () => {
      this.scene.tweens.add({
        targets: [this.bannerText, this.bannerBg],
        alpha: 0,
        y: "-=30",
        duration: ANIMATIONS.DURATIONS.PREVIEW,
        ease: ANIMATIONS.EASING.POWER_OUT,
        onComplete: () => {
          this.container.setVisible(false);
          this.bannerTimer = undefined;
        },
      });
    });
  }
}
