import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { THEME_CONFIG } from "../constants/ThemeConfig";
import { ToonButton } from "./ToonButton";

interface ModalOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export class DecisionModal extends Phaser.GameObjects.Container {
  constructor(
    scene: Phaser.Scene,
    options: ModalOptions,
    onResponse: (res: boolean) => void,
  ) {
    const { SCREEN } = LAYOUT_CONFIG;
    const { COLORS, FONTS, COMPONENTS } = THEME_CONFIG;

    super(scene, SCREEN.CENTER_X, SCREEN.CENTER_Y);

    const width = 450;
    const height = 260;

    // panel
    const panel = scene.add.graphics();
    panel.fillStyle(COLORS.PANEL_BG_DARK, 1);
    panel.lineStyle(4, COLORS.GOLD_DARK, 1);
    panel.fillRoundedRect(-(width / 2), -(height / 2), width, height, 15);
    panel.strokeRoundedRect(-(width / 2), -(height / 2), width, height, 15);

    const title = scene.add
      .text(0, -70, options.title.toUpperCase(), FONTS.STYLES.MODAL_TITLE)
      .setOrigin(0.5)
      .setTint(0xffd966);

    const msg = scene.add
      .text(0, -10, options.message, {
        ...FONTS.STYLES.MODAL_CONTENT,
        wordWrap: { width: width - 60 },
        align: "center",
      })
      .setOrigin(0.5);

    const btnCancel = new ToonButton(scene, {
      text: options.cancelText || "PASSAR",
      x: 105,
      y: 70,
      width: 150,
      height: 45,
      ...COMPONENTS.BUTTONS.SECONDARY,
    });

    const btnConfirm = new ToonButton(scene, {
      text: options.confirmText || "ATIVAR",
      x: -105,
      y: 70,
      width: 150,
      height: 45,
      ...COMPONENTS.BUTTONS.PRIMARY,
    });

    this.add([panel, title, msg, btnConfirm, btnCancel]);

    // animation and close
    const close = (result: boolean) => {
      scene.tweens.add({
        targets: this,
        scale: 0.8,
        alpha: 0,
        duration: 150,
        onComplete: () => {
          this.destroy();
          onResponse(result);
        },
      });
    };

    btnConfirm.on("pointerdown", () => close(true));
    btnCancel.on("pointerdown", () => close(false));

    this.setScale(0.7).setAlpha(0);
    scene.tweens.add({
      targets: this,
      scale: 1,
      alpha: 1,
      duration: 200,
      ease: "Back.out",
    });

    scene.add.existing(this);
  }
}
