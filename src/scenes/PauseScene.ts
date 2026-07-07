import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { EventBus } from "../events/EventBus";
import { GameEvent } from "../events/GameEvents";
import { ToonButton } from "../objects/ToonButton";

export class PauseScene extends Phaser.Scene {
  constructor() {
    super("PauseScene");
  }

  create() {
    const { CENTER_X, CENTER_Y, WIDTH, HEIGHT } = LAYOUT_CONFIG.SCREEN;

    const overlay = this.add.rectangle(
      CENTER_X,
      CENTER_Y,
      WIDTH,
      HEIGHT,
      0x000000,
      0.7,
    );
    overlay.setInteractive();

    const panelWidth = 300;
    const panelHeight = 200;

    const panel = this.add.rectangle(
      CENTER_X,
      CENTER_Y,
      panelWidth,
      panelHeight,
      0x1a1a1a,
      1,
    );

    panel.setStrokeStyle(4, 0xddb63e);

    this.add
      .text(CENTER_X, CENTER_Y - 40, "PAUSADO", {
        fontSize: "32px",
        fontFamily: "SuaFonteAqui",
        color: "#ddb63e",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const resumeButton = new ToonButton(this, {
      x: CENTER_X,
      y: CENTER_Y + 40,
      text: "RETOMAR",
      fontSize: "20px",
      fontFamily: "Arial Black",
      textColor: "#ffffff",
      color: 0x333333,
      hoverColor: 0x555555,
      width: 220,
      height: 50,
    });

    resumeButton.on("pointerdown", () => {
      this.scene.resume("BattleScene");
      this.scene.stop();

      EventBus.emit(GameEvent.GAME_RESUMED, { message: "resume" });
    });
  }
}
