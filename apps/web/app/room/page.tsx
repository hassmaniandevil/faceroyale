'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore, selectIsAuthenticated } from '@/stores/playerStore';
import {
  useRoomStore,
  selectCurrentRoom,
  selectPlayerCount,
  selectReadyCount,
  selectCanStart,
} from '@/stores/roomStore';

export default function RoomPage() {
  const router = useRouter();
  const isAuthenticated = usePlayerStore(selectIsAuthenticated);
  const { userId } = usePlayerStore();

  const currentRoom = useRoomStore(selectCurrentRoom);
  const playerCount = useRoomStore(selectPlayerCount);
  const readyCount = useRoomStore(selectReadyCount);
  const canStart = useRoomStore(selectCanStart);
  const leaveRoom = useRoomStore((s) => s.leaveRoom);
  const setPlayerReady = useRoomStore((s) => s.setPlayerReady);
  const updateRoom = useRoomStore((s) => s.updateRoom);

  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const isHost = currentRoom?.hostId === userId;
  const myPlayer = currentRoom?.players.find((p) => p.id === userId);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }
    if (!currentRoom) {
      router.push('/lobby');
      return;
    }
  }, [isAuthenticated, currentRoom, router]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      router.push('/play');
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, router]);

  const handleCopyCode = useCallback(async () => {
    if (!currentRoom?.code) return;
    try {
      await navigator.clipboard.writeText(currentRoom.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [currentRoom?.code]);

  const handleToggleReady = () => {
    if (!userId || !myPlayer) return;
    setPlayerReady(userId, !myPlayer.isReady);
  };

  const handleStartGame = () => {
    if (!canStart || !isHost) return;
    setCountdown(3);
    updateRoom({ status: 'starting' });
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    router.push('/lobby');
  };

  if (!currentRoom) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#050508]">
        <div className="animate-spin w-10 h-10 border-4 border-ff-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#050508] relative overflow-hidden">
      {/* Background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(255,51,102,0.1) 0%, transparent 50%)',
        }}
      />

      {/* Countdown Overlay */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 flex items-center justify-center z-50"
          >
            <motion.div
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              {countdown > 0 ? (
                <div className="text-9xl font-display text-gradient">{countdown}</div>
              ) : (
                <div className="text-6xl font-display text-ff-green">GO!</div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="relative z-10 p-4 flex items-center gap-4">
        <button
          onClick={handleLeaveRoom}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 hover:text-white transition-all"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-lg text-gradient truncate">{currentRoom.name}</h1>
          <p className="text-white/40 text-xs">
            {currentRoom.visibility === 'private' ? '🔒 Private' : '🌐 Public'}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center px-4 pb-32">
        <div className="w-full max-w-md">
          {/* Room Code */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/40 text-xs mb-1">ROOM CODE</p>
                <p className="font-mono text-2xl tracking-[0.3em] text-ff-yellow">{currentRoom.code}</p>
              </div>
              <button
                onClick={handleCopyCode}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition-all"
              >
                {copied ? '✓' : '📋'}
              </button>
            </div>
          </motion.div>

          {/* Player Progress */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-white/50">Players</span>
              <span className="font-mono">
                <span className={playerCount >= currentRoom.minPlayers ? 'text-ff-green' : 'text-ff-yellow'}>
                  {playerCount}
                </span>
                <span className="text-white/30">/{currentRoom.maxPlayers}</span>
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-ff-primary to-ff-secondary"
                initial={{ width: 0 }}
                animate={{ width: `${(playerCount / currentRoom.maxPlayers) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-white/30 text-xs mt-1">
              {playerCount < currentRoom.minPlayers
                ? `Need ${currentRoom.minPlayers - playerCount} more to start`
                : `${readyCount} of ${playerCount} ready`}
            </p>
          </motion.div>

          {/* Players Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="font-display text-sm text-white/50 mb-3 tracking-wider">PLAYERS</h2>
            <div className="grid grid-cols-6 gap-2">
              {currentRoom.players.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center text-center ${
                    player.isReady
                      ? 'bg-ff-green/20 border border-ff-green'
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  <div className="text-lg">{player.isHost ? '👑' : '😊'}</div>
                  <div className="text-[8px] text-white/60 truncate w-full px-1">
                    {player.id === userId ? 'You' : player.username.slice(0, 6)}
                  </div>
                </motion.div>
              ))}

              {/* Empty slots */}
              {Array(Math.min(12, currentRoom.maxPlayers - playerCount))
                .fill(null)
                .map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="aspect-square rounded-xl bg-white/5 border border-dashed border-white/10 flex items-center justify-center"
                  >
                    <span className="text-white/20 text-xs">+</span>
                  </div>
                ))}

              {currentRoom.maxPlayers - playerCount > 12 && (
                <div className="aspect-square rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <span className="text-white/30 text-[10px]">
                    +{currentRoom.maxPlayers - playerCount - 12}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#050508] via-[#050508] to-transparent">
        <div className="max-w-md mx-auto space-y-3">
          {isHost ? (
            <motion.button
              whileHover={{ scale: canStart ? 1.02 : 1 }}
              whileTap={{ scale: canStart ? 0.98 : 1 }}
              onClick={handleStartGame}
              disabled={!canStart}
              className="w-full py-5 rounded-2xl font-display text-xl disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: canStart ? 'linear-gradient(135deg, #00D26A, #10B981)' : 'rgba(255,255,255,0.1)',
                boxShadow: canStart ? '0 0 30px rgba(0,210,106,0.3)' : 'none',
              }}
            >
              {canStart ? 'START GAME' : `WAITING FOR ${currentRoom.minPlayers - readyCount} MORE`}
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleToggleReady}
              className={`w-full py-5 rounded-2xl font-display text-xl transition-all ${
                myPlayer?.isReady
                  ? 'bg-ff-green/20 border-2 border-ff-green text-ff-green'
                  : ''
              }`}
              style={!myPlayer?.isReady ? {
                background: 'linear-gradient(135deg, #FF3366, #6C5CE7)',
                boxShadow: '0 0 30px rgba(255,51,102,0.3)',
              } : {}}
            >
              {myPlayer?.isReady ? '✓ READY' : 'READY UP'}
            </motion.button>
          )}

          <button
            onClick={handleLeaveRoom}
            className="w-full py-3 rounded-xl bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70 transition-all text-sm"
          >
            Leave Room
          </button>
        </div>
      </div>
    </div>
  );
}
