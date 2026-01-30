/**
 * Practice Game Hook
 * Manages local single-player battle royale against bots
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { CHARACTERS, getRandomCharacter } from '@faceroyale/game-core';
import type { Character } from '@faceroyale/game-core';

export interface Vector2 {
  x: number;
  y: number;
}

export interface GamePlayer {
  id: string;
  name: string;
  character: Character;
  position: Vector2;
  velocity: Vector2;
  rotation: number;
  health: number;
  maxHealth: number;
  shield: number;
  isAlive: boolean;
  isBot: boolean;
  kills: number;
  lastAbilityTime: Record<string, number>;
  effects: PlayerEffect[];
}

export interface PlayerEffect {
  type: 'damage' | 'heal' | 'shield' | 'stun' | 'slow';
  value: number;
  duration: number;
  startTime: number;
}

export interface Projectile {
  id: string;
  ownerId: string;
  position: Vector2;
  velocity: Vector2;
  damage: number;
  lifetime: number;
  startTime: number;
}

export interface GameZone {
  center: Vector2;
  currentRadius: number;
  targetRadius: number;
  shrinkSpeed: number;
  damagePerSecond: number;
}

export type GamePhase = 'waiting' | 'countdown' | 'playing' | 'ended';

export interface PracticeGameState {
  phase: GamePhase;
  players: GamePlayer[];
  projectiles: Projectile[];
  zone: GameZone;
  playersAlive: number;
  timeElapsed: number;
  winnerId: string | null;
  killFeed: KillFeedEntry[];
}

export interface KillFeedEntry {
  killerId: string;
  killerName: string;
  victimId: string;
  victimName: string;
  timestamp: number;
}

const ARENA_SIZE = 800;
const PLAYER_SIZE = 30;
const PLAYER_SPEED = 150;
const BOT_COUNT = 9;

const ABILITIES = {
  // Expression abilities
  roar: { damage: 18, range: 120, cooldown: 2000, cone: 60 },
  shield: { shieldAmount: 25, cooldown: 6000 },
  blast: { damage: 12, range: 100, knockback: 80, cooldown: 4000 },

  // Combo abilities
  fury: { damage: 25, speedBoost: 1.5, duration: 3000, cooldown: 10000, range: 80 },
  reflect: { shieldAmount: 40, reflectDamage: 15, cooldown: 12000 },
  megaBlast: { damage: 30, range: 150, knockback: 120, cooldown: 8000 },

  // Head movement abilities
  dashLeft: { distance: 80, cooldown: 800 },
  dashRight: { distance: 80, cooldown: 800 },
  leap: { invulnDuration: 500, cooldown: 3000 },
  stomp: { damage: 15, stunDuration: 1000, range: 60, cooldown: 5000 },

  // Legacy (for bots)
  scream: { damage: 18, range: 120, cooldown: 3000, cone: 60 },
  charm: { stunDuration: 2000, range: 80, cooldown: 12000 },
  quickStrike: { damage: 10, range: 60, cooldown: 2000 },
  meditate: { healAmount: 8, cooldown: 15000 },
  dodge: { distance: 100, cooldown: 1000 },
};

const BOT_NAMES = [
  'FaceBot', 'ExpressionAI', 'BrowMaster', 'SmileBot', 'ScreamKing',
  'CharmBot', 'BlastMachine', 'DodgeAI', 'ShieldBot', 'FuryBot',
  'NeutralAI', 'WinkMaster', 'PuffBot', 'GrimaceAI', 'SmirkBot',
];

function distance(a: Vector2, b: Vector2): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function normalize(v: Vector2): Vector2 {
  const mag = Math.sqrt(v.x * v.x + v.y * v.y);
  if (mag === 0) return { x: 0, y: 0 };
  return { x: v.x / mag, y: v.y / mag };
}

function angleTo(from: Vector2, to: Vector2): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

function isInCone(source: Vector2, rotation: number, target: Vector2, coneAngle: number, range: number): boolean {
  const dist = distance(source, target);
  if (dist > range) return false;

  const angleToTarget = angleTo(source, target);
  let angleDiff = angleToTarget - rotation;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

  return Math.abs(angleDiff) <= (coneAngle * Math.PI / 180 / 2);
}

function randomPosition(margin: number = 100): Vector2 {
  return {
    x: margin + Math.random() * (ARENA_SIZE - margin * 2),
    y: margin + Math.random() * (ARENA_SIZE - margin * 2),
  };
}

export function usePracticeGame() {
  const [gameState, setGameState] = useState<PracticeGameState>({
    phase: 'waiting',
    players: [],
    projectiles: [],
    zone: {
      center: { x: ARENA_SIZE / 2, y: ARENA_SIZE / 2 },
      currentRadius: ARENA_SIZE / 2,
      targetRadius: ARENA_SIZE / 2,
      shrinkSpeed: 0,
      damagePerSecond: 5,
    },
    playersAlive: 0,
    timeElapsed: 0,
    winnerId: null,
    killFeed: [],
  });

  const gameLoopRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const localPlayerIdRef = useRef<string>('local_player');

  const initializeGame = useCallback((playerName: string, selectedCharacter?: Character) => {
    const character = selectedCharacter || CHARACTERS[0];

    // Create local player
    const localPlayer: GamePlayer = {
      id: localPlayerIdRef.current,
      name: playerName,
      character,
      position: { x: ARENA_SIZE / 2, y: ARENA_SIZE / 2 },
      velocity: { x: 0, y: 0 },
      rotation: 0,
      health: character.stats.health,
      maxHealth: character.stats.health,
      shield: 0,
      isAlive: true,
      isBot: false,
      kills: 0,
      lastAbilityTime: {},
      effects: [],
    };

    // Create bots
    const bots: GamePlayer[] = [];
    const usedPositions: Vector2[] = [localPlayer.position];

    for (let i = 0; i < BOT_COUNT; i++) {
      const botCharacter = getRandomCharacter();
      let pos: Vector2;

      // Find position not too close to others
      do {
        pos = randomPosition();
      } while (usedPositions.some(p => distance(p, pos) < 100));

      usedPositions.push(pos);

      bots.push({
        id: `bot_${i}`,
        name: BOT_NAMES[i % BOT_NAMES.length],
        character: botCharacter,
        position: pos,
        velocity: { x: 0, y: 0 },
        rotation: Math.random() * Math.PI * 2,
        health: botCharacter.stats.health,
        maxHealth: botCharacter.stats.health,
        shield: 0,
        isAlive: true,
        isBot: true,
        kills: 0,
        lastAbilityTime: {},
        effects: [],
      });
    }

    setGameState({
      phase: 'countdown',
      players: [localPlayer, ...bots],
      projectiles: [],
      zone: {
        center: { x: ARENA_SIZE / 2, y: ARENA_SIZE / 2 },
        currentRadius: ARENA_SIZE / 2,
        targetRadius: ARENA_SIZE / 2,
        shrinkSpeed: 0,
        damagePerSecond: 5,
      },
      playersAlive: 1 + BOT_COUNT,
      timeElapsed: 0,
      winnerId: null,
      killFeed: [],
    });

    // Start countdown
    setTimeout(() => {
      setGameState(prev => ({ ...prev, phase: 'playing' }));
    }, 3000);
  }, []);

  const updatePlayerMovement = useCallback((direction: Vector2) => {
    setGameState(prev => {
      const players = prev.players.map(p => {
        if (p.id === localPlayerIdRef.current && p.isAlive) {
          const speed = PLAYER_SPEED * p.character.stats.speed;
          return {
            ...p,
            velocity: {
              x: direction.x * speed,
              y: direction.y * speed,
            },
            rotation: direction.x !== 0 || direction.y !== 0
              ? Math.atan2(direction.y, direction.x)
              : p.rotation,
          };
        }
        return p;
      });
      return { ...prev, players };
    });
  }, []);

  const triggerAbility = useCallback((ability: string, intensity: number = 1) => {
    const now = Date.now();

    setGameState(prev => {
      if (prev.phase !== 'playing') return prev;

      const localPlayer = prev.players.find(p => p.id === localPlayerIdRef.current);
      if (!localPlayer || !localPlayer.isAlive) return prev;

      const lastUse = localPlayer.lastAbilityTime[ability] || 0;
      const abilityConfig = ABILITIES[ability as keyof typeof ABILITIES];
      if (!abilityConfig) return prev;

      const cooldown = (abilityConfig as any).cooldown || 0;
      if (now - lastUse < cooldown) return prev;

      let newPlayers = [...prev.players];
      let newKillFeed = [...prev.killFeed];
      let newProjectiles = [...prev.projectiles];

      // Update cooldown
      const playerIndex = newPlayers.findIndex(p => p.id === localPlayerIdRef.current);
      newPlayers[playerIndex] = {
        ...newPlayers[playerIndex],
        lastAbilityTime: { ...newPlayers[playerIndex].lastAbilityTime, [ability]: now },
      };

      switch (ability) {
        // === EXPRESSION ABILITIES ===
        case 'roar':
        case 'scream': {
          const config = ability === 'roar' ? ABILITIES.roar : ABILITIES.scream;
          const damage = Math.round(config.damage * intensity * localPlayer.character.stats.power);

          newPlayers = newPlayers.map(p => {
            if (p.id === localPlayer.id || !p.isAlive) return p;

            if (isInCone(localPlayer.position, localPlayer.rotation, p.position, config.cone, config.range)) {
              const newHealth = Math.max(0, p.health - damage);
              if (newHealth <= 0 && p.isAlive) {
                newKillFeed.push({
                  killerId: localPlayer.id,
                  killerName: localPlayer.name,
                  victimId: p.id,
                  victimName: p.name,
                  timestamp: now,
                });
                newPlayers[playerIndex] = { ...newPlayers[playerIndex], kills: newPlayers[playerIndex].kills + 1 };
              }
              return { ...p, health: newHealth, isAlive: newHealth > 0 };
            }
            return p;
          });
          break;
        }

        case 'shield': {
          const config = ABILITIES.shield;
          newPlayers[playerIndex] = {
            ...newPlayers[playerIndex],
            shield: Math.min(50, newPlayers[playerIndex].shield + config.shieldAmount),
          };
          break;
        }

        case 'blast': {
          const config = ABILITIES.blast;
          const damage = Math.round(config.damage * intensity * localPlayer.character.stats.power);

          newPlayers = newPlayers.map(p => {
            if (p.id === localPlayer.id || !p.isAlive) return p;

            const dist = distance(localPlayer.position, p.position);
            if (dist <= config.range) {
              // Apply knockback
              const dir = normalize({
                x: p.position.x - localPlayer.position.x,
                y: p.position.y - localPlayer.position.y,
              });
              const newPos = {
                x: Math.max(0, Math.min(ARENA_SIZE, p.position.x + dir.x * config.knockback)),
                y: Math.max(0, Math.min(ARENA_SIZE, p.position.y + dir.y * config.knockback)),
              };
              const newHealth = Math.max(0, p.health - damage);
              if (newHealth <= 0 && p.isAlive) {
                newKillFeed.push({
                  killerId: localPlayer.id,
                  killerName: localPlayer.name,
                  victimId: p.id,
                  victimName: p.name,
                  timestamp: now,
                });
                newPlayers[playerIndex] = { ...newPlayers[playerIndex], kills: newPlayers[playerIndex].kills + 1 };
              }
              return { ...p, position: newPos, health: newHealth, isAlive: newHealth > 0 };
            }
            return p;
          });
          break;
        }

        case 'quickStrike': {
          const config = ABILITIES.quickStrike;
          const damage = Math.round(config.damage * intensity * localPlayer.character.stats.power);

          // Find closest enemy
          let closest: GamePlayer | null = null;
          let closestDist = Infinity;

          for (const p of newPlayers) {
            if (p.id === localPlayer.id || !p.isAlive) continue;
            const dist = distance(localPlayer.position, p.position);
            if (dist <= config.range && dist < closestDist) {
              closest = p;
              closestDist = dist;
            }
          }

          if (closest) {
            newPlayers = newPlayers.map(p => {
              if (p.id === closest!.id) {
                const newHealth = Math.max(0, p.health - damage);
                if (newHealth <= 0 && p.isAlive) {
                  newKillFeed.push({
                    killerId: localPlayer.id,
                    killerName: localPlayer.name,
                    victimId: p.id,
                    victimName: p.name,
                    timestamp: now,
                  });
                  newPlayers[playerIndex] = { ...newPlayers[playerIndex], kills: newPlayers[playerIndex].kills + 1 };
                }
                return { ...p, health: newHealth, isAlive: newHealth > 0 };
              }
              return p;
            });
          }
          break;
        }

        case 'meditate': {
          const config = ABILITIES.meditate;
          const heal = Math.round(config.healAmount * localPlayer.character.stats.ability);
          newPlayers[playerIndex] = {
            ...newPlayers[playerIndex],
            health: Math.min(newPlayers[playerIndex].maxHealth, newPlayers[playerIndex].health + heal),
          };
          break;
        }

        case 'dodge': {
          const config = ABILITIES.dodge;
          const dir = { x: Math.cos(localPlayer.rotation), y: Math.sin(localPlayer.rotation) };
          const newPos = {
            x: Math.max(0, Math.min(ARENA_SIZE, localPlayer.position.x + dir.x * config.distance)),
            y: Math.max(0, Math.min(ARENA_SIZE, localPlayer.position.y + dir.y * config.distance)),
          };
          newPlayers[playerIndex] = { ...newPlayers[playerIndex], position: newPos };
          break;
        }

        // === COMBO ABILITIES ===
        case 'fury': {
          const config = ABILITIES.fury;
          const damage = Math.round(config.damage * intensity * localPlayer.character.stats.power);

          // Deal damage to nearby enemies
          newPlayers = newPlayers.map(p => {
            if (p.id === localPlayer.id || !p.isAlive) return p;

            const dist = distance(localPlayer.position, p.position);
            if (dist <= config.range) {
              const newHealth = Math.max(0, p.health - damage);
              if (newHealth <= 0 && p.isAlive) {
                newKillFeed.push({
                  killerId: localPlayer.id,
                  killerName: localPlayer.name,
                  victimId: p.id,
                  victimName: p.name,
                  timestamp: now,
                });
                newPlayers[playerIndex] = { ...newPlayers[playerIndex], kills: newPlayers[playerIndex].kills + 1 };
              }
              return { ...p, health: newHealth, isAlive: newHealth > 0 };
            }
            return p;
          });
          break;
        }

        case 'reflect': {
          const config = ABILITIES.reflect;
          newPlayers[playerIndex] = {
            ...newPlayers[playerIndex],
            shield: Math.min(75, newPlayers[playerIndex].shield + config.shieldAmount),
          };
          break;
        }

        case 'megaBlast': {
          const config = ABILITIES.megaBlast;
          const damage = Math.round(config.damage * intensity * localPlayer.character.stats.power);

          newPlayers = newPlayers.map(p => {
            if (p.id === localPlayer.id || !p.isAlive) return p;

            const dist = distance(localPlayer.position, p.position);
            if (dist <= config.range) {
              const dir = normalize({
                x: p.position.x - localPlayer.position.x,
                y: p.position.y - localPlayer.position.y,
              });
              const newPos = {
                x: Math.max(0, Math.min(ARENA_SIZE, p.position.x + dir.x * config.knockback)),
                y: Math.max(0, Math.min(ARENA_SIZE, p.position.y + dir.y * config.knockback)),
              };
              const newHealth = Math.max(0, p.health - damage);
              if (newHealth <= 0 && p.isAlive) {
                newKillFeed.push({
                  killerId: localPlayer.id,
                  killerName: localPlayer.name,
                  victimId: p.id,
                  victimName: p.name,
                  timestamp: now,
                });
                newPlayers[playerIndex] = { ...newPlayers[playerIndex], kills: newPlayers[playerIndex].kills + 1 };
              }
              return { ...p, position: newPos, health: newHealth, isAlive: newHealth > 0 };
            }
            return p;
          });
          break;
        }

        // === HEAD MOVEMENT ABILITIES ===
        case 'dashLeft': {
          const config = ABILITIES.dashLeft;
          const newPos = {
            x: Math.max(0, localPlayer.position.x - config.distance),
            y: localPlayer.position.y,
          };
          newPlayers[playerIndex] = { ...newPlayers[playerIndex], position: newPos };
          break;
        }

        case 'dashRight': {
          const config = ABILITIES.dashRight;
          const newPos = {
            x: Math.min(ARENA_SIZE, localPlayer.position.x + config.distance),
            y: localPlayer.position.y,
          };
          newPlayers[playerIndex] = { ...newPlayers[playerIndex], position: newPos };
          break;
        }

        case 'leap': {
          // Leap gives brief invulnerability (handled by adding shield)
          newPlayers[playerIndex] = {
            ...newPlayers[playerIndex],
            shield: Math.min(100, newPlayers[playerIndex].shield + 20),
          };
          break;
        }

        case 'stomp': {
          const config = ABILITIES.stomp;
          const damage = Math.round(config.damage * localPlayer.character.stats.power);

          newPlayers = newPlayers.map(p => {
            if (p.id === localPlayer.id || !p.isAlive) return p;

            const dist = distance(localPlayer.position, p.position);
            if (dist <= config.range) {
              const newHealth = Math.max(0, p.health - damage);
              if (newHealth <= 0 && p.isAlive) {
                newKillFeed.push({
                  killerId: localPlayer.id,
                  killerName: localPlayer.name,
                  victimId: p.id,
                  victimName: p.name,
                  timestamp: now,
                });
                newPlayers[playerIndex] = { ...newPlayers[playerIndex], kills: newPlayers[playerIndex].kills + 1 };
              }
              return { ...p, health: newHealth, isAlive: newHealth > 0 };
            }
            return p;
          });
          break;
        }
      }

      const playersAlive = newPlayers.filter(p => p.isAlive).length;

      let phase: GamePhase = prev.phase;
      let winnerId = prev.winnerId;

      if (playersAlive <= 1) {
        phase = 'ended';
        const winner = newPlayers.find(p => p.isAlive);
        winnerId = winner?.id || null;
      }

      return {
        ...prev,
        players: newPlayers,
        projectiles: newProjectiles,
        killFeed: newKillFeed.slice(-10),
        playersAlive,
        phase,
        winnerId,
      };
    });
  }, []);

  // Game loop
  useEffect(() => {
    if (gameState.phase !== 'playing') return;

    const gameLoop = () => {
      const now = Date.now();
      const deltaTime = (now - lastUpdateRef.current) / 1000;
      lastUpdateRef.current = now;

      setGameState(prev => {
        if (prev.phase !== 'playing') return prev;

        let newPlayers = [...prev.players];
        let newKillFeed = [...prev.killFeed];
        let zone = { ...prev.zone };

        // Update zone
        const timeElapsed = prev.timeElapsed + deltaTime;
        if (timeElapsed > 30 && zone.targetRadius > 50) {
          zone.targetRadius = Math.max(50, ARENA_SIZE / 2 - (timeElapsed - 30) * 2);
        }
        if (zone.currentRadius > zone.targetRadius) {
          zone.currentRadius = Math.max(zone.targetRadius, zone.currentRadius - 30 * deltaTime);
        }

        // Update players
        newPlayers = newPlayers.map(player => {
          if (!player.isAlive) return player;

          // Move player
          let newPos = {
            x: player.position.x + player.velocity.x * deltaTime,
            y: player.position.y + player.velocity.y * deltaTime,
          };

          // Clamp to arena
          newPos.x = Math.max(0, Math.min(ARENA_SIZE, newPos.x));
          newPos.y = Math.max(0, Math.min(ARENA_SIZE, newPos.y));

          // Zone damage
          let health = player.health;
          const distFromCenter = distance(newPos, zone.center);
          if (distFromCenter > zone.currentRadius) {
            const damage = zone.damagePerSecond * deltaTime;
            health = Math.max(0, health - damage);
          }

          // Bot AI
          if (player.isBot) {
            const localPlayer = newPlayers.find(p => p.id === localPlayerIdRef.current);
            if (localPlayer && localPlayer.isAlive) {
              const distToPlayer = distance(player.position, localPlayer.position);

              // Move towards player if far, away if too close
              let targetPos = localPlayer.position;
              if (distToPlayer < 50) {
                // Run away
                const dir = normalize({
                  x: player.position.x - localPlayer.position.x,
                  y: player.position.y - localPlayer.position.y,
                });
                targetPos = {
                  x: player.position.x + dir.x * 100,
                  y: player.position.y + dir.y * 100,
                };
              } else if (distToPlayer > 150) {
                // Move closer
                targetPos = localPlayer.position;
              }

              // Also consider zone
              if (distFromCenter > zone.currentRadius - 50) {
                targetPos = zone.center;
              }

              const moveDir = normalize({
                x: targetPos.x - player.position.x,
                y: targetPos.y - player.position.y,
              });

              const botSpeed = PLAYER_SPEED * player.character.stats.speed * 0.7;
              const newVel = {
                x: moveDir.x * botSpeed,
                y: moveDir.y * botSpeed,
              };

              // Bot attacks
              const now = Date.now();
              if (distToPlayer < 100 && Math.random() < 0.02) {
                const lastScream = player.lastAbilityTime['scream'] || 0;
                if (now - lastScream > ABILITIES.scream.cooldown) {
                  // Bot uses scream
                  const damage = Math.round(ABILITIES.scream.damage * 0.7 * player.character.stats.power);
                  if (isInCone(player.position, player.rotation, localPlayer.position, ABILITIES.scream.cone, ABILITIES.scream.range)) {
                    const targetIndex = newPlayers.findIndex(p => p.id === localPlayerIdRef.current);
                    if (targetIndex !== -1) {
                      const target = newPlayers[targetIndex];
                      const newHealth = Math.max(0, target.health - damage);
                      newPlayers[targetIndex] = { ...target, health: newHealth, isAlive: newHealth > 0 };

                      if (newHealth <= 0 && target.isAlive) {
                        newKillFeed.push({
                          killerId: player.id,
                          killerName: player.name,
                          victimId: target.id,
                          victimName: target.name,
                          timestamp: now,
                        });
                      }
                    }
                  }
                  return {
                    ...player,
                    position: newPos,
                    velocity: newVel,
                    rotation: angleTo(player.position, localPlayer.position),
                    health,
                    isAlive: health > 0,
                    lastAbilityTime: { ...player.lastAbilityTime, scream: now },
                  };
                }
              }

              return {
                ...player,
                position: newPos,
                velocity: newVel,
                rotation: moveDir.x !== 0 || moveDir.y !== 0
                  ? Math.atan2(moveDir.y, moveDir.x)
                  : player.rotation,
                health,
                isAlive: health > 0,
              };
            }
          }

          return {
            ...player,
            position: newPos,
            health,
            isAlive: health > 0,
          };
        });

        // Check for eliminations from zone
        newPlayers.forEach((p, i) => {
          if (p.health <= 0 && p.isAlive) {
            newPlayers[i] = { ...p, isAlive: false };
            newKillFeed.push({
              killerId: 'zone',
              killerName: 'The Zone',
              victimId: p.id,
              victimName: p.name,
              timestamp: Date.now(),
            });
          }
        });

        const playersAlive = newPlayers.filter(p => p.isAlive).length;
        let phase: GamePhase = prev.phase;
        let winnerId = prev.winnerId;

        if (playersAlive <= 1) {
          phase = 'ended';
          const winner = newPlayers.find(p => p.isAlive);
          winnerId = winner?.id || null;
        }

        return {
          ...prev,
          players: newPlayers,
          zone,
          killFeed: newKillFeed.slice(-10),
          playersAlive,
          phase,
          winnerId,
          timeElapsed,
        };
      });

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    lastUpdateRef.current = Date.now();
    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState.phase]);

  const resetGame = useCallback(() => {
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
    setGameState({
      phase: 'waiting',
      players: [],
      projectiles: [],
      zone: {
        center: { x: ARENA_SIZE / 2, y: ARENA_SIZE / 2 },
        currentRadius: ARENA_SIZE / 2,
        targetRadius: ARENA_SIZE / 2,
        shrinkSpeed: 0,
        damagePerSecond: 5,
      },
      playersAlive: 0,
      timeElapsed: 0,
      winnerId: null,
      killFeed: [],
    });
  }, []);

  const getLocalPlayer = useCallback(() => {
    return gameState.players.find(p => p.id === localPlayerIdRef.current) || null;
  }, [gameState.players]);

  return {
    gameState,
    initializeGame,
    updatePlayerMovement,
    triggerAbility,
    resetGame,
    getLocalPlayer,
    localPlayerId: localPlayerIdRef.current,
    ARENA_SIZE,
  };
}
