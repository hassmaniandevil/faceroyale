'use client';

import { motion } from 'framer-motion';
import { useGameStore, selectLocalPlayer } from '@/stores/gameStore';

interface ResultsOverlayProps {
  onExit: () => void;
}

export function ResultsOverlay({ onExit }: ResultsOverlayProps) {
  const localPlayer = useGameStore(selectLocalPlayer);
  const players = useGameStore((s) => s.players);
  const winnerId = useGameStore((s) => s.winnerId);

  // Calculate placement
  const alivePlayers = [...players.values()].filter((p) => p.isAlive);
  const isWinner = localPlayer?.id === winnerId;

  // Calculate stats
  const kills = localPlayer?.kills ?? 0;
  const damageDealt = localPlayer?.damageDealt ?? 0;

  // Estimate XP and coins (simplified)
  const placement = isWinner ? 1 : alivePlayers.length + 1;
  const xpEarned = 50 + Math.max(0, 40 - placement) * 5 + kills * 20;
  const coinsEarned = 10 + (placement <= 3 ? 20 : 0) + (isWinner ? 30 : 0) + kills * 5;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex items-center justify-center bg-black/80 z-50"
    >
      <motion.div
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4"
      >
        {/* Header */}
        <div className="text-center mb-6">
          {isWinner ? (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="text-6xl mb-2"
              >
                👑
              </motion.div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                VICTORY ROYALE!
              </h2>
            </>
          ) : (
            <>
              <div className="text-5xl mb-2">#{placement}</div>
              <h2 className="text-2xl font-bold text-gray-300">
                Better luck next time!
              </h2>
            </>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-800 rounded-xl">
            <div className="text-2xl font-bold">{kills}</div>
            <div className="text-xs text-gray-400">Eliminations</div>
          </div>
          <div className="text-center p-3 bg-gray-800 rounded-xl">
            <div className="text-2xl font-bold">{damageDealt}</div>
            <div className="text-xs text-gray-400">Damage</div>
          </div>
          <div className="text-center p-3 bg-gray-800 rounded-xl">
            <div className="text-2xl font-bold">#{placement}</div>
            <div className="text-xs text-gray-400">Placement</div>
          </div>
        </div>

        {/* Rewards */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <h3 className="text-sm text-gray-400 mb-3">Rewards</h3>
          <div className="flex justify-around">
            <div className="flex items-center gap-2">
              <span className="text-blue-400 text-xl">⭐</span>
              <div>
                <div className="font-bold">+{xpEarned}</div>
                <div className="text-xs text-gray-400">XP</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 text-xl">🪙</span>
              <div>
                <div className="font-bold">+{coinsEarned}</div>
                <div className="text-xs text-gray-400">Coins</div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onExit}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-semibold transition-colors"
          >
            Exit
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 rounded-xl font-semibold transition-colors"
          >
            Play Again
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
