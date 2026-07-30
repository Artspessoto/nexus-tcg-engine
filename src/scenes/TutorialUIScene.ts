import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { THEME_CONFIG } from "../constants/ThemeConfig";
import { TRANSLATIONS } from "../constants/Translations";
import { TUTORIAL_STEPS } from "../constants/TutorialScript";
import {
  TutorialEvent,
  type CameraFocusPayload,
} from "../events/TutorialEvents";
import { LanguageManager } from "../managers/language/LanguageManager";
import { ToonButton } from "../objects/ToonButton";
import type { TutorialTranslations } from "../types/GameTypes";

export class TutorialUIScene extends Phaser.Scene {
  private currentStepIndex: number = 0;
  private translationText!: TutorialTranslations;

  private panelGraphics!: Phaser.GameObjects.Graphics;
  private dialogContainer!: Phaser.GameObjects.Container;
  private dialogText!: Phaser.GameObjects.Text;

  private nextBtn!: ToonButton;
  private tooltipHintText!: Phaser.GameObjects.Text;
  private clickZone!: Phaser.GameObjects.Zone;

  constructor() {
    super("TutorialUIScene");
  }

  init() {
    this.currentStepIndex = 0;
  }

  create() {
    const lang = LanguageManager.getInstance().currentLang;
    this.translationText = TRANSLATIONS[lang].tutorial;

    this.scene.launch("TutorialBoardScene");
    this.scene.sendToBack("TutorialBoardScene");

    this.buildBaseUI();
    this.showCurrentStep();
  }

  private buildBaseUI() {
    const { DEPTHS, FONTS } = THEME_CONFIG;
    this.dialogContainer = this.add.container(0, 0);
    this.dialogContainer.setDepth(DEPTHS.OVERLAY_ACTIVATION);

    this.panelGraphics = this.add.graphics();

    this.dialogText = this.add.text(0, 0, "", {
      fontFamily: FONTS.FAMILY_DISPLAY,
      fontSize: "24px",
    });

    //advance btn (relative to container)
    this.nextBtn = new ToonButton(this, {
      x: 0,
      y: 0,
      text: this.translationText.next_btn,
      width: 150,
      height: 45,
      fontSize: "20px",
    }).on("pointerdown", () => this.advanceStep());

    //return to menu scene
    new ToonButton(this, {
      x: 1130,
      y: 30,
      text: this.translationText.skip_btn,
      width: 100,
      height: 40,
      fontSize: "16px",
      textColor: "#fff",
      color: 0x1a1a1a,
      hoverColor: 0x333333,
    }).on("pointerdown", () => this.executeSkip());

    this.tooltipHintText = this.add
      .text(0, 0, "➔", {
        fontFamily: FONTS.FAMILY_DISPLAY,
        fontSize: "20px",
        color: THEME_CONFIG.COLORS.GOLD_GLOW,
      })
      .setOrigin(1, 1); //aligned to the bottom-right corner

    //invisble click zone to advance in TOOLTIP mode
    this.clickZone = this.add
      .zone(0, 0, 1, 1)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        const step = TUTORIAL_STEPS[this.currentStepIndex];
        if (step.layoutMode === "TOOLTIP") this.advanceStep();
      });

    this.input.keyboard?.on("keydown-ENTER", () => {
      this.advanceStep();
    });
    this.input.keyboard?.on("keydown-SPACE", () => {
      this.advanceStep();
    });
    this.input.keyboard?.on("keydown-ESC", () => {
      this.executeSkip();
    });

    this.dialogContainer.add([
      this.panelGraphics,
      this.dialogText,
      this.nextBtn,
      this.tooltipHintText,
      this.clickZone,
    ]);
  }

  private showCurrentStep() {
    const step = TUTORIAL_STEPS[this.currentStepIndex];
    const { ANIMATIONS } = THEME_CONFIG;

    const translatedText =
      this.translationText[step.textKey as keyof TutorialTranslations];
    this.dialogText.setText(translatedText);

    const mode = step.layoutMode || "NARRATIVE";

    let targetX: number = 0;
    let targetY: number = 0;

    if (mode == "NARRATIVE") {
      const coords = this.applyNarrativeLayout();
      targetX = coords.x;
      targetY = coords.y;
      this.scene
        .get("TutorialBoardScene")
        .events.emit(TutorialEvent.RESET_CAMERA);
    } else {
      const coords = this.applyTooltipLayout(step.focusTarget);
      targetX = coords.x;
      targetY = coords.y;
      this.scene
        .get("TutorialBoardScene")
        .events.emit(TutorialEvent.FOCUS_CAMERA, step.focusTarget);
    }

    this.tweens.killTweensOf(this.dialogContainer);

    this.dialogContainer.setY(targetY);

    this.dialogContainer.setX(targetX - 50);
    this.dialogContainer.setAlpha(0);

    this.tweens.add({
      targets: this.dialogContainer,
      x: targetX,
      alpha: 1,
      duration: ANIMATIONS.DURATIONS.NORMAL,
      ease: ANIMATIONS.EASING.QUART_OUT,
    });
  }

  private applyNarrativeLayout(): { x: number; y: number } {
    const { SCREEN } = LAYOUT_CONFIG;

    //box dimensions
    const boxWidth = SCREEN.WIDTH - 240;
    const boxHeight = 130;

    //text and visible config
    this.dialogText.setOrigin(0, 0.5);
    this.dialogText.setStyle({
      fontSize: "20px",
      wordWrap: { width: boxWidth - 220 },
      lineSpacing: 8,
      align: "left",
    });
    this.dialogText.setPosition(40, boxHeight / 2);

    const btnWidth = 100;
    const btnHeight = 45;

    this.nextBtn.setVisible(true);
    this.nextBtn.setPosition(
      boxWidth - btnWidth - 10,
      boxHeight - btnHeight,
    );

    this.tooltipHintText.setVisible(false);
    this.clickZone.disableInteractive();

    this.drawPanelBackground(boxWidth, boxHeight);

    return {
      x: (SCREEN.WIDTH - boxWidth) / 2,
      y: SCREEN.HEIGHT - boxHeight - 40,
    };
  }

  private applyTooltipLayout(focusTarget?: CameraFocusPayload): {
    x: number;
    y: number;
  } {
    const { SCREEN } = LAYOUT_CONFIG;

    const boxWidth = 320;

    this.dialogText.setOrigin(0, 0);
    this.dialogText.setStyle({
      fontSize: "16px",
      wordWrap: { width: boxWidth - 40 },
      lineSpacing: 6,
    });
    this.dialogText.setPosition(20, 20);

    //dynamic height based on step text
    const textHeight = this.dialogText.height;
    const boxHeight = Math.max(100, textHeight + 60);

    //hidden the button and show the dialog text with click zone btn
    this.nextBtn.setVisible(false);
    this.tooltipHintText.setVisible(true);
    this.tooltipHintText.setPosition(boxWidth - 20, boxHeight - 15);

    this.clickZone.setSize(boxWidth, boxHeight);
    this.clickZone.setInteractive({ useHandCursor: true });

    this.drawPanelBackground(boxWidth, boxHeight);

    //position logic by target
    let targetX: number;
    let targetY: number;

    if (!focusTarget) {
      targetX = SCREEN.CENTER_X - boxWidth / 2;
      targetY = SCREEN.CENTER_Y - boxHeight / 2;
    } else {
      //pos on the side opposite the focus
      if (focusTarget.x < SCREEN.CENTER_X) {
        targetX = focusTarget.x + 200;
      } else {
        targetX = focusTarget.x - boxWidth - 80;
      }
      //vertically center with the target, snapping to screen edges
      const desiredY = focusTarget.y - boxHeight / 2;
      targetY = Phaser.Math.Clamp(desiredY, 30, SCREEN.HEIGHT - boxHeight - 30);
    }

    return { x: targetX, y: targetY };
  }

  private drawPanelBackground(width: number, height: number): void {
    const { COLORS } = THEME_CONFIG;

    //need clear to solve button bug
    this.panelGraphics.clear();

    this.panelGraphics.fillStyle(COLORS.PANEL_BG, 1);
    this.panelGraphics.lineStyle(
      4,
      Phaser.Display.Color.HexStringToColor(COLORS.GOLD_GLOW).color,
      1,
    );

    this.panelGraphics.fillRoundedRect(0, 0, width, height, 16);
    this.panelGraphics.strokeRoundedRect(0, 0, width, height, 16);
  }

  private advanceStep(): void {
    if (this.currentStepIndex < TUTORIAL_STEPS.length - 1) {
      this.currentStepIndex++;
      this.showCurrentStep();
      this.scene
        .get("TutorialBoardScene")
        .events.emit(TutorialEvent.ADVANCE_DIALOG);
    }
  }

  private executeSkip(): void {
    this.cameras.main.fadeOut(500, 0, 0, 0);

    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.stop("TutorialBoardScene");
      this.scene.stop("TutorialUIScene");
      this.scene.start("MenuScene");
    });
  }
}
