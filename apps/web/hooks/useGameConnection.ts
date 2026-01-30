/**
 * Game Connection Hook
 * Manages Colyseus connection and state synchronization
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Client, Room } from 'colyseus.js';
import { useGameStore } from '@/stores/gameStore';
import { usePlayerStore } from '@/stores/playerStore';
import type { AbilityId, Vector2 } from '@faceroyale/game-core';

const GAME_SERVER_URL =
  process.env.NEXT_PUBLIC_GAME_SERVER_URL || 'ws://localhost:2567';

interface UseGameConnectionReturn {
  connect: () => Promise<void>;
  disconnect: () => void;
  sendMove: (direction: Vector2) => void;
  sendAbility: (abilityId: AbilityId, intensity: number) => void;
  sendDodge: (direction: Vector2) => void;
  sendEmote: (emoteId: string) => void;
  isConnected: boolean;
}

export function useGameConnection(): UseGameConnectionReturn {
  const clientRef = useRef<Client | null>(null);
  const roomRef = useRef<Room | null>(null);

  const { userId, username, avatarId } = usePlayerStore();
  const {
    setConnected,
    setPhase,
    setLocalPlayerId,
    setPlayers,
    updatePlayer,
    removePlayer,
    setZone,
    addKillFeedEntry,
    setPlayersAlive,
    setAnnouncement,
    reset,
    isConnected,
  } = useGameStore();

  const connect = useCallback(async () => {
    if (!userId || !username) {
      throw new Error('User not authenticated');
    }

    try {
      clientRef.current = new Client(GAME_SERVER_URL);

      roomRef.current = await clientRef.current.joinOrCreate('battle_royale', {
        userId,
        username,
        avatarId,
      });

      setConnected(true, roomRef.current.roomId);
      setLocalPlayerId(roomRef.current.sessionId);

      // Set up state listeners
      const room = roomRef.current;

      // Players
      room.state.players.onAdd((player: any, key: string) => {
        const playerData = {
          id: player.id,
          sessionId: player.sessionId,
          username: player.username,
          avatarId: player.avatarId,
          position: { x: player.position.x, y: player.position.y },
          rotation: player.rotation,
          health: player.health,
          shield: player.shield,
          isAlive: player.isAlive,
          isBot: player.isBot,
          kills: player.kills,
          damageDealt: player.damageDealt,
          cooldowns: new Map(player.cooldowns),
          fatigue: new Map(player.fatigue),
        };

        setPlayers((prev: Map<string, any>) => new Map(prev).set(key, playerData));

        // Listen for changes on this player
        player.onChange(() => {
          updatePlayer(key, {
            position: { x: player.position.x, y: player.position.y },
            rotation: player.rotation,
            health: player.health,
            shield: player.shield,
            isAlive: player.isAlive,
            kills: player.kills,
            damageDealt: player.damageDealt,
          });
        });
      });

      room.state.players.onRemove((_: any, key: string) => {
        removePlayer(key);
      });

      // Zone
      room.state.zone.onChange(() => {
        setZone({
          center: {
            x: room.state.zone.center.x,
            y: room.state.zone.center.y,
          },
          currentRadius: room.state.zone.currentRadius,
          targetRadius: room.state.zone.targetRadius,
        });
      });

      // Players alive count
      room.state.listen('playersAlive', (value: number) => {
        setPlayersAlive(value);
      });

      // Phase changes
      room.state.listen('phase', (value: string) => {
        setPhase(
          value as any,
          room.state.phaseStartTime,
          room.state.phaseEndTime
        );
      });

      // Message handlers
      room.onMessage('phaseChange', (msg: { phase: string; duration?: number }) => {
        setPhase(msg.phase as any);
        if (msg.phase === 'suddenFace') {
          setAnnouncement('SUDDEN FACE!');
          setTimeout(() => setAnnouncement(null), 3000);
        }
      });

      room.onMessage('elimination', (msg: any) => {
        addKillFeedEntry({
          killerId: msg.eliminatorId || '',
          killerName: msg.eliminatorName || 'Zone',
          victimId: msg.eliminatedId,
          victimName: msg.victimName,
          weapon: msg.weapon,
          timestamp: Date.now(),
        });
      });

      room.onMessage('announcement', (msg: { message: string }) => {
        setAnnouncement(msg.message);
        setTimeout(() => setAnnouncement(null), 3000);
      });

      room.onMessage('matchEnd', (msg: any) => {
        setPhase('ended');
        // Handle match end UI
        console.log('Match ended:', msg);
      });

      room.onMessage('zoneWarning', (msg: any) => {
        setAnnouncement('Zone shrinking!');
        setTimeout(() => setAnnouncement(null), 2000);
      });

      room.onError((code: number, message?: string) => {
        console.error('Room error:', code, message);
      });

      room.onLeave((code: number) => {
        console.log('Left room:', code);
        setConnected(false);
      });

      console.log('Connected to room:', room.roomId);
    } catch (error) {
      console.error('Failed to connect:', error);
      setConnected(false);
      throw error;
    }
  }, [userId, username, avatarId]);

  const disconnect = useCallback(() => {
    roomRef.current?.leave();
    roomRef.current = null;
    clientRef.current = null;
    reset();
  }, [reset]);

  const sendMove = useCallback((direction: Vector2) => {
    roomRef.current?.send('move', { direction, timestamp: Date.now() });
  }, []);

  const sendAbility = useCallback((abilityId: AbilityId, intensity: number) => {
    roomRef.current?.send('abilityTrigger', {
      abilityId,
      intensity,
      timestamp: Date.now(),
    });
  }, []);

  const sendDodge = useCallback((direction: Vector2) => {
    roomRef.current?.send('dodge', { direction, timestamp: Date.now() });
  }, []);

  const sendEmote = useCallback((emoteId: string) => {
    roomRef.current?.send('emote', { emoteId });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    sendMove,
    sendAbility,
    sendDodge,
    sendEmote,
    isConnected,
  };
}
