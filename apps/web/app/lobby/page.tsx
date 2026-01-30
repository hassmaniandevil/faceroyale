'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { usePlayerStore, selectIsAuthenticated } from '@/stores/playerStore';
import {
  useRoomStore,
  selectPublicRooms,
  generateRoomCode,
  type Room,
  type RoomVisibility,
} from '@/stores/roomStore';

export default function LobbyPage() {
  const router = useRouter();
  const isAuthenticated = usePlayerStore(selectIsAuthenticated);
  const { userId, username, avatarId } = usePlayerStore();
  const publicRooms = useRoomStore(selectPublicRooms);
  const setCurrentRoom = useRoomStore((s) => s.setCurrentRoom);
  const setPublicRooms = useRoomStore((s) => s.setPublicRooms);

  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  // Create room state
  const [roomName, setRoomName] = useState('');
  const [visibility, setVisibility] = useState<RoomVisibility>('public');
  const [maxPlayers, setMaxPlayers] = useState(20);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Mock public rooms
  useEffect(() => {
    const mockRooms: Room[] = [
      {
        id: 'room1',
        code: 'BATTLE',
        name: 'Epic Battle Arena',
        hostId: 'host1',
        visibility: 'public',
        maxPlayers: 30,
        minPlayers: 10,
        players: Array(12).fill(null).map((_, i) => ({
          id: `player${i}`,
          username: `Player${i + 1}`,
          avatarId: 'default',
          isHost: i === 0,
          isReady: Math.random() > 0.3,
          joinedAt: Date.now(),
        })),
        status: 'waiting',
        createdAt: Date.now() - 60000,
        settings: { roundDuration: 30, eliminationCount: 5, powerupsEnabled: true, spectatorMode: true },
      },
      {
        id: 'room2',
        code: 'QUICK1',
        name: 'Quick Match',
        hostId: 'host2',
        visibility: 'public',
        maxPlayers: 10,
        minPlayers: 6,
        players: Array(8).fill(null).map((_, i) => ({
          id: `player${i}`,
          username: `Fighter${i + 1}`,
          avatarId: 'default',
          isHost: i === 0,
          isReady: true,
          joinedAt: Date.now(),
        })),
        status: 'waiting',
        createdAt: Date.now() - 120000,
        settings: { roundDuration: 20, eliminationCount: 2, powerupsEnabled: false, spectatorMode: false },
      },
    ];
    setPublicRooms(mockRooms);
  }, [setPublicRooms]);

  const handleCreateRoom = async () => {
    if (!roomName.trim() || !userId || !username) return;
    setIsCreating(true);
    await new Promise((r) => setTimeout(r, 300));

    const newRoom: Room = {
      id: `room_${Date.now()}`,
      code: generateRoomCode(),
      name: roomName.trim(),
      hostId: userId,
      visibility,
      maxPlayers,
      minPlayers: Math.max(6, Math.floor(maxPlayers * 0.4)),
      players: [{
        id: userId,
        username: username,
        avatarId: avatarId || 'default',
        isHost: true,
        isReady: true,
        joinedAt: Date.now(),
      }],
      status: 'waiting',
      createdAt: Date.now(),
      settings: { roundDuration: 30, eliminationCount: Math.max(1, Math.floor(maxPlayers * 0.15)), powerupsEnabled: true, spectatorMode: true },
    };

    setCurrentRoom(newRoom);
    setIsCreating(false);
    router.push('/room');
  };

  const handleJoinByCode = async () => {
    if (joinCode.length !== 6) {
      setJoinError('Enter 6-character code');
      return;
    }
    setJoinError(null);

    const room = publicRooms.find((r) => r.code.toUpperCase() === joinCode.toUpperCase());
    if (!room) {
      setJoinError('Room not found');
      return;
    }
    if (room.players.length >= room.maxPlayers) {
      setJoinError('Room is full');
      return;
    }

    const updatedRoom = {
      ...room,
      players: [...room.players, {
        id: userId!,
        username: username!,
        avatarId: avatarId || 'default',
        isHost: false,
        isReady: false,
        joinedAt: Date.now(),
      }],
    };

    setCurrentRoom(updatedRoom);
    router.push('/room');
  };

  const handleJoinRoom = (room: Room) => {
    if (room.players.length >= room.maxPlayers) return;

    const updatedRoom = {
      ...room,
      players: [...room.players, {
        id: userId!,
        username: username!,
        avatarId: avatarId || 'default',
        isHost: false,
        isReady: false,
        joinedAt: Date.now(),
      }],
    };

    setCurrentRoom(updatedRoom);
    router.push('/room');
  };

  const handleBack = () => {
    if (mode !== 'menu') {
      setMode('menu');
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#050508] relative overflow-hidden">
      {/* Background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(255,51,102,0.1) 0%, transparent 50%)',
        }}
      />

      {/* Header */}
      <div className="relative z-10 p-4 flex items-center gap-4">
        <button
          onClick={handleBack}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 hover:text-white transition-all"
        >
          ←
        </button>
        <h1 className="font-display text-xl text-gradient">
          {mode === 'menu' ? 'GAME LOBBY' : mode === 'create' ? 'CREATE ROOM' : 'JOIN ROOM'}
        </h1>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center px-4 pb-8">
        <div className="w-full max-w-md">
          {/* Main Menu */}
          {mode === 'menu' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setMode('create')}
                  className="py-6 rounded-2xl font-display text-lg"
                  style={{
                    background: 'linear-gradient(135deg, #FF3366, #6C5CE7)',
                    boxShadow: '0 0 30px rgba(255,51,102,0.3)',
                  }}
                >
                  CREATE
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setMode('join')}
                  className="py-6 rounded-2xl font-display text-lg bg-white/10 border border-white/20 hover:bg-white/15 transition-all"
                >
                  JOIN CODE
                </motion.button>
              </div>

              {/* Public Rooms */}
              <div>
                <h2 className="font-display text-sm text-white/50 mb-3 tracking-wider">
                  PUBLIC ROOMS
                </h2>

                {publicRooms.length === 0 ? (
                  <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
                    <div className="text-3xl mb-2">🏜️</div>
                    <p className="text-white/40 text-sm">No rooms available</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {publicRooms.map((room) => (
                      <motion.button
                        key={room.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleJoinRoom(room)}
                        disabled={room.players.length >= room.maxPlayers}
                        className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-display text-base">{room.name}</span>
                          <span className={`text-sm font-mono ${
                            room.players.length >= room.maxPlayers ? 'text-red-400' : 'text-ff-green'
                          }`}>
                            {room.players.length}/{room.maxPlayers}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-1">
                            {room.players.slice(0, 5).map((p, i) => (
                              <div
                                key={p.id}
                                className="w-6 h-6 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-[10px]"
                              >
                                {p.isHost ? '👑' : '😊'}
                              </div>
                            ))}
                            {room.players.length > 5 && (
                              <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[10px] text-white/50">
                                +{room.players.length - 5}
                              </div>
                            )}
                          </div>
                          <span className="text-white/30 text-xs">•</span>
                          <span className="text-white/40 text-xs">
                            {room.players.filter(p => p.isReady).length} ready
                          </span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Create Room */}
          {mode === 'create' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div>
                <label className="block text-white/50 text-xs mb-2 tracking-wider">ROOM NAME</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="My Arena"
                  maxLength={24}
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-4 text-white placeholder:text-white/30 focus:border-ff-primary focus:outline-none text-lg"
                />
              </div>

              <div>
                <label className="block text-white/50 text-xs mb-2 tracking-wider">VISIBILITY</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setVisibility('public')}
                    className={`py-4 rounded-xl font-display text-sm transition-all ${
                      visibility === 'public'
                        ? 'bg-ff-green/20 border-2 border-ff-green text-ff-green'
                        : 'bg-white/5 border border-white/20 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    🌐 PUBLIC
                  </button>
                  <button
                    onClick={() => setVisibility('private')}
                    className={`py-4 rounded-xl font-display text-sm transition-all ${
                      visibility === 'private'
                        ? 'bg-ff-yellow/20 border-2 border-ff-yellow text-ff-yellow'
                        : 'bg-white/5 border border-white/20 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    🔒 PRIVATE
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-white/50 text-xs mb-2 tracking-wider">
                  MAX PLAYERS: <span className="text-ff-primary">{maxPlayers}</span>
                </label>
                <input
                  type="range"
                  min={10}
                  max={30}
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-ff-primary"
                />
                <div className="flex justify-between text-[10px] text-white/30 mt-1">
                  <span>10</span>
                  <span>30</span>
                </div>
              </div>

              <button
                onClick={handleCreateRoom}
                disabled={!roomName.trim() || isCreating}
                className="w-full py-5 rounded-2xl font-display text-xl disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: roomName.trim() && !isCreating ? 'linear-gradient(135deg, #FF3366, #6C5CE7)' : 'rgba(255,255,255,0.1)',
                  boxShadow: roomName.trim() && !isCreating ? '0 0 30px rgba(255,51,102,0.3)' : 'none',
                }}
              >
                {isCreating ? 'CREATING...' : 'CREATE ROOM'}
              </button>
            </motion.div>
          )}

          {/* Join by Code */}
          {mode === 'join' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="text-center mb-4">
                <p className="text-white/50 text-sm">Enter the 6-character room code</p>
              </div>

              <input
                type="text"
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase().slice(0, 6));
                  setJoinError(null);
                }}
                placeholder="ABC123"
                maxLength={6}
                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-6 text-3xl text-center font-mono tracking-[0.4em] text-white placeholder:text-white/20 focus:border-ff-primary focus:outline-none uppercase"
              />

              {joinError && (
                <p className="text-red-400 text-sm text-center">{joinError}</p>
              )}

              <button
                onClick={handleJoinByCode}
                disabled={joinCode.length !== 6}
                className="w-full py-5 rounded-2xl font-display text-xl disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: joinCode.length === 6 ? 'linear-gradient(135deg, #FF3366, #6C5CE7)' : 'rgba(255,255,255,0.1)',
                  boxShadow: joinCode.length === 6 ? '0 0 30px rgba(255,51,102,0.3)' : 'none',
                }}
              >
                JOIN ROOM
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
