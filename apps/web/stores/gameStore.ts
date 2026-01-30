/**
 * Game State Store
 * Manages real-time match state synchronized from server
 */

import { create } from 'zustand';
import type { MatchPhase, Vector2 } from '@faceroyale/game-core';

interface Player {
  id: string;
  sessionId: string;
  username: string;
  avatarId: string;
  position: Vector2;
  rotation: number;
  health: number;
  shield: number;
  isAlive: boolean;
  isBot: boolean;
  kills: number;
  damageDealt: number;
  cooldowns: Map<string, number>;
  fatigue: Map<string, number>;
}

interface Zone {
  center: Vector2;
  currentRadius: number;
  targetRadius: number;
}

interface KillFeedEntry {
  killerId: string;
  killerName: string;
  victimId: string;
  victimName: string;
  weapon: string;
  timestamp: number;
}

interface GameState {
  // Connection
  isConnected: boolean;
  roomId: string | null;

  // Match state
  phase: MatchPhase;
  phaseStartTime: number;
  phaseEndTime: number;
  serverTime: number;
  winnerId: string | null;

  // Players
  players: Map<string, Player>;
  localPlayerId: string | null;

  // World
  zone: Zone;
  powerUps: Array<{
    id: string;
    type: string;
    position: Vector2;
    isActive: boolean;
  }>;

  // UI
  killFeed: KillFeedEntry[];
  playersAlive: number;
  announcement: string | null;

  // Actions
  setConnected: (connected: boolean, roomId?: string) => void;
  setPhase: (phase: MatchPhase, startTime?: number, endTime?: number) => void;
  setLocalPlayerId: (id: string) => void;
  updatePlayer: (sessionId: string, updates: Partial<Player>) => void;
  removePlayer: (sessionId: string) => void;
  setPlayers: (update: Map<string, Player> | ((prev: Map<string, Player>) => Map<string, Player>)) => void;
  setZone: (zone: Zone) => void;
  addKillFeedEntry: (entry: KillFeedEntry) => void;
  setPlayersAlive: (count: number) => void;
  setAnnouncement: (message: string | null) => void;
  setWinnerId: (id: string | null) => void;
  reset: () => void;
}

const initialState = {
  isConnected: false,
  roomId: null,
  phase: 'waiting' as MatchPhase,
  phaseStartTime: 0,
  phaseEndTime: 0,
  serverTime: 0,
  winnerId: null,
  players: new Map<string, Player>(),
  localPlayerId: null,
  zone: { center: { x: 0, y: 0 }, currentRadius: 100, targetRadius: 100 },
  powerUps: [],
  killFeed: [],
  playersAlive: 0,
  announcement: null,
};

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,

  setConnected: (connected, roomId) =>
    set({ isConnected: connected, roomId: roomId || null }),

  setPhase: (phase, startTime, endTime) =>
    set({
      phase,
      phaseStartTime: startTime || Date.now(),
      phaseEndTime: endTime || 0,
    }),

  setLocalPlayerId: (id) => set({ localPlayerId: id }),

  updatePlayer: (sessionId, updates) =>
    set((state) => {
      const players = new Map(state.players);
      const player = players.get(sessionId);
      if (player) {
        players.set(sessionId, { ...player, ...updates });
      }
      return { players };
    }),

  removePlayer: (sessionId) =>
    set((state) => {
      const players = new Map(state.players);
      players.delete(sessionId);
      return { players };
    }),

  setPlayers: (update) => set((state) => {
    const players = typeof update === 'function' ? update(state.players) : update;
    return { players };
  }),

  setZone: (zone) => set({ zone }),

  addKillFeedEntry: (entry) =>
    set((state) => ({
      killFeed: [...state.killFeed.slice(-9), entry],
    })),

  setPlayersAlive: (count) => set({ playersAlive: count }),

  setAnnouncement: (message) => set({ announcement: message }),

  setWinnerId: (id) => set({ winnerId: id }),

  reset: () => set(initialState),
}));

// Selectors
export const selectLocalPlayer = (state: GameState) =>
  state.localPlayerId ? state.players.get(state.localPlayerId) : null;

export const selectIsPlaying = (state: GameState) =>
  state.phase === 'playing' || state.phase === 'suddenFace';

export const selectIsMatchEnded = (state: GameState) =>
  state.phase === 'ended';
