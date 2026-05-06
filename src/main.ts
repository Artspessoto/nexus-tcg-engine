import Phaser from "phaser";
import { MenuScene } from "./scenes/MenuScene";
import { NameScene } from "./scenes/NameScene";
import "./styles/ui.css";
import { GuideScene } from "./scenes/GuideScene";
import { BattleScene } from "./scenes/BattleScene";
import { GraveyardScene } from "./scenes/GraveyardScene";
import { LAYOUT_CONFIG } from "./constants/LayoutConfig";
import { DeckPreviewScene } from "./scenes/DeckPreviewScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: LAYOUT_CONFIG.SCREEN.WIDTH,
  height: LAYOUT_CONFIG.SCREEN.HEIGHT,
  parent: "game-container",
  backgroundColor: "#1a1a1a",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: {
      width: LAYOUT_CONFIG.SCREEN.WIDTH,
      height: LAYOUT_CONFIG.SCREEN.HEIGHT,
    },
    max: {
      width: LAYOUT_CONFIG.SCREEN.MAX_WIDTH,
      height: LAYOUT_CONFIG.SCREEN.MAX_HEIGHT,
    },
  },
  render: {
    antialias: true,
    roundPixels: true,
  },
  dom: {
    createContainer: true,
  },
  scene: [
    MenuScene,
    NameScene,
    GuideScene,
    BattleScene,
    GraveyardScene,
    DeckPreviewScene,
  ],
};

new Phaser.Game(config);
