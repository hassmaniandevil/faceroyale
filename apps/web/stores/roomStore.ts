/**
 * Room Store
 * Manages game room state, creation, and joining
 */

import { create } from 'zustand';

export type RoomVisibility = 'public' | 'private';
export type RoomStatus = 'waiting' | 'starting' | 'in_game' | 'finished';

export interface RoomPlayer {
  id: string;
  username: string;
  avatarId: string;
  isHost: boolean;
  isReady: boolean;
  joinedAt: number;
}

export interface Room {
  id: string;
  code: string; // 6-character invite code
  name: string;
  hostId: string;
  visibility: RoomVisibility;
  maxPlayers: number;
  minPlayers: number;
  players: RoomPlayer[];
  status: RoomStatus;
  createdAt: number;
  settings: RoomSettings;
}

export interface RoomSettings {
  roundDuration: number; // seconds per round
  eliminationCount: number; // players eliminated per round
  powerupsEnabled: boolean;
  spectatorMode: boolean;
}

interface RoomState {
  // Current room
  currentRoom: Room | null;
  isInRoom: boolean;
  isHost: boolean;

  // Room browsing
  publicRooms: Room[];
  isLoadingRooms: boolean;

  // Actions
  setCurrentRoom: (room: Room | null) => void;
  updateRoom: (updates: Partial<Room>) => void;
  addPlayer: (player: RoomPlayer) => void;
  removePlayer: (playerId: string) => void;
  updatePlayer: (playerId: string, updates: Partial<RoomPlayer>) => void;
  setPublicRooms: (rooms: Room[]) => void;
  setLoadingRooms: (loading: boolean) => void;
  leaveRoom: () => void;
  setPlayerReady: (playerId: string, ready: boolean) => void;
}

// Generate a random 6-character room code
export const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const useRoomStore = create<RoomState>((set, get) => ({
  // Initial state
  currentRoom: null,
  isInRoom: false,
  isHost: false,
  publicRooms: [],
  isLoadingRooms: false,

  // Actions
  setCurrentRoom: (room) =>
    set({
      currentRoom: room,
      isInRoom: room !== null,
      isHost: room?.hostId === get().currentRoom?.hostId,
    }),

  updateRoom: (updates) =>
    set((state) => ({
      currentRoom: state.currentRoom
        ? { ...state.currentRoom, ...updates }
        : null,
    })),

  addPlayer: (player) =>
    set((state) => ({
      currentRoom: state.currentRoom
        ? {
            ...state.currentRoom,
            players: [...state.currentRoom.players, player],
          }
        : null,
    })),

  removePlayer: (playerId) =>
    set((state) => ({
      currentRoom: state.currentRoom
        ? {
            ...state.currentRoom,
            players: state.currentRoom.players.filter((p) => p.id !== playerId),
          }
        : null,
    })),

  updatePlayer: (playerId, updates) =>
    set((state) => ({
      currentRoom: state.currentRoom
        ? {
            ...state.currentRoom,
            players: state.currentRoom.players.map((p) =>
              p.id === playerId ? { ...p, ...updates } : p
            ),
          }
        : null,
    })),

  setPublicRooms: (rooms) => set({ publicRooms: rooms }),

  setLoadingRooms: (loading) => set({ isLoadingRooms: loading }),

  leaveRoom: () =>
    set({
      currentRoom: null,
      isInRoom: false,
      isHost: false,
    }),

  setPlayerReady: (playerId, ready) =>
    set((state) => ({
      currentRoom: state.currentRoom
        ? {
            ...state.currentRoom,
            players: state.currentRoom.players.map((p) =>
              p.id === playerId ? { ...p, isReady: ready } : p
            ),
          }
        : null,
    })),
}));

// Selectors
export const selectCurrentRoom = (state: RoomState) => state.currentRoom;
export const selectIsInRoom = (state: RoomState) => state.isInRoom;
export const selectIsHost = (state: RoomState) => state.isHost;
export const selectPublicRooms = (state: RoomState) => state.publicRooms;
export const selectPlayerCount = (state: RoomState) =>
  state.currentRoom?.players.length ?? 0;
export const selectReadyCount = (state: RoomState) =>
  state.currentRoom?.players.filter((p) => p.isReady).length ?? 0;
export const selectCanStart = (state: RoomState) => {
  const room = state.currentRoom;
  if (!room) return false;
  const readyCount = room.players.filter((p) => p.isReady).length;
  return readyCount >= room.minPlayers;
};
