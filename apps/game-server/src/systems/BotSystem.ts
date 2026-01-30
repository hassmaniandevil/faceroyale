/**
 * Bot System for FaceRoyale
 * AI-controlled players to fill lobbies and ensure quick matchmaking
 */

import { GameState, Player, Vector2 } from '../schema/GameState';
import { ABILITIES } from '@faceroyale/game-core';

const BOT_NAMES = [
  'FaceSlapper',
  'GrinMaster',
  'BrowBeater',
  'SmileSassin',
  'CheekCrusher',
  'BlinkBandit',
  'PoutPunisher',
  'WinkWarrior',
  'SmirkSniper',
  'FrownFighter',
  'GiggleGladiator',
  'ScowlScout',
  'JawDropper',
  'EyeRoller',
  'LipReader',
  'NoseTwitcher',
  'ChinChamp',
  'ForeheadFury',
  'TempleTerminator',
  'CheekClapper',
];

type Personality = 'aggressive' | 'defensive' | 'circler' | 'random';

interface BotState {
  personality: Personality;
  skillLevel: number; // 0.2 - 0.6
  nextActionTime: number;
  targetId: string | null;
  wanderDirection: { x: number; y: number };
  wanderChangeTime: number;
}

export class BotSystem {
  private bots: Map<string, BotState> = new Map();

  spawnBots(
    state: GameState,
    count: number,
    getSpawnPosition: () => Vector2
  ): void {
    const shuffledNames = [...BOT_NAMES].sort(() => Math.random() - 0.5);

    for (let i = 0; i < count; i++) {
      const player = new Player();
      player.id = `bot_${i}_${Date.now()}`;
      player.sessionId = player.id;
      player.username = shuffledNames[i % shuffledNames.length];
      player.isBot = true;
      player.health = 100;
      player.isAlive = true;

      const pos = getSpawnPosition();
      player.position.x = pos.x;
      player.position.y = pos.y;

      state.players.set(player.sessionId, player);
      state.playersAlive++;

      const personalities: Personality[] = [
        'aggressive',
        'defensive',
        'circler',
        'random',
      ];

      this.bots.set(player.id, {
        personality: personalities[Math.floor(Math.random() * personalities.length)],
        skillLevel: 0.2 + Math.random() * 0.4,
        nextActionTime: Date.now() + Math.random() * 2000,
        targetId: null,
        wanderDirection: { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 },
        wanderChangeTime: Date.now() + 2000 + Math.random() * 3000,
      });
    }
  }

  update(state: GameState, deltaMs: number): void {
    for (const [botId, botState] of this.bots) {
      const player = [...state.players.values()].find((p) => p.id === botId);
      if (!player?.isAlive) {
        this.bots.delete(botId);
        continue;
      }

      // Update movement
      this.moveBot(player, state, botState, deltaMs);

      // Update combat
      if (Date.now() > botState.nextActionTime) {
        this.botAction(player, state, botState);
        botState.nextActionTime =
          Date.now() + 1000 + Math.random() * 2000 / botState.skillLevel;
      }
    }
  }

  private moveBot(
    bot: Player,
    state: GameState,
    botState: BotState,
    deltaMs: number
  ): void {
    const speed = 4.5 * (deltaMs / 1000);
    const target = this.findTarget(bot, state, botState);

    let dx = 0;
    let dy = 0;

    // Check if outside zone
    const zoneCenter = state.zone.center;
    const zoneRadius = state.zone.currentRadius;
    const distFromCenter = Math.sqrt(
      Math.pow(bot.position.x - zoneCenter.x, 2) +
        Math.pow(bot.position.y - zoneCenter.y, 2)
    );

    // Priority: Stay in zone
    if (distFromCenter > zoneRadius * 0.8) {
      dx = zoneCenter.x - bot.position.x;
      dy = zoneCenter.y - bot.position.y;
    } else {
      // Personality-based movement
      switch (botState.personality) {
        case 'aggressive':
          if (target) {
            dx = target.position.x - bot.position.x;
            dy = target.position.y - bot.position.y;
          } else {
            dx = botState.wanderDirection.x;
            dy = botState.wanderDirection.y;
          }
          break;

        case 'defensive':
          // Stay near center
          dx = zoneCenter.x - bot.position.x;
          dy = zoneCenter.y - bot.position.y;
          // Add some randomness
          dx += botState.wanderDirection.x * 0.3;
          dy += botState.wanderDirection.y * 0.3;
          break;

        case 'circler':
          if (target) {
            // Circle around target
            const toTarget = {
              x: target.position.x - bot.position.x,
              y: target.position.y - bot.position.y,
            };
            const dist = Math.sqrt(
              toTarget.x * toTarget.x + toTarget.y * toTarget.y
            );

            if (dist < 15) {
              // Circle when close
              dx = -toTarget.y / dist;
              dy = toTarget.x / dist;
              // Slightly approach
              dx += toTarget.x / dist * 0.3;
              dy += toTarget.y / dist * 0.3;
            } else {
              // Approach when far
              dx = toTarget.x;
              dy = toTarget.y;
            }
          } else {
            dx = botState.wanderDirection.x;
            dy = botState.wanderDirection.y;
          }
          break;

        case 'random':
          // Change direction periodically
          if (Date.now() > botState.wanderChangeTime) {
            botState.wanderDirection = {
              x: Math.random() * 2 - 1,
              y: Math.random() * 2 - 1,
            };
            botState.wanderChangeTime = Date.now() + 2000 + Math.random() * 3000;
          }
          dx = botState.wanderDirection.x;
          dy = botState.wanderDirection.y;
          break;
      }
    }

    // Normalize and apply
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag > 0) {
      bot.position.x += (dx / mag) * speed;
      bot.position.y += (dy / mag) * speed;
      bot.rotation = Math.atan2(dy, dx);
    }

    // Clamp to arena
    const maxBound = 100;
    bot.position.x = Math.max(-maxBound, Math.min(maxBound, bot.position.x));
    bot.position.y = Math.max(-maxBound, Math.min(maxBound, bot.position.y));
  }

  private botAction(bot: Player, state: GameState, botState: BotState): void {
    const target = this.findTarget(bot, state, botState);
    if (!target) return;

    const dist = Math.sqrt(
      Math.pow(target.position.x - bot.position.x, 2) +
        Math.pow(target.position.y - bot.position.y, 2)
    );

    // Choose ability based on distance and skill
    const roll = Math.random();

    // Low health? Try to heal or shield
    if (bot.health < 30 && roll < botState.skillLevel) {
      const shieldCooldown = bot.cooldowns.get('shieldBurst') || 0;
      if (shieldCooldown <= 0) {
        this.triggerAbility(bot, state, 'shieldBurst', 0.8);
        return;
      }
    }

    // Attack based on distance
    if (dist < 6 && roll < botState.skillLevel) {
      // Close range - quick strike
      const cooldown = bot.cooldowns.get('quickStrike') || 0;
      if (cooldown <= 0) {
        this.triggerAbility(bot, state, 'quickStrike', 0.5 + Math.random() * 0.3);
        return;
      }
    }

    if (dist < 12 && roll < botState.skillLevel * 0.8) {
      // Medium range - scream attack
      const cooldown = bot.cooldowns.get('screamAttack') || 0;
      if (cooldown <= 0) {
        this.triggerAbility(bot, state, 'screamAttack', 0.6 + Math.random() * 0.3);
        return;
      }
    }

    if (dist < 8 && roll < botState.skillLevel * 0.6) {
      // AoE range - explosive push
      const cooldown = bot.cooldowns.get('explosivePush') || 0;
      if (cooldown <= 0) {
        this.triggerAbility(bot, state, 'explosivePush', 0.65 + Math.random() * 0.2);
        return;
      }
    }

    // Crowd control occasionally
    if (dist < 15 && roll < botState.skillLevel * 0.3) {
      const cooldown = bot.cooldowns.get('intimidate') || 0;
      if (cooldown <= 0) {
        this.triggerAbility(bot, state, 'intimidate', 0.6 + Math.random() * 0.2);
        return;
      }
    }
  }

  private triggerAbility(
    bot: Player,
    state: GameState,
    abilityId: string,
    intensity: number
  ): void {
    const ability = ABILITIES[abilityId as keyof typeof ABILITIES];
    if (!ability) return;

    // Set cooldown
    bot.cooldowns.set(abilityId, ability.cooldown);

    // Note: Actual damage is handled by room when bot triggers are processed
    // This just sets up the state; the room would need to call handleAbility
  }

  private findTarget(
    bot: Player,
    state: GameState,
    botState: BotState
  ): Player | null {
    // Check if current target is still valid
    if (botState.targetId) {
      const currentTarget = [...state.players.values()].find(
        (p) => p.id === botState.targetId && p.isAlive
      );
      if (currentTarget) {
        const dist = this.distance(bot.position, currentTarget.position);
        if (dist < 30) {
          return currentTarget;
        }
      }
      botState.targetId = null;
    }

    // Find new target
    let nearest: Player | null = null;
    let minDist = Infinity;

    for (const player of state.players.values()) {
      if (player.id === bot.id || !player.isAlive) continue;

      const dist = this.distance(bot.position, player.position);
      if (dist < minDist) {
        minDist = dist;
        nearest = player;
      }
    }

    if (nearest && minDist < 50) {
      botState.targetId = nearest.id;
      return nearest;
    }

    return null;
  }

  private distance(
    a: { x: number; y: number },
    b: { x: number; y: number }
  ): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }
}
