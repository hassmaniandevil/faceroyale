/**
 * Face Tracking Types for FaceRoyale
 * Adapted from FaceFights with battle royale-specific extensions
 */

export interface FaceFrame {
  timestamp: number;
  landmarks: FaceLandmark[];
  expressions: ExpressionState;
  headPose: HeadPose;
  confidence: number; // 0-1 tracking quality
}

export interface FaceLandmark {
  x: number; // 0-1 normalized
  y: number;
  z: number;
}

export interface ExpressionState {
  browRaise: number; // 0-1 - Shield Burst trigger
  browFurrow: number; // 0-1 - Intimidate trigger
  mouthOpen: number; // 0-1 - Scream Attack trigger
  smile: number; // 0-1 - Charm trigger
  cheekPuff: number; // 0-1 - Explosive Push trigger
  leftBlink: number; // 0-1 - Quick Strike trigger (either eye)
  rightBlink: number; // 0-1
  neutral: number; // 0-1 - Meditate trigger (2s hold)
}

export interface HeadPose {
  pitch: number; // Up/down (degrees)
  yaw: number; // Left/right - Dodge direction
  roll: number; // Tilt
}

export interface FaceTrackingConfig {
  targetFPS: number; // 30 default
  smoothingFactor: number; // 0.3 default
  minConfidence: number; // 0.7 default
  calibrationSamples: number; // 30 default
}

export interface CalibrationData {
  browBaseline: number;
  browMaxRaise: number;
  browFurrowBaseline: number;
  browFurrowMin: number;
  mouthClosed: number;
  mouthMaxOpen: number;
  smileBaseline: number;
  smileMax: number;
  cheekBaseline: number;
  cheekMaxPuff: number;
  timestamp: number;
}

export interface CalibrationStep {
  id: string;
  instruction: string;
  duration: number; // ms
  expression: keyof ExpressionState;
}

export interface ActionTrigger {
  expression: keyof ExpressionState;
  threshold: number; // 0-1
  holdTime: number; // ms to hold above threshold
  cooldown: number; // ms between triggers
  fatiguePenalty: number;
}

export interface TriggeredAction {
  actionId: string;
  intensity: number;
  timestamp: number;
}

export interface FatigueState {
  expressionId: string;
  usageCount: number; // Rolling window (last 30s)
  currentPenalty: number; // 0.0 - 0.8 (reduces effectiveness)
  recoveryRate: number; // Per-second decay
}

export type FaceDistanceStatus = 'good' | 'too_far' | 'too_close' | 'no_face';
