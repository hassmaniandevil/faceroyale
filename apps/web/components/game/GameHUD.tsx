'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { PracticeGameState, GamePlayer } from '@/hooks/usePracticeGame';

interface ExpressionState {
  browRaise: number;
  browFurrow: number;
  mouthOpen: number;
  smile: number;
  cheekPuff: number;
  leftBlink: number;
  rightBlink: number;
  neutral: number;
}

interface GameHUDProps {
  gameState: PracticeGameState;
  localPlayer: GamePlayer | null;
  expressions: ExpressionState | null;
  activeAbility: string | null;
}

const ABILITY_CONFIG: Array<{
  key: string;
  emoji: string;
  name: string;
  expression: keyof ExpressionState;
  threshold: number;
  cooldown: number;
}> = [
  { key: 'scream', emoji: '😱', name: 'Scream', expression: 'mouthOpen', threshold: 0.35, cooldown: 3000 },
  { key: 'shield', emoji: '🛡️', name: 'Shield', expression: 'browRaise', threshold: 0.3, cooldown: 8000 },
  { key: 'blast', emoji: '😤', name: 'Blast', expression: 'cheekPuff', threshold: 0.3, cooldown: 5000 },
  { key: 'quickStrike', emoji: '😉', name: 'Strike', expression: 'leftBlink', threshold: 0.7, cooldown: 2000 },
  { key: 'meditate', emoji: '😐', name: 'Heal', expression: 'neutral', threshold: 0.7, cooldown: 15000 },
  { key: 'dodge', emoji: '💨', name: 'Dodge', expression: 'rightBlink', threshold: 0.7, cooldown: 1000 },
];

export function GameHUD({ gameState, localPlayer, expressions, activeAbility }: GameHUDProps) {
  const now = Date.now();

  return (
    <>
      {/* Top Bar */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-10">
        {/* Players Alive */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10"
        >
          <div className="text-white/50 text-xs">ALIVE</div>
          <div className="text-2xl font-display font-bold text-gradient">
            {gameState.playersAlive}
          </div>
        </motion.div>

        {/* Time / Zone Warning */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10 text-center"
        >
          <div className="text-white/50 text-xs">ZONE</div>
          <div className={`text-lg font-display font-bold ${
            gameState.zone.currentRadius < 200 ? 'text-ff-primary animate-pulse' : 'text-white'
          }`}>
            {gameState.zone.currentRadius > gameState.zone.targetRadius ? 'SHRINKING' : 'STABLE'}
          </div>
        </motion.div>

        {/* Kills */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10"
        >
          <div className="text-white/50 text-xs">KILLS</div>
          <div className="text-2xl font-display font-bold text-ff-yellow">
            {localPlayer?.kills || 0}
          </div>
        </motion.div>
      </div>

      {/* Health Bar */}
      {localPlayer && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-28 left-1/2 -translate-x-1/2 w-full max-w-xs px-4 z-10"
        >
          {/* Shield Bar */}
          {localPlayer.shield > 0 && (
            <div className="h-2 bg-white/10 rounded-full mb-1 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${(localPlayer.shield / 50) * 100}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
          )}

          {/* Health Bar */}
          <div className="h-4 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${
                localPlayer.health > 50 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                localPlayer.health > 25 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                'bg-gradient-to-r from-red-500 to-pink-500 animate-pulse'
              }`}
              initial={{ width: '100%' }}
              animate={{ width: `${(localPlayer.health / localPlayer.maxHealth) * 100}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-white/50">{localPlayer.character.name}</span>
            <span className="text-white font-mono">
              {Math.ceil(localPlayer.health)} / {localPlayer.maxHealth}
            </span>
          </div>
        </motion.div>
      )}

      {/* Abilities */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10"
      >
        {ABILITY_CONFIG.map((ability) => {
          const lastUse = localPlayer?.lastAbilityTime[ability.key] || 0;
          const cooldownRemaining = Math.max(0, ability.cooldown - (now - lastUse));
          const isOnCooldown = cooldownRemaining > 0;
          const expressionValue = expressions?.[ability.expression] ?? 0;
          const isActive = activeAbility === ability.key;

          return (
            <motion.div
              key={ability.key}
              animate={{
                scale: isActive ? 1.2 : 1,
                borderColor: isActive ? '#00D26A' : 'rgba(255, 255, 255, 0.2)',
              }}
              className={`relative w-14 h-14 rounded-xl bg-black/60 backdrop-blur border-2 flex flex-col items-center justify-center ${
                isOnCooldown ? 'opacity-50' : ''
              }`}
            >
              <span className={`text-xl ${isActive ? 'animate-bounce' : ''}`}>{ability.emoji}</span>
              <span className="text-[8px] text-white/60">{ability.name}</span>

              {/* Cooldown overlay */}
              {isOnCooldown && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-xl">
                  <span className="text-xs font-mono text-white/80">
                    {(cooldownRemaining / 1000).toFixed(1)}
                  </span>
                </div>
              )}

              {/* Expression progress */}
              {!isOnCooldown && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 rounded-b-xl overflow-hidden">
                  <motion.div
                    className={`h-full ${
                      expressionValue >= ability.threshold ? 'bg-ff-green' : 'bg-ff-primary'
                    }`}
                    animate={{ width: `${Math.min(expressionValue / ability.threshold * 100, 100)}%` }}
                    transition={{ duration: 0.05 }}
                  />
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Kill Feed */}
      <div className="absolute top-20 right-4 w-56 space-y-1 pointer-events-none z-10">
        <AnimatePresence>
          {gameState.killFeed.slice(-5).map((entry, index) => (
            <motion.div
              key={`${entry.victimId}-${entry.timestamp}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs border border-white/10"
            >
              <span className="text-ff-primary font-bold">{entry.killerName}</span>
              <span className="text-white/40 mx-1">eliminated</span>
              <span className="text-white/80">{entry.victimName}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Face detection reminder */}
      {expressions && !Object.values(expressions).some(v => typeof v === 'number' && v > 0.1) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 backdrop-blur rounded-2xl px-6 py-4 text-center z-20"
        >
          <div className="text-4xl mb-2">😶</div>
          <div className="text-white/60 text-sm">Make expressions to attack!</div>
        </motion.div>
      )}
    </>
  );
}
