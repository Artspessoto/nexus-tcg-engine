import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { THEME_CONFIG } from "../constants/ThemeConfig";

export interface VersusConfig {
  playerName: string;
  difficulty: string;
  playerDeckIds: string[];
}

export class VersusScene extends Phaser.Scene {
  private playerName: string = "";
  private difficulty: string = "";
  private playerDeckIds: string[] = [];

  constructor() {
    super("VersusScene");
  }

  init(config: VersusConfig) {
    this.playerName = config.playerName;
    this.difficulty = config.difficulty;
    this.playerDeckIds = config.playerDeckIds;
  }

  create() {
    const { SCREEN } = LAYOUT_CONFIG;
    const { FONTS, COLORS } = THEME_CONFIG;

    const bg = this.add.image(
      SCREEN.CENTER_X,
      SCREEN.CENTER_Y,
      "versus_background",
    );
    bg.setDisplaySize(SCREEN.WIDTH, 900);

    this.add.rectangle(
      SCREEN.CENTER_X,
      SCREEN.CENTER_Y,
      SCREEN.WIDTH,
      SCREEN.HEIGHT,
      COLORS.OVERLAY_BLACK,
      0.5,
    );

    const bannerHeight = 180;
    const bannerW = SCREEN.WIDTH / 2 + 40;
    const bannerY = SCREEN.CENTER_Y - bannerHeight / 2;

    const bgBorder = this.add
      .rectangle(
        SCREEN.CENTER_X,
        SCREEN.CENTER_Y,
        SCREEN.WIDTH,
        bannerHeight + 12,
        0x000000,
      )
      .setScale(0, 1);

    //speed lines texture
    const gfx = this.make.graphics({ x: 0, y: 0 }, false);
    gfx.fillStyle(0xffffff, 0.15); //white lines with 15% of opacity
    for (let i = 0; i < 20; i++) {
      const w = Phaser.Math.Between(50, 300);
      const h = Phaser.Math.Between(2, 6);
      const y = Phaser.Math.Between(0, bannerHeight);
      gfx.fillRect(Phaser.Math.Between(0, 200), y, w, h);
    }
    gfx.generateTexture("speed_lines", 500, bannerHeight);
    gfx.destroy(); //clears the graphics from memory after generating the texture

    const zigzagDepth = 40;
    const segments = 6;
    const segmentHeight = bannerHeight / segments;

    const leftPoints = [0, 0];
    for (let i = 0; i <= segments; i++) {
      const x = i % 2 === 0 ? bannerW : bannerW - zigzagDepth;
      const y = i * segmentHeight;
      leftPoints.push(x, y);
    }
    leftPoints.push(0, bannerHeight);

    //banners and masks
    //NPC (right) - right rectangle
    const rightPoints = [
      0,
      0,
      bannerW,
      0,
      bannerW,
      bannerHeight,
      0,
      bannerHeight,
    ];
    const npcBanner = this.add
      .polygon(SCREEN.WIDTH + bannerW, bannerY, rightPoints)
      .setFillStyle(0x1a1a1a, 0.85)
      .setOrigin(0, 0);

    const npcSpeedLines = this.add
      .tileSprite(
        SCREEN.WIDTH + bannerW,
        bannerY,
        bannerW,
        bannerHeight,
        "speed_lines",
      )
      .setOrigin(0, 0)
      .setAlpha(0); //stay invisible until the animation ends

    //player (left) - serrated rectangle and sits on top of npc rectangle
    const playerBanner = this.add
      .polygon(-bannerW, bannerY, leftPoints)
      .setFillStyle(0xcfb35d, 0.95)
      .setStrokeStyle(6, 0x000000)
      .setOrigin(0, 0);

    const playerSpeedLines = this.add
      .tileSprite(-bannerW, bannerY, bannerW, bannerHeight, "speed_lines")
      .setOrigin(0, 0)
      .setAlpha(0);

    //apply masks for prevents speed lines dont bleed outside banners
    const playerMask = playerBanner.createGeometryMask();
    playerSpeedLines.setMask(playerMask);

    const npcMask = npcBanner.createGeometryMask();
    npcSpeedLines.setMask(npcMask);

    //avatar and texts
    const playerAvatar = this.add
      .circle(-SCREEN.WIDTH / 4, SCREEN.CENTER_Y, 70, 0xcfb35d)
      .setStrokeStyle(4, 0xffffff);

    const npcAvatar = this.add
      .circle(SCREEN.WIDTH + SCREEN.WIDTH / 4, SCREEN.CENTER_Y, 70, 0x1a1a1a)
      .setStrokeStyle(4, 0xffffff);

    const textY = SCREEN.CENTER_Y + bannerHeight / 2 + 30; //closer to banner

    const playerText = this.add
      .text(-SCREEN.WIDTH / 4, textY, this.playerName, {
        fontFamily: FONTS.FAMILY_DISPLAY,
        fontSize: "28px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    const npcText = this.add
      .text(SCREEN.WIDTH + SCREEN.WIDTH / 4, textY, "NPC 1", {
        fontFamily: FONTS.FAMILY_DISPLAY,
        fontSize: "28px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    const vsText = this.add
      .text(SCREEN.CENTER_X, SCREEN.CENTER_Y, "VS", {
        fontFamily: FONTS.FAMILY_DISPLAY,
        fontSize: "100px",
        color: "#ff8800",
        stroke: "#ffffff",
        strokeThickness: 16,
        fontStyle: "bold italic",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setScale(0)
      .setDepth(10);

    //speed lines animation
    this.tweens.add({
      targets: playerSpeedLines,
      tilePositionX: -500, //move to left
      duration: 1500,
      repeat: -1, //infinity loop
    });

    this.tweens.add({
      targets: npcSpeedLines,
      tilePositionX: 500, //move to right
      duration: 1500,
      repeat: -1, //loop
    });

    //sync avatar, banners and speed lines
    this.tweens.add({
      targets: bgBorder,
      scaleX: 1,
      duration: 300,
      ease: "Power2",
      onComplete: () => {
        //player slide in
        this.tweens.add({
          targets: [playerBanner, playerSpeedLines],
          x: 0,
          duration: 400,
          ease: "Power3",
        });
        this.tweens.add({
          targets: [playerText, playerAvatar],
          x: SCREEN.WIDTH / 4,
          duration: 400,
          ease: "Power3",
        });

        //NPC slide in
        this.tweens.add({
          targets: [npcBanner, npcSpeedLines],
          x: SCREEN.WIDTH - bannerW,
          duration: 400,
          ease: "Power3",
        });
        this.tweens.add({
          targets: [npcText, npcAvatar],
          x: SCREEN.WIDTH * 0.75,
          duration: 400,
          ease: "Power3",
          onComplete: () => {
            //show speed lines and shock "VS" on center
            playerSpeedLines.setAlpha(1);
            npcSpeedLines.setAlpha(1);

            this.tweens.add({
              targets: vsText,
              scale: 1,
              duration: 500,
              ease: "Bounce.easeOut",
              onComplete: () => {
                this.callNextScene();
              },
            });
          },
        });
      },
    });
  }

  private callNextScene(): void {
    // this.cameras.main.shake(200, 0.015);
    this.time.delayedCall(1600, () => {
      this.cameras.main.zoomTo(3, 600, "Sine.easeIn");
      this.cameras.main.fadeOut(800, 255, 255, 255);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.start("BattleScene", {
          playerName: this.playerName,
          difficulty: this.difficulty,
          playerDeckIds: this.playerDeckIds,
          retriesLeft: 1,
        });
      });
    });
  }
}
