/**
 * Face Calibration System for FaceRoyale
 * Calibrates expression detection to individual user's facial range of motion
 */

import type { ExpressionState, CalibrationData, CalibrationStep } from '../types';

const CALIBRATION_STEPS: CalibrationStep[] = [
  {
    id: 'neutral',
    instruction: 'Relax your face completely',
    duration: 2000,
    expression: 'neutral',
  },
  {
    id: 'browRaise',
    instruction: 'Raise your eyebrows high',
    duration: 2000,
    expression: 'browRaise',
  },
  {
    id: 'browFurrow',
    instruction: 'Furrow your brows (angry face)',
    duration: 2000,
    expression: 'browFurrow',
  },
  {
    id: 'mouthOpen',
    instruction: 'Open your mouth wide',
    duration: 2000,
    expression: 'mouthOpen',
  },
  {
    id: 'smile',
    instruction: 'Give a big smile',
    duration: 2000,
    expression: 'smile',
  },
  {
    id: 'cheekPuff',
    instruction: 'Puff your cheeks out',
    duration: 2000,
    expression: 'cheekPuff',
  },
];

export class FaceCalibrator {
  private isRunning = false;
  private currentStepIndex = 0;

  getSteps(): CalibrationStep[] {
    return CALIBRATION_STEPS;
  }

  getCurrentStep(): CalibrationStep | null {
    if (this.currentStepIndex >= CALIBRATION_STEPS.length) return null;
    return CALIBRATION_STEPS[this.currentStepIndex];
  }

  isCalibrating(): boolean {
    return this.isRunning;
  }

  async run(
    getSample: () => ExpressionState | null,
    onStep: (step: CalibrationStep, progress: number) => void,
    onComplete?: (data: CalibrationData) => void
  ): Promise<CalibrationData> {
    this.isRunning = true;
    this.currentStepIndex = 0;

    const samples: Record<string, number[]> = {};

    for (let i = 0; i < CALIBRATION_STEPS.length; i++) {
      const step = CALIBRATION_STEPS[i];
      this.currentStepIndex = i;
      samples[step.id] = [];

      const startTime = Date.now();

      while (Date.now() - startTime < step.duration) {
        const progress = (Date.now() - startTime) / step.duration;
        onStep(step, progress);

        const sample = getSample();
        if (sample && step.expression in sample) {
          const value = sample[step.expression] as number;
          samples[step.id].push(value);
        }

        await sleep(33); // ~30fps
      }
    }

    this.isRunning = false;
    const calibration = this.calculateCalibration(samples);

    if (onComplete) {
      onComplete(calibration);
    }

    return calibration;
  }

  cancel(): void {
    this.isRunning = false;
    this.currentStepIndex = 0;
  }

  private calculateCalibration(
    samples: Record<string, number[]>
  ): CalibrationData {
    return {
      browBaseline: percentile(samples.neutral || [], 50) || 0.08,
      browMaxRaise: percentile(samples.browRaise || [], 90) || 0.15,
      browFurrowBaseline: percentile(samples.neutral || [], 50) || 0.08,
      browFurrowMin: percentile(samples.browFurrow || [], 10) || 0.04,
      mouthClosed: percentile(samples.neutral || [], 50) || 0.01,
      mouthMaxOpen: percentile(samples.mouthOpen || [], 90) || 0.12,
      smileBaseline: percentile(samples.neutral || [], 50) || 0,
      smileMax: percentile(samples.smile || [], 90) || 0.05,
      cheekBaseline: percentile(samples.neutral || [], 50) || 0.15,
      cheekMaxPuff: percentile(samples.cheekPuff || [], 90) || 0.22,
      timestamp: Date.now(),
    };
  }
}

// Quick calibration (fewer steps, for returning users)
export class QuickCalibrator {
  async run(
    getSample: () => ExpressionState | null,
    onProgress: (progress: number) => void
  ): Promise<CalibrationData> {
    const samples: ExpressionState[] = [];
    const duration = 3000; // 3 seconds total
    const startTime = Date.now();

    onProgress(0);

    while (Date.now() - startTime < duration) {
      const progress = (Date.now() - startTime) / duration;
      onProgress(progress);

      const sample = getSample();
      if (sample) {
        samples.push(sample);
      }

      await sleep(33);
    }

    onProgress(1);

    // Calculate calibration from all samples
    return {
      browBaseline: percentile(samples.map((s) => s.browRaise), 20) || 0.08,
      browMaxRaise: percentile(samples.map((s) => s.browRaise), 95) || 0.15,
      browFurrowBaseline:
        percentile(samples.map((s) => s.browFurrow), 20) || 0.08,
      browFurrowMin: percentile(samples.map((s) => s.browFurrow), 5) || 0.04,
      mouthClosed: percentile(samples.map((s) => s.mouthOpen), 10) || 0.01,
      mouthMaxOpen: percentile(samples.map((s) => s.mouthOpen), 95) || 0.12,
      smileBaseline: percentile(samples.map((s) => s.smile), 20) || 0,
      smileMax: percentile(samples.map((s) => s.smile), 95) || 0.05,
      cheekBaseline: percentile(samples.map((s) => s.cheekPuff), 20) || 0.15,
      cheekMaxPuff: percentile(samples.map((s) => s.cheekPuff), 95) || 0.22,
      timestamp: Date.now(),
    };
  }
}

// Utility functions
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * sorted.length);
  return sorted[Math.min(idx, sorted.length - 1)] ?? 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
