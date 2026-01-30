/**
 * Ability Configurations for FaceRoyale
 * All abilities triggered by facial expressions
 */

import type { AbilityConfig, AbilityId } from '../types';

export const ABILITIES: Record<AbilityId, AbilityConfig> = {
  screamAttack: {
    id: 'screamAttack',
    name: 'Scream Attack',
    description: 'Open your mouth wide to blast enemies in a cone',
    damage: 15,
    range: 12, // meters
    cooldown: 3000, // 3 seconds
    fatiguePenalty: 0.15,
    effectType: 'cone',
    coneAngle: 45, // degrees
  },

  shieldBurst: {
    id: 'shieldBurst',
    name: 'Shield Burst',
    description: 'Raise your eyebrows to generate a protective shield',
    damage: 0,
    range: 0,
    cooldown: 8000, // 8 seconds
    fatiguePenalty: 0.1,
    effectType: 'self',
    effectValue: 25, // Shield amount
  },

  intimidate: {
    id: 'intimidate',
    name: 'Intimidate',
    description: 'Furrow your brows to slow all nearby enemies',
    damage: 0,
    range: 15, // meters
    cooldown: 10000, // 10 seconds
    fatiguePenalty: 0.12,
    effectType: 'aoe',
    duration: 3000, // 3 second slow
    effectValue: 0.3, // 30% slow
  },

  charm: {
    id: 'charm',
    name: 'Charm',
    description: 'Smile to confuse a single target, inverting their controls',
    damage: 0,
    range: 10, // meters
    cooldown: 12000, // 12 seconds
    fatiguePenalty: 0.15,
    effectType: 'single',
    duration: 2000, // 2 second confuse
  },

  explosivePush: {
    id: 'explosivePush',
    name: 'Explosive Push',
    description: 'Puff your cheeks to knock back all nearby enemies',
    damage: 10,
    range: 8, // meters
    cooldown: 5000, // 5 seconds
    fatiguePenalty: 0.12,
    effectType: 'aoe',
    effectValue: 10, // Knockback distance in meters
  },

  quickStrike: {
    id: 'quickStrike',
    name: 'Quick Strike',
    description: 'Blink quickly to land a fast hit on the nearest enemy',
    damage: 8,
    range: 6, // meters
    cooldown: 2000, // 2 seconds
    fatiguePenalty: 0.1,
    effectType: 'single',
  },

  meditate: {
    id: 'meditate',
    name: 'Meditate',
    description: 'Hold a neutral face for 2 seconds to heal',
    damage: 0,
    range: 0,
    cooldown: 15000, // 15 seconds
    fatiguePenalty: 0.05,
    effectType: 'self',
    effectValue: 5, // Heal amount
    duration: 2000, // Hold time required
  },

  dodge: {
    id: 'dodge',
    name: 'Dodge',
    description: 'Tilt your head to dash in that direction',
    damage: 0,
    range: 10, // Dash distance in meters
    cooldown: 1000, // 1 second
    fatiguePenalty: 0.05,
    effectType: 'self',
  },
};

/**
 * Get ability by ID with null safety
 */
export function getAbility(id: AbilityId): AbilityConfig {
  return ABILITIES[id];
}

/**
 * Calculate damage with intensity and fatigue modifiers
 */
export function calculateDamage(
  ability: AbilityConfig,
  intensity: number,
  fatigue: number
): number {
  if (ability.damage === 0) return 0;

  // Intensity scales from 0.7x at 0.3 to 1.5x at 1.0
  const intensityMultiplier = 0.7 + (intensity - 0.3) * (0.8 / 0.7);

  // Fatigue reduces effectiveness
  const fatigueMultiplier = 1 - fatigue;

  return Math.round(
    ability.damage * intensityMultiplier * fatigueMultiplier
  );
}

/**
 * Calculate range with intensity modifier
 */
export function calculateRange(
  ability: AbilityConfig,
  intensity: number
): number {
  if (ability.range === 0) return 0;

  // Intensity scales range from 0.8x at 0.3 to 1.2x at 1.0
  const intensityMultiplier = 0.8 + (intensity - 0.3) * (0.4 / 0.7);

  return ability.range * intensityMultiplier;
}
