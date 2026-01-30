'use client';

import { useState, useCallback, useRef, type RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaceCalibrator,
  ExpressionDetector,
  DEFAULT_FACE_TRACKING_CONFIG,
  type CalibrationStep,
  type CalibrationData,
} from '@faceroyale/face-tracking';
import { usePlayerStore } from '@/stores/playerStore';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

interface CalibrationFlowProps {
  videoRef: RefObject<HTMLVideoElement>;
  onComplete: () => void;
  onSkip: () => void;
}

export function CalibrationFlow({
  videoRef,
  onComplete,
  onSkip,
}: CalibrationFlowProps) {
  const [stage, setStage] = useState<'intro' | 'calibrating' | 'complete'>(
    'intro'
  );
  const [currentStep, setCurrentStep] = useState<CalibrationStep | null>(null);
  const [progress, setProgress] = useState(0);
  const [calibrationData, setCalibrationData] = useState<CalibrationData | null>(
    null
  );

  const setCalibration = usePlayerStore((s) => s.setCalibrationData);
  const detectorRef = useRef(
    new ExpressionDetector(DEFAULT_FACE_TRACKING_CONFIG)
  );
  const landmarkerRef = useRef<FaceLandmarker | null>(null);

  const startCalibration = useCallback(async () => {
    setStage('calibrating');

    // Initialize MediaPipe if needed
    if (!landmarkerRef.current) {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
      );
      landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
      });
    }

    const calibrator = new FaceCalibrator();

    const getSample = () => {
      if (!landmarkerRef.current || !videoRef.current) return null;
      const result = landmarkerRef.current.detectForVideo(
        videoRef.current,
        performance.now()
      );
      if (result.faceLandmarks?.[0]) {
        return detectorRef.current.detect(result.faceLandmarks[0]);
      }
      return null;
    };

    try {
      const data = await calibrator.run(getSample, (step, prog) => {
        setCurrentStep(step);
        setProgress(prog);
      });

      setCalibrationData(data);
      setCalibration(data);
      setStage('complete');

      // Auto-complete after delay
      setTimeout(onComplete, 2000);
    } catch (error) {
      console.error('Calibration failed:', error);
      onSkip();
    }
  }, [videoRef, setCalibration, onComplete, onSkip]);

  return (
    <div className="fixed inset-0 bg-gradient-hero flex flex-col">
      {/* Video preview */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="w-full h-full object-cover scale-x-[-1]"
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-ff-darker via-transparent to-transparent" />

        {/* Face guide */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-80 border-2 border-ff-accent/30 rounded-[50%] relative">
            <div className="absolute inset-4 border border-dashed border-ff-accent/20 rounded-[50%]" />
            {/* Corner guides */}
            <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-ff-primary rounded-tl-lg" />
            <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-ff-primary rounded-tr-lg" />
            <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-ff-primary rounded-bl-lg" />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-ff-primary rounded-br-lg" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 pb-safe bg-ff-darker/80 backdrop-blur-lg">
        <AnimatePresence mode="wait">
          {stage === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <h2 className="text-2xl font-display font-bold mb-2 text-gradient">
                Face Calibration
              </h2>
              <p className="text-white/60 mb-6">
                We'll calibrate the game to your face. Make sure your face is
                well-lit and centered in the guide.
              </p>

              <div className="space-y-3">
                <button
                  onClick={startCalibration}
                  className="w-full btn-primary py-4 text-lg"
                >
                  Start Calibration
                </button>
                <button
                  onClick={onSkip}
                  className="w-full py-3 text-white/40 hover:text-white/60 transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </motion.div>
          )}

          {stage === 'calibrating' && currentStep && (
            <motion.div
              key="calibrating"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <h2 className="text-2xl font-display font-bold mb-2">
                {currentStep.instruction}
              </h2>

              {/* Progress bar */}
              <div className="w-full h-2 bg-white/10 rounded-full mt-4 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-ff-primary via-ff-secondary to-ff-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>

              {/* Expression emoji hint */}
              <motion.div
                key={currentStep.id}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mt-6 text-6xl"
              >
                {currentStep.id === 'neutral' && '😐'}
                {currentStep.id === 'browRaise' && '😮'}
                {currentStep.id === 'browFurrow' && '😠'}
                {currentStep.id === 'mouthOpen' && '😱'}
                {currentStep.id === 'smile' && '😄'}
                {currentStep.id === 'cheekPuff' && '🐡'}
              </motion.div>

              <p className="text-white/40 mt-2 text-sm">
                Hold the expression for a moment...
              </p>
            </motion.div>
          )}

          {stage === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="w-20 h-20 rounded-full bg-ff-green/20 flex items-center justify-center mx-auto mb-4"
              >
                <span className="text-4xl">✅</span>
              </motion.div>
              <h2 className="text-2xl font-display font-bold mb-2 text-gradient">
                Calibration Complete!
              </h2>
              <p className="text-white/60">
                Your face is ready for battle.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
