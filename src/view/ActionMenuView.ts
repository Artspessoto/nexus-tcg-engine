import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { THEME_CONFIG } from "../constants/ThemeConfig";
import { ToonButton } from "../objects/ToonButton";

export interface MenuOption {
  label: string;
  action: () => void;
  offsetX?: number;
  offsetY?: number;
  width?: number;
  icon?: string;
  isLeft?: boolean;
}

export class ActionMenuView {
  private scene: Phaser.Scene;
  private inputBlocker?: Phaser.GameObjects.Rectangle;
  private selectionButtons: ToonButton[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public renderMenu(
    x: number,
    y: number,
    options: MenuOption[],
    onCancel?: () => void,
  ) {
    const { SCREEN } = LAYOUT_CONFIG;
    this.clearMenu();

    this.inputBlocker = this.scene.add
      .rectangle(
        SCREEN.CENTER_X,
        SCREEN.CENTER_Y,
        SCREEN.WIDTH,
        SCREEN.HEIGHT,
        THEME_CONFIG.COLORS.OVERLAY_BLACK,
        0.4,
      )
      .setInteractive()
      .setDepth(THEME_CONFIG.DEPTHS.OVERLAY_PREVIEW - 1);

    //if clicks outside, cancel menu or shake btns
    this.inputBlocker.on("pointerdown", () => {
      if (onCancel) onCancel();
      this.clearMenu();
    });

    options.forEach((option) => {
      const btnX = x + (option.offsetX || 0);
      const btnY = y + (option.offsetY || -35);

      this.createMenuButton(btnX, btnY, option);
    });
  }

  private createMenuButton(x: number, y: number, option: MenuOption): void {
    const btn = new ToonButton(this.scene, {
      text: option.label.toUpperCase(),
      x,
      y,
      ...THEME_CONFIG.COMPONENTS.BUTTONS.PRIMARY,
      height: 40,
      width: option.width || 120,
      fontSize: "12px",
      icon: option.icon,
    }).setDepth(THEME_CONFIG.DEPTHS.OVERLAY_MENU);

    this.selectionButtons.push(btn);

    btn.on("pointerdown", () => {
      this.clearMenu();
      option.action();
    });
  }

  // private shakeButtons() {
  //   this.selectionButtons.forEach((btn) => {
  //     this.scene.tweens.add({
  //       targets: btn,
  //       x: btn.x + 5,
  //       duration: 50,
  //       yoyo: true,
  //       repeat: 3,
  //       ease: "Power1",
  //     });
  //   });
  // }

  public clearMenu() {
    if (this.inputBlocker) {
      this.inputBlocker.destroy();
      this.inputBlocker = undefined;
    }

    this.selectionButtons.forEach((btn) => btn.destroy());
    this.selectionButtons = [];
  }
}
