/**
 * Damage and Combat Resolution for FaceRoyale
 * Server-authoritative damage calculation
 */

import type {
  Player,
  AbilityEffect,
  DamageEvent,
  Vector2,
  AbilityId,
} from '../types';
import { ABILITIES, calculateDamage, calculateRange } from '../abilities/config';

/**
 * Calculate distance between two points
 */
export function distance(a: Vector2, b: Vector2): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * Normalize a vector
 */
export function normalize(v: Vector2): Vector2 {
  const mag = Math.sqrt(v.x * v.x + v.y * v.y);
  if (mag === 0) return { x: 0, y: 0 };
  return { x: v.x / mag, y: v.y / mag };
}

/**
 * Get angle from rotation in radians
 */
export function getDirection(rotation: number): Vector2 {
  return {
    x: Math.cos(rotation),
    y: Math.sin(rotation),
  };
}

/**
 * Check if target is within cone attack
 */
export function isInCone(
  source: Vector2,
  sourceRotation: number,
  target: Vector2,
  coneAngle: number, // degrees
  range: number
): boolean {
  // Check range first
  const dist = distance(source, target);
  if (dist > range) return false;

  // Calculate angle to target
  const toTarget = {
    x: target.x - source.x,
    y: target.y - source.y,
  };
  const angleToTarget = Math.atan2(toTarget.y, toTarget.x);

  // Normalize angles to [-PI, PI]
  let angleDiff = angleToTarget - sourceRotation;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

  // Check if within cone
  const halfCone = (coneAngle * Math.PI) / 180 / 2;
  return Math.abs(angleDiff) <= halfCone;
}

/**
 * Find players affected by an ability
 */
export function findAffectedPlayers(
  source: Player,
  abilityId: AbilityId,
  intensity: number,
  players: Map<string, Player>
): Player[] {
  const ability = ABILITIES[abilityId];
  if (!ability) return [];

  const range = calculateRange(ability, intensity);
  const affected: Player[] = [];

  for (const [, player] of players) {
    // Skip self and dead players
    if (player.id === source.id || !player.isAlive) continue;

    const dist = distance(source.position, player.position);

    switch (ability.effectType) {
      case 'cone':
        if (
          isInCone(
            source.position,
            source.rotation,
            player.position,
            ability.coneAngle || 45,
            range
          )
        ) {
          affected.push(player);
        }
        break;

      case 'aoe':
        if (dist <= range) {
          affected.push(player);
        }
        break;

      case 'single':
        // For single target, find closest in range
        if (dist <= range && affected.length === 0) {
          affected.push(player);
        } else if (dist <= range) {
          const currentDist = distance(source.position, affected[0].position);
          if (dist < currentDist) {
            affected[0] = player;
          }
        }
        break;

      case 'self':
        // No other players affected
        break;
    }
  }

  return affected;
}

/**
 * Apply damage to a player
 * Returns damage event for broadcasting
 */
export function applyDamage(
  target: Player,
  source: Player | null,
  amount: number,
  abilityId?: AbilityId
): DamageEvent {
  // Shield absorbs damage first
  const shieldDamage = Math.min(target.shield, amount);
  target.shield -= shieldDamage;
  const remainingDamage = amount - shieldDamage;

  // Then health
  target.health = Math.max(0, target.health - remainingDamage);

  // Track damage dealt for source
  if (source) {
    source.damageDealt += amount;
  }

  return {
    targetId: target.id,
    sourceId: source?.id || null,
    amount,
    type: 'ability',
    abilityId,
    newHealth: target.health,
    newShield: target.shield,
  };
}

/**
 * Apply zone damage to a player
 */
export function applyZoneDamage(
  target: Player,
  damagePerSecond: number,
  deltaSeconds: number
): DamageEvent {
  const damage = Math.round(damagePerSecond * deltaSeconds);
  target.health = Math.max(0, target.health - damage);

  return {
    targetId: target.id,
    sourceId: null,
    amount: damage,
    type: 'zone',
    newHealth: target.health,
    newShield: target.shield,
  };
}

/**
 * Apply knockback to a player
 */
export function applyKnockback(
  target: Player,
  source: Vector2,
  knockbackDistance: number
): void {
  const direction = normalize({
    x: target.position.x - source.x,
    y: target.position.y - source.y,
  });

  target.position.x += direction.x * knockbackDistance;
  target.position.y += direction.y * knockbackDistance;
}

/**
 * Apply shield to a player
 */
export function applyShield(target: Player, amount: number): void {
  target.shield = Math.min(50, target.shield + amount); // Max 50 shield
}

/**
 * Apply heal to a player
 */
export function applyHeal(target: Player, amount: number): void {
  target.health = Math.min(100, target.health + amount); // Max 100 HP
}

/**
 * Check if player is alive
 */
export function isAlive(player: Player): boolean {
  return player.health > 0 && player.isAlive;
}
