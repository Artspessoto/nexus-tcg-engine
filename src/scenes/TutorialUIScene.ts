import { LAYOUT_CONFIG } from "../constants/LayoutConfig";
import { THEME_CONFIG } from "../constants/ThemeConfig";
import { TRANSLATIONS } from "../constants/Translations";
import { TUTORIAL_STEPS } from "../constants/TutorialScript";
import {
  TutorialEvent,
  type CameraFocusPayload,
  type ForceUIStepPayload,
} from "../events/TutorialEvents";
import { LanguageManager } from "../managers/language/LanguageManager";
import { ToonButton } from "../objects/ToonButton";
import type { TutorialTranslations } from "../types/GameTypes";
import type { LayoutTargetCategory } from "../types/TutorialType";

export class TutorialUIScene extends Phaser.Scene {
  private currentStepIndex: number = 0;
  private translationText!: TutorialTranslations;

  private panelGraphics!: Phaser.GameObjects.Graphics;
  private dialogContainer!: Phaser.GameObjects.Container;
  private dialogText!: Phaser.GameObjects.Text;

  private nextBtn!: ToonButton;
  private tooltipHintText!: Phaser.GameObjects.Text;
  private clickZone!: Phaser.GameObjects.Zone;

  private layoutHandlers: Record<
    LayoutTargetCategory,
    (
      target: CameraFocusPayload | undefined,
      boxWidth: number,
      boxHeight: number,
    ) => { x: number; y: number }
  >;

  constructor() {
    super("TutorialUIScene");

    const { SCREEN, BATTLE } = LAYOUT_CONFIG;

    this.layoutHandlers = {
      DEFAULT: (_target, boxWidth, boxHeight) => ({
        x: SCREEN.CENTER_X - boxWidth / 2,
        y: SCREEN.CENTER_Y - boxHeight / 2,
      }),
      FIELD: (target, boxWidth, boxHeight) => {
        if (!target)
          return this.layoutHandlers.DEFAULT(target, boxWidth, boxHeight);

        //vertically center with the target, snapping to screen edges
        const desiredY = target.y - boxHeight / 2;
        return {
          x: target.x + 20,
          y: Phaser.Math.Clamp(desiredY, 30, SCREEN.HEIGHT - boxHeight - 30),
        };
      },
      HAND: (target, boxWidth, boxHeight) => {
        if (!target)
          return this.layoutHandlers.DEFAULT(target, boxWidth, boxHeight);

        const desiredX = target.x - boxWidth / 2;
        const desiredY = target.y - boxHeight / 2;

        return {
          x: Phaser.Math.Clamp(desiredX, 20, SCREEN.WIDTH - boxWidth - 20),
          y: Phaser.Math.Clamp(desiredY, 30, SCREEN.HEIGHT - boxHeight - 30),
        };
      },
      BUTTON: (target, boxWidth, boxHeight) => {
        if (!target)
          return this.layoutHandlers.DEFAULT(target, boxWidth, boxHeight);

        const btnWidth = BATTLE.PHASE_BUTTON.width;
        const btnHalfWidth = btnWidth / 2;

        const targetX =
          target.x > SCREEN.CENTER_X
            ? target.x - btnHalfWidth - boxWidth - 20
            : target.x + btnHalfWidth + 20;

        const desiredY = target.y - boxHeight / 2;

        return {
          x: targetX,
          y: Phaser.Math.Clamp(desiredY, 30, SCREEN.HEIGHT - boxHeight - 30),
        };
      },
      UI: (target, boxWidth, boxHeight) => {
        if (!target)
          return this.layoutHandlers.DEFAULT(target, boxWidth, boxHeight);

        //pos on the side opposite the focus
        const targetX =
          target.x < SCREEN.CENTER_X
            ? target.x + 200
            : target.x - boxWidth - 80;

        const desiredY = target.y - boxHeight / 2;
        return {
          x: targetX,
          y: Phaser.Math.Clamp(desiredY, 30, SCREEN.HEIGHT - boxHeight - 30),
        };
      },
    };
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

    this.events.on(
      TutorialEvent.FORCE_UI_STEP,
      (payload: ForceUIStepPayload) => {
        const stepIndex = TUTORIAL_STEPS.findIndex(
          (step) => step.textKey == payload.targetTextKey,
        );

        if (stepIndex !== -1) {
          this.currentStepIndex = stepIndex;
          this.showCurrentStep();

          const currentStep = TUTORIAL_STEPS[this.currentStepIndex];
          this.scene
            .get("TutorialBoardScene")
            .events.emit(TutorialEvent.ADVANCE_DIALOG, {
              textKey: currentStep.textKey,
              targetId: currentStep.focusTarget?.id,
            });
        }
      },
    );
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
      x: 1110,
      y: 40,
      text: this.translationText.skip_btn,
      width: 150,
      height: 45,
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

  private showCurrentStep(): void {
    const step = TUTORIAL_STEPS[this.currentStepIndex];
    const isLastStep = this.currentStepIndex == TUTORIAL_STEPS.length - 1;
    const { ANIMATIONS } = THEME_CONFIG;

    const translatedText =
      this.translationText[step.textKey as keyof TutorialTranslations];
    this.dialogText.setText(translatedText);

    const mode = step.layoutMode || "NARRATIVE";

    let targetX: number = 0;
    let targetY: number = 0;

    if (mode == "NARRATIVE") {
      const coords = this.applyNarrativeLayout();
      if (isLastStep) this.nextBtn.setText(this.translationText.finish_btn);
      targetX = coords.x;
      targetY = coords.y;
    } else {
      const coords = this.applyTooltipLayout(step.focusTarget);
      targetX = coords.x;
      targetY = coords.y;
    }

    //prevent UI interference on board camera
    if (!step.skipCameraSync) {
      if (mode == "NARRATIVE") {
        this.scene
          .get("TutorialBoardScene")
          .events.emit(TutorialEvent.RESET_CAMERA);
      } else {
        this.scene
          .get("TutorialBoardScene")
          .events.emit(TutorialEvent.FOCUS_CAMERA, step.focusTarget);
      }
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

  private getLayoutCategory(id?: string): LayoutTargetCategory {
    if (!id) return "DEFAULT";
    if (id.includes("FIELD")) return "FIELD";
    if (id.includes("HAND")) return "HAND";
    if (id.includes("BUTTON")) return "BUTTON";
    return "UI"; //for lp, mana, deck
  }

  private applyNarrativeLayout(): { x: number; y: number } {
    const { SCREEN } = LAYOUT_CONFIG;
    const step = TUTORIAL_STEPS[this.currentStepIndex];

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

    //disable and set invisible (nextbtn) to lock dialog for user action
    if (step.requireAction) {
      this.nextBtn.setVisible(false);
    } else {
      this.nextBtn.setVisible(true);
      this.nextBtn.setPosition(boxWidth - btnWidth - 10, boxHeight - btnHeight);
    }

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
    const boxWidth = 320;
    const step = TUTORIAL_STEPS[this.currentStepIndex];

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

    //requireAction blocks click zone (lock dialog for user action)
    if (step.requireAction) {
      this.tooltipHintText.setVisible(false);
      this.clickZone.disableInteractive(false);
    } else {
      this.tooltipHintText.setVisible(true);
      this.tooltipHintText.setPosition(boxWidth - 20, boxHeight - 15);

      this.clickZone.setSize(boxWidth, boxHeight);
      this.clickZone.setInteractive({ useHandCursor: true });
    }

    this.drawPanelBackground(boxWidth, boxHeight);

    const category = this.getLayoutCategory(focusTarget?.id[0]);
    const { x, y } = this.layoutHandlers[category](
      focusTarget,
      boxWidth,
      boxHeight,
    );

    return { x, y };
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
    const currentStep = TUTORIAL_STEPS[this.currentStepIndex];

    if (currentStep.requireAction) return; //block advance dialog click

    if (currentStep.textKey === "step_18") {
      this.scene
        .get("TutorialBoardScene")
        .events.emit(TutorialEvent.TUTORIAL_COMPLETE);
      return;
    }

    if (this.currentStepIndex < TUTORIAL_STEPS.length - 1) {
      this.currentStepIndex++;
      this.showCurrentStep();

      const nextStep = TUTORIAL_STEPS[this.currentStepIndex];

      this.scene
        .get("TutorialBoardScene")
        .events.emit(TutorialEvent.ADVANCE_DIALOG, {
          textKey: nextStep.textKey,
          targetId: nextStep.focusTarget?.id,
        });
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
