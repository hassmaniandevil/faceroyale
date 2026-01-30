/**
 * @faceroyale/face-tracking
 * Face detection and expression tracking for FaceRoyale battle royale
 */

// Types
export type {
  FaceFrame,
  FaceLandmark,
  ExpressionState,
  HeadPose,
  FaceTrackingConfig,
  CalibrationData,
  CalibrationStep,
  ActionTrigger,
  TriggeredAction,
  FatigueState,
  FaceDistanceStatus,
} from './types';

// Expression Detection
export { ExpressionDetector } from './expressions/detector';

// Calibration
export { FaceCalibrator, QuickCalibrator } from './calibration/calibrator';

// Action Triggers
export {
  ActionTriggerSystem,
  ABILITY_TRIGGERS,
} from './triggers/action-trigger';

// Default config
export const DEFAULT_FACE_TRACKING_CONFIG: import('./types').FaceTrackingConfig =
  {
    targetFPS: 30,
    smoothingFactor: 0.3,
    minConfidence: 0.7,
    calibrationSamples: 30,
  };
