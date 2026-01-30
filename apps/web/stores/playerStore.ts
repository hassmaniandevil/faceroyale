/**
 * Player Store
 * Manages persistent player profile and authentication state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CalibrationData } from '@faceroyale/face-tracking';

interface PlayerProfile {
  level: number;
  totalXP: number;
  matchesPlayed: number;
  wins: number;
  eliminations: number;
  topTenFinishes: number;
}

interface PlayerState {
  // Auth
  userId: string | null;
  username: string | null;
  avatarId: string;
  isGuest: boolean;
  accessToken: string | null;
  refreshToken: string | null;

  // Profile
  profile: PlayerProfile | null;

  // Currency
  coins: number;
  gems: number;

  // Face tracking
  calibrationData: CalibrationData | null;
  hasCompletedCalibration: boolean;

  // Settings
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticEnabled: boolean;
  cameraPosition: 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight';

  // Actions
  setAuth: (data: {
    userId: string;
    username: string;
    accessToken: string;
    refreshToken: string;
    isGuest?: boolean;
  }) => void;
  clearAuth: () => void;
  setProfile: (profile: PlayerProfile) => void;
  setCurrency: (coins: number, gems: number) => void;
  addCurrency: (coins?: number, gems?: number) => void;
  setCalibrationData: (data: CalibrationData) => void;
  updateSettings: (settings: Partial<Pick<PlayerState, 'soundEnabled' | 'musicEnabled' | 'hapticEnabled' | 'cameraPosition'>>) => void;
  setAvatarId: (avatarId: string) => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set) => ({
      // Initial state
      userId: null,
      username: null,
      avatarId: 'default',
      isGuest: true,
      accessToken: null,
      refreshToken: null,
      profile: null,
      coins: 0,
      gems: 0,
      calibrationData: null,
      hasCompletedCalibration: false,
      soundEnabled: true,
      musicEnabled: true,
      hapticEnabled: true,
      cameraPosition: 'bottomLeft',

      // Actions
      setAuth: (data) =>
        set({
          userId: data.userId,
          username: data.username,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isGuest: data.isGuest ?? false,
        }),

      clearAuth: () =>
        set({
          userId: null,
          username: null,
          accessToken: null,
          refreshToken: null,
          isGuest: true,
          profile: null,
        }),

      setProfile: (profile) => set({ profile }),

      setCurrency: (coins, gems) => set({ coins, gems }),

      addCurrency: (coins = 0, gems = 0) =>
        set((state) => ({
          coins: state.coins + coins,
          gems: state.gems + gems,
        })),

      setCalibrationData: (data) =>
        set({
          calibrationData: data,
          hasCompletedCalibration: true,
        }),

      updateSettings: (settings) => set(settings),

      setAvatarId: (avatarId) => set({ avatarId }),
    }),
    {
      name: 'faceroyale-player',
      partialize: (state) => ({
        userId: state.userId,
        username: state.username,
        avatarId: state.avatarId,
        isGuest: state.isGuest,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        calibrationData: state.calibrationData,
        hasCompletedCalibration: state.hasCompletedCalibration,
        soundEnabled: state.soundEnabled,
        musicEnabled: state.musicEnabled,
        hapticEnabled: state.hapticEnabled,
        cameraPosition: state.cameraPosition,
      }),
    }
  )
);

// Selectors
export const selectIsAuthenticated = (state: PlayerState) =>
  state.userId !== null && state.accessToken !== null;

export const selectNeedsCalibration = (state: PlayerState) =>
  !state.hasCompletedCalibration;
