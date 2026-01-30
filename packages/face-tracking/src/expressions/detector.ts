/**
 * Expression Detector for FaceRoyale
 * Converts MediaPipe landmarks to expression values for ability triggers
 */

import type {
  FaceLandmark,
  ExpressionState,
  CalibrationData,
  FaceTrackingConfig,
} from '../types';

// MediaPipe 468-point landmark indices
const LANDMARKS = {
  LEFT_EYEBROW: [70, 63, 105, 66, 107],
  RIGHT_EYEBROW: [336, 296, 334, 293, 300],
  LEFT_EYE: [33, 160, 158, 133, 153, 144],
  RIGHT_EYE: [362, 385, 387, 263, 373, 380],
  UPPER_LIP: [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291],
  LOWER_LIP: [146, 91, 181, 84, 17, 314, 405, 321, 375, 291],
  LEFT_CHEEK: [116, 117, 118, 119, 120],
  RIGHT_CHEEK: [345, 346, 347, 348, 349],
  NOSE_TIP: [1],
  CHIN: [152],
};

// Default calibration values (will be overwritten by user calibration)
const DEFAULT_CALIBRATION: CalibrationData = {
  browBaseline: 0.08,
  browMaxRaise: 0.15,
  browFurrowBaseline: 0.08,
  browFurrowMin: 0.04,
  mouthClosed: 0.01,
  mouthMaxOpen: 0.12,
  smileBaseline: 0,
  smileMax: 0.05,
  cheekBaseline: 0.15,
  cheekMaxPuff: 0.22,
  timestamp: 0,
};

export class ExpressionDetector {
  private calibration: CalibrationData;
  private history: ExpressionState[] = [];
  private config: FaceTrackingConfig;

  constructor(config: FaceTrackingConfig) {
    this.config = config;
    this.calibration = DEFAULT_CALIBRATION;
  }

  setCalibration(data: CalibrationData): void {
    this.calibration = data;
  }

  getCalibration(): CalibrationData {
    return this.calibration;
  }

  detect(landmarks: FaceLandmark[]): ExpressionState {
    if (landmarks.length < 468) {
      return this.getEmptyState();
    }

    const raw = this.calculateRaw(landmarks);
    const calibrated = this.applyCalibration(raw);
    const smoothed = this.applySmoothing(calibrated);

    this.history.push(smoothed);
    if (this.history.length > 10) this.history.shift();

    return smoothed;
  }

  private calculateRaw(landmarks: FaceLandmark[]): ExpressionState {
    return {
      browRaise: this.calcBrowRaise(landmarks),
      browFurrow: this.calcBrowFurrow(landmarks),
      mouthOpen: this.calcMouthOpen(landmarks),
      smile: this.calcSmile(landmarks),
      cheekPuff: this.calcCheekPuff(landmarks),
      leftBlink: this.calcBlink(landmarks, 'left'),
      rightBlink: this.calcBlink(landmarks, 'right'),
      neutral: this.calcNeutral(landmarks),
    };
  }

  private calcBrowRaise(lm: FaceLandmark[]): number {
    const browY = avg(LANDMARKS.LEFT_EYEBROW.map((i) => lm[i].y));
    const eyeY = avg(LANDMARKS.LEFT_EYE.map((i) => lm[i].y));
    const dist = eyeY - browY;

    const baseline = this.calibration.browBaseline;
    const max = this.calibration.browMaxRaise;

    return clamp((dist - baseline) / (max - baseline), 0, 1);
  }

  private calcBrowFurrow(lm: FaceLandmark[]): number {
    // Distance between inner brow points
    const leftInner = lm[LANDMARKS.LEFT_EYEBROW[0]];
    const rightInner = lm[LANDMARKS.RIGHT_EYEBROW[0]];
    const dist = Math.abs(rightInner.x - leftInner.x);

    const baseline = this.calibration.browFurrowBaseline;
    const min = this.calibration.browFurrowMin;

    return clamp((baseline - dist) / (baseline - min), 0, 1);
  }

  private calcMouthOpen(lm: FaceLandmark[]): number {
    const upperY = avg(LANDMARKS.UPPER_LIP.map((i) => lm[i].y));
    const lowerY = avg(LANDMARKS.LOWER_LIP.map((i) => lm[i].y));
    const height = lowerY - upperY;

    const baseline = this.calibration.mouthClosed;
    const max = this.calibration.mouthMaxOpen;

    return clamp((height - baseline) / (max - baseline), 0, 1);
  }

  private calcSmile(lm: FaceLandmark[]): number {
    // Lip corner distance relative to mouth width
    const leftCorner = lm[61];
    const rightCorner = lm[291];

    // Corners raised = smaller y values
    const cornerY = (leftCorner.y + rightCorner.y) / 2;
    const centerY = lm[0].y; // Top lip center

    const lift = centerY - cornerY;
    const baseline = this.calibration.smileBaseline;
    const max = this.calibration.smileMax;

    return clamp((lift - baseline) / (max - baseline), 0, 1);
  }

  private calcCheekPuff(lm: FaceLandmark[]): number {
    // Cheek landmarks move outward when puffed
    const leftCheek = avg(LANDMARKS.LEFT_CHEEK.map((i) => lm[i].x));
    const rightCheek = avg(LANDMARKS.RIGHT_CHEEK.map((i) => lm[i].x));
    const noseTip = lm[1].x;

    const leftDist = noseTip - leftCheek;
    const rightDist = rightCheek - noseTip;
    const expansion = (leftDist + rightDist) / 2;

    const baseline = this.calibration.cheekBaseline;
    const max = this.calibration.cheekMaxPuff;

    return clamp((expansion - baseline) / (max - baseline), 0, 1);
  }

  private calcBlink(lm: FaceLandmark[], side: 'left' | 'right'): number {
    const eye = side === 'left' ? LANDMARKS.LEFT_EYE : LANDMARKS.RIGHT_EYE;

    // Eye aspect ratio (height / width)
    const topY = lm[eye[1]].y;
    const bottomY = lm[eye[5]].y;
    const leftX = lm[eye[0]].x;
    const rightX = lm[eye[3]].x;

    const height = Math.abs(bottomY - topY);
    const width = Math.abs(rightX - leftX);
    const ratio = height / width;

    // Closed eye has very small ratio
    return ratio < 0.15 ? 1 : 0;
  }

  private calcNeutral(lm: FaceLandmark[]): number {
    // Neutral is inverse of all other expressions
    const raw = {
      browRaise: this.calcBrowRaise(lm),
      browFurrow: this.calcBrowFurrow(lm),
      mouthOpen: this.calcMouthOpen(lm),
      smile: this.calcSmile(lm),
      cheekPuff: this.calcCheekPuff(lm),
    };

    const maxExpression = Math.max(
      raw.browRaise,
      raw.browFurrow,
      raw.mouthOpen,
      raw.smile,
      raw.cheekPuff
    );

    // If no expression is active, face is neutral
    return maxExpression < 0.2 ? 1 - maxExpression : 0;
  }

  private applyCalibration(raw: ExpressionState): ExpressionState {
    // Calibration is already applied in individual calc functions
    // This method can apply additional normalization if needed
    return raw;
  }

  private applySmoothing(current: ExpressionState): ExpressionState {
    if (this.history.length === 0) return current;

    const prev = this.history[this.history.length - 1];
    const a = this.config.smoothingFactor;

    return {
      browRaise: lerp(prev.browRaise, current.browRaise, a),
      browFurrow: lerp(prev.browFurrow, current.browFurrow, a),
      mouthOpen: lerp(prev.mouthOpen, current.mouthOpen, a),
      smile: lerp(prev.smile, current.smile, a),
      cheekPuff: lerp(prev.cheekPuff, current.cheekPuff, a),
      leftBlink: current.leftBlink, // No smoothing for blinks
      rightBlink: current.rightBlink,
      neutral: lerp(prev.neutral, current.neutral, a),
    };
  }

  private getEmptyState(): ExpressionState {
    return {
      browRaise: 0,
      browFurrow: 0,
      mouthOpen: 0,
      smile: 0,
      cheekPuff: 0,
      leftBlink: 0,
      rightBlink: 0,
      neutral: 1,
    };
  }

  clearHistory(): void {
    this.history = [];
  }
}

// Utility functions
function avg(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
