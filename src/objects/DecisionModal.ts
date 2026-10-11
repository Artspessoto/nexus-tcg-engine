import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { THEME_CONFIG } from "../constants/ThemeConfig";
import { ToonButton } from "./ToonButton";

interface ModalOptions {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
}

export class DecisionModal extends Phaser.GameObjects.Container {
  private isCollapsed: boolean = false;
  private readonly expandedY: number;
  private readonly collapsedY: number;
  private toggleIcon!: Phaser.GameObjects.Text;
  private isClosing: boolean = false;

  constructor(
    scene: Phaser.Scene,
    options: ModalOptions,
    onResponse: (res: boolean) => void,
  ) {
    const { SCREEN } = LAYOUT_CONFIG;
    const { COLORS, FONTS, COMPONENTS, DEPTHS } = THEME_CONFIG;

    const bannerWidth = 580;
    const bannerHeight = 136;
    const halfW = bannerWidth / 2;
    const halfH = bannerHeight / 2;

    const posX = SCREEN.CENTER_X + 45;
    const targetY = SCREEN.HEIGHT - halfH - 8;

    super(scene, posX, targetY);

    this.expandedY = targetY;
    this.collapsedY = SCREEN.HEIGHT + halfH - 2;

    this.setDepth(DEPTHS?.OVERLAY_BANNER ?? 2000);

    //horizontal panel
    const panel = scene.add.graphics();
    panel.fillStyle(0x121418, 1); //0x141414
    panel.lineStyle(2.5, 0xddb63e, 1); //0xddb63e
    panel.fillRoundedRect(-halfW, -halfH, bannerWidth, bannerHeight, 12);
    panel.strokeRoundedRect(-halfW, -halfH, bannerWidth, bannerHeight, 12);

    const title = scene.add
      .text(0, -halfH + 24, options.title.toUpperCase(), {
        fontSize: "16px",
        fontFamily: FONTS.FAMILY_DISPLAY,
        fontStyle: "bold",
        color: "#ffd966",
      })
      .setOrigin(0.5);

    const msg = scene.add
      .text(0, -halfH + 50, options.message, {
        fontSize: "16px",
        fontFamily: FONTS.FAMILY_DISPLAY,
        color: "#e0e0e0",
        wordWrap: { width: bannerWidth - 60 },
        lineSpacing: 2,
      })
      .setOrigin(0.5);

    //btn actions (below text)
    const buttonY = halfH - 32;
    const btnWidth = 140;
    const btnHeight = 42;
    const btnSpacing = 20;

    const btnCancel = new ToonButton(scene, {
      text: options.cancelText,
      x: -(btnWidth / 2 + btnSpacing / 2),
      y: buttonY,
      width: btnWidth,
      height: btnHeight,
      fontSize: "15px",
      textColor: "#ffffff",
      color: 0x242424,
      hoverColor: 0x3d3d3d,
    });

    const btnConfirm = new ToonButton(scene, {
      text: options.confirmText,
      x: btnWidth / 2 + btnSpacing / 2,
      y: buttonY,
      width: btnWidth,
      height: btnHeight,
      fontSize: "15px",
      textColor: COMPONENTS.BUTTONS.PRIMARY?.textColor || "#000000",
      color: COMPONENTS.BUTTONS.PRIMARY?.color || 0xffcc00,
      hoverColor: COMPONENTS.BUTTONS.PRIMARY?.hoverColor || 0xffe066,
    });

    //minimize tab
    const tabWidth = 44;
    const tabHeight = 22;
    const tabX = halfW - 55;
    const tabY = -halfH - tabHeight + 2;

    const toggleTab = scene.add.graphics();
    toggleTab.fillStyle(0x121418, 0.98);
    toggleTab.lineStyle(2, COLORS.GOLD_METAL ?? 0xddb63e, 1);
    toggleTab.fillRoundedRect(tabX, tabY, tabWidth, tabHeight, {
      tl: 8,
      tr: 8,
      bl: 0,
      br: 0,
    });
    toggleTab.strokeRoundedRect(tabX, tabY, tabWidth, tabHeight, {
      tl: 8,
      tr: 8,
      bl: 0,
      br: 0,
    });

    this.toggleIcon = scene.add
      .text(tabX + tabWidth / 2, tabY + tabHeight / 2, "▼", {
        fontSize: "12px",
        fontFamily: FONTS.FAMILY_DISPLAY,
        color: "#ffd966",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const hitTab = scene.add
      .zone(tabX + tabWidth / 2, tabY + tabHeight / 2, tabWidth, tabHeight)
      .setInteractive({ useHandCursor: true });

    hitTab.on("pointerdown", () => this.toggleCollapse());

    this.add([
      panel,
      toggleTab,
      this.toggleIcon,
      hitTab,
      title,
      msg,
      btnConfirm,
      btnCancel,
    ]);

    // animation and close
    const close = (result: boolean) => {
      if (this.isClosing) return;
      this.isClosing = true;

      scene.tweens.add({
        targets: this,
        y: SCREEN.HEIGHT + bannerHeight + 20,
        alpha: 0,
        duration: 150,
        ease: "Power2",
        onComplete: () => {
          this.destroy();
          onResponse(result);
        },
      });
    };

    btnConfirm.on("pointerdown", () => close(true));
    btnCancel.on("pointerdown", () => close(false));

    //entry animation
    this.setY(SCREEN.HEIGHT + bannerHeight).setAlpha(0);
    scene.tweens.add({
      targets: this,
      y: this.expandedY,
      alpha: 1,
      duration: 220,
      ease: "Cubic.out",
    });

    scene.add.existing(this);
  }

  private toggleCollapse(): void {
    if (this.isClosing) return;

    this.isCollapsed = !this.isCollapsed;
    const destinationY = this.isCollapsed ? this.collapsedY : this.expandedY;
    this.toggleIcon.setText(this.isCollapsed ? "▲" : "▼");

    this.scene.tweens.add({
      targets: this,
      y: destinationY,
      duration: 200,
      ease: "Cubic.easeOut",
    });
  }
}
