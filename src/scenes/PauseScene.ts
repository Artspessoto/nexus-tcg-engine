import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { THEME_CONFIG } from "../constants/ThemeConfig";
import { EventBus } from "../events/EventBus";
import { GameEvent } from "../events/GameEvents";
import { ToonButton } from "../objects/ToonButton";

export class PauseScene extends Phaser.Scene {
  constructor() {
    super("PauseScene");
  }

  create() {
    const { CENTER_X, CENTER_Y, WIDTH, HEIGHT } = LAYOUT_CONFIG.SCREEN;
    const { COLORS, COMPONENTS } = THEME_CONFIG;

    const overlay = this.add.rectangle(
      CENTER_X,
      CENTER_Y,
      WIDTH,
      HEIGHT,
      COLORS.OVERLAY_BLACK,
      0.7,
    );
    overlay.setInteractive();

    const panelWidth = 300;
    const panelHeight = 200;
    const cornerRadius = 16;

    const panel = this.add.graphics();
    panel.fillStyle(0x1a1a1a, 1);
    panel.lineStyle(4, COLORS.GOLD_METAL, 1);

    const panelX = CENTER_X - panelWidth / 2;
    const panelY = CENTER_Y - panelHeight / 2;

    panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, cornerRadius);
    panel.strokeRoundedRect(
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      cornerRadius,
    );

    this.add
      .text(CENTER_X, CENTER_Y - 40, "PAUSADO", {
        fontSize: "32px",
        fontFamily: "Arial Black",
        color: "#ddb63e",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const resumeButton = new ToonButton(this, {
      x: CENTER_X,
      y: CENTER_Y + 40,
      text: "RETOMAR",
      fontSize: "20px",
      textColor: "#ffffff",
      color: COMPONENTS.BUTTONS.RESUME.color,
      hoverColor: COMPONENTS.BUTTONS.RESUME.hoverColor,
      width: 200,
      height: 50,
    });

    resumeButton.on("pointerdown", () => {
      this.scene.resume("BattleScene");
      this.scene.stop();

      EventBus.emit(GameEvent.GAME_RESUMED, { message: "resume" });
    });
  }
}
