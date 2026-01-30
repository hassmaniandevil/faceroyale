/**
 * Face Tracking Hook
 * Manages MediaPipe face detection, expression processing, and content moderation
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import * as nsfwjs from 'nsfwjs';
import {
  ExpressionDetector,
  ActionTriggerSystem,
  DEFAULT_FACE_TRACKING_CONFIG,
  type ExpressionState,
  type CalibrationData,
  type TriggeredAction,
} from '@faceroyale/face-tracking';
import { usePlayerStore } from '@/stores/playerStore';

interface HeadPose {
  yaw: number;   // -1 to 1 (left to right)
  pitch: number; // -1 to 1 (up to down)
}

interface UseFaceTrackingReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  isInitialized: boolean;
  isTracking: boolean;
  expressions: ExpressionState | null;
  headPose: HeadPose | null;
  quality: number;
  triggeredActions: TriggeredAction[];
  isContentBlocked: boolean;
  contentBlockReason: string | null;
  initialize: () => Promise<void>;
  startTracking: () => void;
  stopTracking: () => void;
  setCalibration: (data: CalibrationData) => void;
  triggerSystem: ActionTriggerSystem | null;
}

const MEDIAPIPE_WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm';
const FACE_LANDMARKER_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export function useFaceTracking(): UseFaceTrackingReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const [isInitialized, setIsInitialized] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [expressions, setExpressions] = useState<ExpressionState | null>(null);
  const [headPose, setHeadPose] = useState<HeadPose | null>(null);
  const [quality, setQuality] = useState(0);
  const [triggeredActions, setTriggeredActions] = useState<TriggeredAction[]>(
    []
  );
  const [isContentBlocked, setIsContentBlocked] = useState(false);
  const [contentBlockReason, setContentBlockReason] = useState<string | null>(null);

  // Head pose baseline (center position)
  const headPoseBaselineRef = useRef<{ x: number; y: number } | null>(null);
  const headPoseHistoryRef = useRef<HeadPose[]>([]);

  const detectorRef = useRef(
    new ExpressionDetector(DEFAULT_FACE_TRACKING_CONFIG)
  );
  const triggerSystemRef = useRef(new ActionTriggerSystem());

  // NSFW detection
  const nsfwModelRef = useRef<nsfwjs.NSFWJS | null>(null);
  const nsfwCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastNsfwCheckRef = useRef<number>(0);
  const NSFW_CHECK_INTERVAL = 2000; // Check every 2 seconds

  const calibrationData = usePlayerStore((s) => s.calibrationData);

  // Apply saved calibration on mount
  useEffect(() => {
    if (calibrationData) {
      detectorRef.current.setCalibration(calibrationData);
    }
  }, [calibrationData]);

  const initialize = useCallback(async () => {
    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Initialize MediaPipe Face Landmarker
      const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);

      landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: FACE_LANDMARKER_MODEL,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });

      // Initialize NSFW detection for content moderation
      console.log('Loading content moderation...');
      try {
        nsfwModelRef.current = await nsfwjs.load();
        nsfwCanvasRef.current = document.createElement('canvas');
        nsfwCanvasRef.current.width = 224;
        nsfwCanvasRef.current.height = 224;
        console.log('Content moderation ready');
      } catch (nsfwErr) {
        console.warn('Content moderation failed to load:', nsfwErr);
        // Continue without NSFW detection - not critical
      }

      setIsInitialized(true);
      console.log('Face tracking initialized');
    } catch (error) {
      console.error('Failed to initialize face tracking:', error);
      throw error;
    }
  }, []);

  // Check for inappropriate content
  const checkForInappropriateContent = useCallback(async () => {
    if (!nsfwModelRef.current || !videoRef.current || !nsfwCanvasRef.current) {
      return;
    }

    try {
      const ctx = nsfwCanvasRef.current.getContext('2d');
      if (!ctx) return;

      // Draw current video frame to canvas
      ctx.drawImage(videoRef.current, 0, 0, 224, 224);

      // Classify the frame
      const predictions = await nsfwModelRef.current.classify(nsfwCanvasRef.current);

      // Check for inappropriate content
      // Categories: Drawing, Hentai, Neutral, Porn, Sexy
      const pornProb = predictions.find((p) => p.className === 'Porn')?.probability || 0;
      const hentaiProb = predictions.find((p) => p.className === 'Hentai')?.probability || 0;
      const sexyProb = predictions.find((p) => p.className === 'Sexy')?.probability || 0;

      const isInappropriate = pornProb > 0.5 || hentaiProb > 0.5 || sexyProb > 0.7;

      if (isInappropriate && !isContentBlocked) {
        const dominated = predictions.reduce((a, b) =>
          a.probability > b.probability ? a : b
        );
        console.warn('[FaceTracking] Inappropriate content detected!', dominated.className);
        setIsContentBlocked(true);
        setContentBlockReason(dominated.className);
      } else if (!isInappropriate && isContentBlocked) {
        console.log('[FaceTracking] Content now appropriate');
        setIsContentBlocked(false);
        setContentBlockReason(null);
      }
    } catch (err) {
      console.warn('[FaceTracking] NSFW check error:', err);
    }
  }, [isContentBlocked]);

  const processFrame = useCallback(() => {
    if (
      !landmarkerRef.current ||
      !videoRef.current ||
      videoRef.current.readyState < 2
    ) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const now = performance.now();
    const deltaMs = now - lastTimeRef.current;
    lastTimeRef.current = now;

    // Periodic NSFW check
    if (nsfwModelRef.current && now - lastNsfwCheckRef.current > NSFW_CHECK_INTERVAL) {
      lastNsfwCheckRef.current = now;
      checkForInappropriateContent();
    }

    // Run detection
    const result = landmarkerRef.current.detectForVideo(
      videoRef.current,
      now
    );

    if (result.faceLandmarks?.[0]) {
      const landmarks = result.faceLandmarks[0];

      // Detect expressions
      const exp = detectorRef.current.detect(landmarks);
      setExpressions(exp);
      setQuality(1);

      // Calculate head pose from nose tip position
      const noseTip = landmarks[1]; // Nose tip landmark
      const forehead = landmarks[10]; // Forehead center

      if (noseTip && forehead) {
        // Initialize baseline on first detection
        if (!headPoseBaselineRef.current) {
          headPoseBaselineRef.current = { x: noseTip.x, y: noseTip.y };
        }

        const baseline = headPoseBaselineRef.current;
        const sensitivity = 4; // How sensitive head movement is

        // Calculate yaw (left/right) and pitch (up/down) relative to baseline
        const rawYaw = (noseTip.x - baseline.x) * sensitivity;
        const rawPitch = (noseTip.y - baseline.y) * sensitivity;

        // Clamp to -1 to 1
        const clampedYaw = Math.max(-1, Math.min(1, rawYaw));
        const clampedPitch = Math.max(-1, Math.min(1, rawPitch));

        // Apply smoothing
        const smoothing = 0.3;
        const prevPose = headPoseHistoryRef.current[headPoseHistoryRef.current.length - 1];

        const smoothedPose: HeadPose = prevPose ? {
          yaw: prevPose.yaw + (clampedYaw - prevPose.yaw) * smoothing,
          pitch: prevPose.pitch + (clampedPitch - prevPose.pitch) * smoothing,
        } : { yaw: clampedYaw, pitch: clampedPitch };

        headPoseHistoryRef.current.push(smoothedPose);
        if (headPoseHistoryRef.current.length > 5) headPoseHistoryRef.current.shift();

        setHeadPose(smoothedPose);
      }

      // Check for triggered actions (only if content not blocked)
      if (!isContentBlocked) {
        const actions = triggerSystemRef.current.update(exp, deltaMs);
        if (actions.length > 0) {
          setTriggeredActions(actions);
        }
      }
    } else {
      setQuality(0);
      setHeadPose(null);
    }

    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [checkForInappropriateContent, isContentBlocked]);

  const startTracking = useCallback(() => {
    if (!isInitialized) {
      console.warn('Face tracking not initialized');
      return;
    }

    setIsTracking(true);
    lastTimeRef.current = performance.now();
    triggerSystemRef.current.reset();
    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [isInitialized, processFrame]);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const setCalibration = useCallback((data: CalibrationData) => {
    detectorRef.current.setCalibration(data);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();

      // Stop video stream
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }

      // Close landmarker
      landmarkerRef.current?.close();
    };
  }, [stopTracking]);

  return {
    videoRef,
    isInitialized,
    isTracking,
    expressions,
    headPose,
    quality,
    triggeredActions,
    isContentBlocked,
    contentBlockReason,
    initialize,
    startTracking,
    stopTracking,
    setCalibration,
    triggerSystem: triggerSystemRef.current,
  };
}
