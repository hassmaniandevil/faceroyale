'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';

export function CountdownOverlay() {
  const phaseStartTime = useGameStore((s) => s.phaseStartTime);
  const phaseEndTime = useGameStore((s) => s.phaseEndTime);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((phaseEndTime - Date.now()) / 1000)
      );
      setCountdown(remaining);
    }, 100);

    return () => clearInterval(interval);
  }, [phaseEndTime]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex items-center justify-center bg-black/70 z-50"
    >
      <div className="text-center">
        <motion.div
          key={countdown}
          initial={{ scale: 2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-4"
        >
          {countdown > 0 ? (
            <span className="text-9xl font-bold text-white drop-shadow-lg">
              {countdown}
            </span>
          ) : (
            <span className="text-6xl font-bold text-red-500 drop-shadow-lg">
              FACE OFF!
            </span>
          )}
        </motion.div>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-gray-300"
        >
          {countdown > 0 ? 'Get ready...' : 'GO!'}
        </motion.p>
      </div>
    </motion.div>
  );
}
