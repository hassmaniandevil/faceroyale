/**
 * Battle Royale Room - Main Game Room
 * Handles 20-40 player matches with face-controlled combat
 */

import { Room, Client } from '@colyseus/core';
import {
  GameState,
  Player,
  Zone,
  PowerUp,
  Vector2,
  KillFeedEntry,
} from '../schema/GameState';
import {
  ABILITIES,
  distance,
  findAffectedPlayers,
  applyDamage,
  applyZoneDamage,
  applyKnockback,
  applyShield,
  applyHeal,
  calculateDamage,
  DEFAULT_MATCH_CONFIG,
} from '@faceroyale/game-core';
import { BotSystem } from '../systems/BotSystem';

interface RoomOptions {
  maxPlayers?: number;
  botFillEnabled?: boolean;
}

interface JoinOptions {
  userId: string;
  username: string;
  avatarId?: string;
}

export class BattleRoyaleRoom extends Room<GameState> {
  private tickRate = 20; // 20 ticks per second
  private matchStartDelay = 5000; // 5 second countdown
  private botSystem: BotSystem;
  private config = DEFAULT_MATCH_CONFIG;

  onCreate(options: RoomOptions) {
    this.maxClients = options.maxPlayers || 40;
    this.setState(new GameState());
    this.state.maxPlayers = this.maxClients;

    this.botSystem = new BotSystem();

    // Initialize zone at center
    this.state.zone.center.x = 0;
    this.state.zone.center.y = 0;
    this.state.zone.currentRadius = this.config.arenaRadius;
    this.state.zone.targetRadius = this.config.arenaRadius;
    this.state.zone.damagePerSecond = this.config.zoneDamagePerSecond;

    // Initialize power-up spawn points
    this.initializePowerUps();

    // Message handlers
    this.onMessage('move', this.handleMove.bind(this));
    this.onMessage('faceInput', this.handleFaceInput.bind(this));
    this.onMessage('abilityTrigger', this.handleAbility.bind(this));
    this.onMessage('dodge', this.handleDodge.bind(this));
    this.onMessage('emote', this.handleEmote.bind(this));

    // Game loop
    this.setSimulationInterval(() => this.update(), 1000 / this.tickRate);

    // Start match timer (wait for players or fill with bots)
    this.clock.setTimeout(() => this.tryStartMatch(), this.matchStartDelay);

    console.log(`Room ${this.roomId} created`);
  }

  onJoin(client: Client, options: JoinOptions) {
    console.log(`${options.username} joined room ${this.roomId}`);

    const player = new Player();
    player.id = options.userId;
    player.sessionId = client.sessionId;
    player.username = options.username;
    player.avatarId = options.avatarId || 'default';
    player.position = this.randomSpawn();
    player.health = 100;
    player.shield = 0;
    player.isAlive = true;

    this.state.players.set(client.sessionId, player);
    this.state.playersAlive++;

    // If match already started, spawn in safe zone
    if (this.state.phase === 'playing' || this.state.phase === 'suddenFace') {
      this.spawnInSafeZone(player);
    }
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    console.log(`${player.username} left room ${this.roomId}`);

    if (player.isAlive) {
      this.eliminate(player, null, 'disconnect');
    }
    this.state.players.delete(client.sessionId);
  }

  private update() {
    const dt = 1000 / this.tickRate;
    this.state.serverTime = Date.now();

    // Update cooldowns for all players
    this.updateCooldowns(dt);

    // Update debuffs
    this.updateDebuffs();

    if (this.state.phase === 'playing' || this.state.phase === 'suddenFace') {
      this.updateZone(dt);
      this.botSystem.update(this.state, dt);
      this.applyZoneDamageToPlayers(dt);
      this.updatePowerUps();
      this.checkCollisions();
      this.checkWin();

      // Trigger Sudden Face at threshold
      if (
        this.state.phase === 'playing' &&
        this.state.playersAlive <= this.config.suddenFaceThreshold
      ) {
        this.triggerSuddenFace();
      }
    }
  }

  private tryStartMatch() {
    const playerCount = this.state.players.size;

    // Fill with bots if enabled
    if (this.config.botFillEnabled && playerCount < this.maxClients) {
      const botsNeeded = Math.min(20, this.maxClients - playerCount);
      this.botSystem.spawnBots(this.state, botsNeeded, (pos) =>
        this.randomSpawn()
      );
    }

    // Start countdown
    this.state.phase = 'countdown';
    this.state.phaseStartTime = Date.now();
    this.state.phaseEndTime = Date.now() + 5000;

    this.broadcast('phaseChange', { phase: 'countdown', duration: 5000 });

    // Start match after countdown
    this.clock.setTimeout(() => this.startMatch(), 5000);
  }

  private startMatch() {
    this.state.phase = 'playing';
    this.state.phaseStartTime = Date.now();
    this.state.matchStartTime = Date.now();
    this.state.zone.nextShrinkTime =
      Date.now() + this.config.zoneShrinkStartTime;

    this.broadcast('phaseChange', { phase: 'playing' });
    console.log(`Match started in room ${this.roomId}`);
  }

  private triggerSuddenFace() {
    this.state.phase = 'suddenFace';
    this.state.phaseStartTime = Date.now();

    // Reduce all cooldowns by 50%
    for (const [, player] of this.state.players) {
      for (const [abilityId, cooldown] of player.cooldowns) {
        player.cooldowns.set(
          abilityId,
          cooldown * this.config.suddenFaceCooldownReduction
        );
      }
    }

    // Accelerate zone shrinking
    this.state.zone.shrinkRate *= 2;

    this.broadcast('phaseChange', { phase: 'suddenFace' });
    this.broadcast('announcement', { message: 'SUDDEN FACE!' });
  }

  private handleMove(
    client: Client,
    msg: { direction: { x: number; y: number } }
  ) {
    const player = this.state.players.get(client.sessionId);
    if (!player?.isAlive) return;

    const dt = 1 / this.tickRate;
    let speed = 5; // Base speed in meters per second

    // Check for slow debuff
    if (player.slowEndTime > Date.now()) {
      speed *= 0.7; // 30% slow
    }

    // Check for speed boost
    if (player.speedBoostEndTime > Date.now()) {
      speed *= 1.3; // 30% speed boost
    }

    // Check for charm (inverted controls)
    let dx = msg.direction.x;
    let dy = msg.direction.y;
    if (player.charmEndTime > Date.now()) {
      dx = -dx;
      dy = -dy;
    }

    // Apply movement
    player.position.x += dx * speed * dt;
    player.position.y += dy * speed * dt;

    // Update rotation to face movement direction
    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      player.rotation = Math.atan2(dy, dx);
    }

    // Clamp to arena bounds
    const maxBound = this.config.arenaRadius;
    player.position.x = Math.max(-maxBound, Math.min(maxBound, player.position.x));
    player.position.y = Math.max(-maxBound, Math.min(maxBound, player.position.y));
  }

  private handleFaceInput(client: Client, msg: any) {
    // Face input is processed on client for latency
    // Server only receives ability triggers
  }

  private handleAbility(
    client: Client,
    msg: { abilityId: string; intensity: number; targetPosition?: { x: number; y: number } }
  ) {
    const player = this.state.players.get(client.sessionId);
    if (!player?.isAlive) return;

    const abilityId = msg.abilityId as keyof typeof ABILITIES;
    const ability = ABILITIES[abilityId];
    if (!ability) return;

    // Check cooldown
    const cooldown = player.cooldowns.get(msg.abilityId) || 0;
    if (cooldown > 0) return;

    // Calculate effectiveness with fatigue
    const fatigue = player.fatigue.get(msg.abilityId) || 0;
    const effectiveness = 1 - fatigue;
    const intensity = msg.intensity * effectiveness;

    // Mega expression doubles damage
    const damageMultiplier = player.hasMegaExpression ? 2 : 1;
    if (player.hasMegaExpression) {
      player.hasMegaExpression = false;
    }

    // Convert to Player type for game-core functions
    const playerData = this.schemaToPlayer(player);
    const playersMap = new Map<string, any>();
    for (const [key, p] of this.state.players) {
      playersMap.set(key, this.schemaToPlayer(p));
    }

    // Find affected players
    const affected = findAffectedPlayers(
      playerData,
      abilityId,
      intensity,
      playersMap
    );

    // Apply ability effects
    switch (abilityId) {
      case 'screamAttack':
      case 'quickStrike': {
        const damage = calculateDamage(ability, intensity, fatigue) * damageMultiplier;
        for (const target of affected) {
          const targetPlayer = this.state.players.get(target.sessionId);
          if (targetPlayer) {
            this.applyDamageToPlayer(targetPlayer, player, damage, abilityId);
          }
        }
        break;
      }

      case 'shieldBurst': {
        applyShield(playerData, ability.effectValue || 25);
        player.shield = playerData.shield;
        break;
      }

      case 'intimidate': {
        for (const target of affected) {
          const targetPlayer = this.state.players.get(target.sessionId);
          if (targetPlayer) {
            targetPlayer.slowEndTime = Date.now() + (ability.duration || 3000);
          }
        }
        break;
      }

      case 'charm': {
        if (affected.length > 0) {
          const target = this.state.players.get(affected[0].sessionId);
          if (target) {
            target.charmEndTime = Date.now() + (ability.duration || 2000);
          }
        }
        break;
      }

      case 'explosivePush': {
        const damage = calculateDamage(ability, intensity, fatigue) * damageMultiplier;
        for (const target of affected) {
          const targetPlayer = this.state.players.get(target.sessionId);
          if (targetPlayer) {
            this.applyDamageToPlayer(targetPlayer, player, damage, abilityId);
            // Apply knockback
            const knockback = ability.effectValue || 10;
            const dx = targetPlayer.position.x - player.position.x;
            const dy = targetPlayer.position.y - player.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
              targetPlayer.position.x += (dx / dist) * knockback;
              targetPlayer.position.y += (dy / dist) * knockback;
            }
          }
        }
        break;
      }

      case 'meditate': {
        applyHeal(playerData, ability.effectValue || 5);
        player.health = playerData.health;
        break;
      }
    }

    // Set cooldown (reduced in Sudden Face)
    let cooldownTime = ability.cooldown;
    if (this.state.phase === 'suddenFace') {
      cooldownTime *= this.config.suddenFaceCooldownReduction;
    }
    player.cooldowns.set(msg.abilityId, cooldownTime);

    // Update fatigue
    const newFatigue = Math.min(0.8, fatigue + ability.fatiguePenalty);
    player.fatigue.set(msg.abilityId, newFatigue);

    // Broadcast effect
    this.broadcast('abilityEffect', {
      playerId: player.id,
      abilityId: msg.abilityId,
      position: { x: player.position.x, y: player.position.y },
      rotation: player.rotation,
      intensity,
      affectedPlayers: affected.map((p) => p.id),
    });
  }

  private handleDodge(
    client: Client,
    msg: { direction: { x: number; y: number } }
  ) {
    const player = this.state.players.get(client.sessionId);
    if (!player?.isAlive) return;

    // Check dodge cooldown
    const cooldown = player.cooldowns.get('dodge') || 0;
    if (cooldown > 0) return;

    const dodgeDistance = 10; // meters
    const dx = msg.direction.x;
    const dy = msg.direction.y;
    const mag = Math.sqrt(dx * dx + dy * dy);

    if (mag > 0) {
      player.position.x += (dx / mag) * dodgeDistance;
      player.position.y += (dy / mag) * dodgeDistance;
    }

    player.cooldowns.set('dodge', 1000); // 1 second cooldown

    this.broadcast('dodge', {
      playerId: player.id,
      position: { x: player.position.x, y: player.position.y },
    });
  }

  private handleEmote(client: Client, msg: { emoteId: string }) {
    const player = this.state.players.get(client.sessionId);
    if (!player?.isAlive) return;

    this.broadcast('emote', {
      playerId: player.id,
      emoteId: msg.emoteId,
    });
  }

  private applyDamageToPlayer(
    target: Player,
    source: Player | null,
    amount: number,
    weapon: string
  ) {
    // Shield absorbs damage first
    const shieldDamage = Math.min(target.shield, amount);
    target.shield -= shieldDamage;
    const remainingDamage = amount - shieldDamage;

    // Then health
    target.health = Math.max(0, target.health - remainingDamage);

    if (source) {
      source.damageDealt += amount;
    }

    this.broadcast('damage', {
      targetId: target.id,
      sourceId: source?.id || null,
      amount,
      type: 'ability',
      newHealth: target.health,
      newShield: target.shield,
    });

    if (target.health <= 0) {
      this.eliminate(target, source, weapon);
    }
  }

  private eliminate(player: Player, killer: Player | null, cause: string) {
    player.isAlive = false;
    player.eliminationTime = Date.now();
    this.state.playersAlive--;

    if (killer) killer.kills++;

    const placement = this.state.playersAlive + 1;

    // Add to kill feed
    const entry = new KillFeedEntry();
    entry.killerId = killer?.id || '';
    entry.killerName = killer?.username || 'Zone';
    entry.victimId = player.id;
    entry.victimName = player.username;
    entry.weapon = cause;
    entry.timestamp = Date.now();
    this.state.killFeed.push(entry);

    // Keep only last 10 entries
    while (this.state.killFeed.length > 10) {
      this.state.killFeed.shift();
    }

    this.broadcast('elimination', {
      eliminatedId: player.id,
      eliminatorId: killer?.id || null,
      eliminatorName: killer?.username || null,
      victimName: player.username,
      placement,
      weapon: cause,
    });
  }

  private updateZone(dt: number) {
    const now = Date.now();

    // Check if it's time to shrink
    if (now >= this.state.zone.nextShrinkTime) {
      // Set new target radius
      const shrinkAmount = this.state.zone.currentRadius * 0.25; // Shrink by 25%
      this.state.zone.targetRadius = Math.max(
        10,
        this.state.zone.currentRadius - shrinkAmount
      );
      this.state.zone.shrinkRate = shrinkAmount / 30; // Shrink over 30 seconds
      this.state.zone.nextShrinkTime = now + this.config.zoneShrinkInterval;

      this.broadcast('zoneWarning', {
        targetRadius: this.state.zone.targetRadius,
        shrinkTime: 30000,
      });
    }

    // Gradually shrink zone
    if (this.state.zone.currentRadius > this.state.zone.targetRadius) {
      this.state.zone.currentRadius = Math.max(
        this.state.zone.targetRadius,
        this.state.zone.currentRadius - this.state.zone.shrinkRate * (dt / 1000)
      );
    }
  }

  private applyZoneDamageToPlayers(dt: number) {
    const zoneCenter = this.state.zone.center;
    const zoneRadius = this.state.zone.currentRadius;

    for (const [, player] of this.state.players) {
      if (!player.isAlive) continue;

      const distFromCenter = Math.sqrt(
        Math.pow(player.position.x - zoneCenter.x, 2) +
          Math.pow(player.position.y - zoneCenter.y, 2)
      );

      if (distFromCenter > zoneRadius) {
        const damage = Math.round(
          this.state.zone.damagePerSecond * (dt / 1000)
        );
        player.health = Math.max(0, player.health - damage);

        if (player.health <= 0) {
          this.eliminate(player, null, 'zone');
        }
      }
    }
  }

  private updateCooldowns(dt: number) {
    for (const [, player] of this.state.players) {
      for (const [abilityId, cooldown] of player.cooldowns) {
        if (cooldown > 0) {
          player.cooldowns.set(abilityId, Math.max(0, cooldown - dt));
        }
      }

      // Decay fatigue
      for (const [abilityId, fatigue] of player.fatigue) {
        if (fatigue > 0) {
          const decayRate = dt / 1000 / 30; // Decay over 30 seconds
          player.fatigue.set(abilityId, Math.max(0, fatigue - decayRate));
        }
      }
    }
  }

  private updateDebuffs() {
    const now = Date.now();
    for (const [, player] of this.state.players) {
      // Debuffs auto-expire based on endTime
      // Nothing to update here, just checking in movement/ability handlers
    }
  }

  private updatePowerUps() {
    const now = Date.now();

    // Respawn inactive power-ups
    for (const powerUp of this.state.powerUps) {
      if (!powerUp.isActive && powerUp.respawnTime > 0 && now >= powerUp.respawnTime) {
        powerUp.isActive = true;
        powerUp.respawnTime = 0;
      }
    }
  }

  private checkCollisions() {
    // Check player-powerup collisions
    for (const [, player] of this.state.players) {
      if (!player.isAlive) continue;

      for (const powerUp of this.state.powerUps) {
        if (!powerUp.isActive) continue;

        const dist = Math.sqrt(
          Math.pow(player.position.x - powerUp.position.x, 2) +
            Math.pow(player.position.y - powerUp.position.y, 2)
        );

        if (dist < 2) {
          // 2 meter pickup radius
          this.collectPowerUp(player, powerUp);
        }
      }
    }
  }

  private collectPowerUp(player: Player, powerUp: PowerUp) {
    switch (powerUp.type) {
      case 'health':
        player.health = Math.min(100, player.health + 25);
        break;
      case 'shield':
        player.shield = Math.min(50, player.shield + 25);
        break;
      case 'speed':
        player.speedBoostEndTime = Date.now() + 10000; // 10 second boost
        break;
      case 'megaExpression':
        player.hasMegaExpression = true;
        break;
    }

    powerUp.isActive = false;
    powerUp.respawnTime = Date.now() + 30000; // Respawn in 30 seconds

    this.broadcast('powerUpCollected', {
      powerUpId: powerUp.id,
      playerId: player.id,
      type: powerUp.type,
    });
  }

  private checkWin() {
    if (this.state.playersAlive <= 1 && this.state.phase !== 'ended') {
      const winner = [...this.state.players.values()].find((p) => p.isAlive);
      this.endMatch(winner);
    }
  }

  private endMatch(winner: Player | undefined) {
    this.state.phase = 'ended';
    this.state.winnerId = winner?.id || '';
    this.state.phaseEndTime = Date.now();

    const rankings = [...this.state.players.values()]
      .filter((p) => !p.isBot)
      .sort((a, b) => {
        if (a.isAlive !== b.isAlive) return a.isAlive ? -1 : 1;
        return b.eliminationTime - a.eliminationTime;
      })
      .map((p, i) => ({
        playerId: p.id,
        username: p.username,
        placement: i + 1,
        kills: p.kills,
        damageDealt: p.damageDealt,
        survivalTime: p.eliminationTime
          ? p.eliminationTime - this.state.matchStartTime
          : Date.now() - this.state.matchStartTime,
        xpEarned: this.calculateXP(i + 1, p.kills, p.damageDealt),
        coinsEarned: this.calculateCoins(i + 1, p.kills),
      }));

    this.broadcast('matchEnd', {
      winnerId: winner?.id,
      winnerName: winner?.username,
      rankings,
    });

    // Close room after delay
    this.clock.setTimeout(() => this.disconnect(), 10000);
  }

  private calculateXP(placement: number, kills: number, damage: number): number {
    let xp = 50; // Base XP for playing
    xp += Math.max(0, 40 - placement) * 5; // Placement bonus
    xp += kills * 20; // Kill bonus
    xp += Math.floor(damage / 10); // Damage bonus
    if (placement === 1) xp += 100; // Win bonus
    return xp;
  }

  private calculateCoins(placement: number, kills: number): number {
    let coins = 10; // Base coins
    if (placement <= 3) coins += 20;
    if (placement === 1) coins += 30;
    coins += kills * 5;
    return coins;
  }

  private initializePowerUps() {
    const powerUpTypes = ['health', 'shield', 'speed', 'megaExpression'];
    const spawnPoints = [
      { x: 50, y: 0 },
      { x: -50, y: 0 },
      { x: 0, y: 50 },
      { x: 0, y: -50 },
      { x: 35, y: 35 },
      { x: -35, y: 35 },
      { x: 35, y: -35 },
      { x: -35, y: -35 },
    ];

    for (let i = 0; i < spawnPoints.length; i++) {
      const powerUp = new PowerUp();
      powerUp.id = `powerup_${i}`;
      powerUp.type = powerUpTypes[i % powerUpTypes.length];
      powerUp.position.x = spawnPoints[i].x;
      powerUp.position.y = spawnPoints[i].y;
      powerUp.isActive = true;
      this.state.powerUps.push(powerUp);
    }
  }

  private randomSpawn(): Vector2 {
    const pos = new Vector2();
    const angle = Math.random() * Math.PI * 2;
    const radius = 70 + Math.random() * 20; // Spawn near edge
    pos.x = Math.cos(angle) * radius;
    pos.y = Math.sin(angle) * radius;
    return pos;
  }

  private spawnInSafeZone(player: Player) {
    const zoneRadius = this.state.zone.currentRadius;
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * (zoneRadius * 0.8); // Within 80% of zone
    player.position.x = this.state.zone.center.x + Math.cos(angle) * radius;
    player.position.y = this.state.zone.center.y + Math.sin(angle) * radius;
  }

  private schemaToPlayer(schema: Player): any {
    return {
      id: schema.id,
      sessionId: schema.sessionId,
      position: { x: schema.position.x, y: schema.position.y },
      rotation: schema.rotation,
      health: schema.health,
      shield: schema.shield,
      isAlive: schema.isAlive,
    };
  }
}
