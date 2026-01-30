/**
 * @faceroyale/game-core
 * Shared game logic for FaceRoyale battle royale
 */

// Types
export type {
  Vector2,
  Player,
  Zone,
  PowerUpType,
  PowerUp,
  AbilityId,
  AbilityEffectType,
  AbilityConfig,
  AbilityEffect,
  MatchPhase,
  MatchConfig,
  MatchState,
  DamageEvent,
  EliminationEvent,
  PowerUpCollectedEvent,
  MatchEndEvent,
  MatchRanking,
  MoveInput,
  FaceInput,
  AbilityInput,
  BotPersonality,
  BotConfig,
} from './types';

// Abilities
export {
  ABILITIES,
  getAbility,
  calculateDamage,
  calculateRange,
} from './abilities/config';

// Combat
export {
  distance,
  normalize,
  getDirection,
  isInCone,
  findAffectedPlayers,
  applyDamage,
  applyZoneDamage,
  applyKnockback,
  applyShield,
  applyHeal,
  isAlive,
} from './combat/damage';

// Characters
export {
  CHARACTERS,
  getCharacterById,
  getCharactersByRarity,
  getRandomCharacter,
  getStarterCharacters,
  type Character,
  type CharacterStats,
} from './characters/roster';

// Default match config
export const DEFAULT_MATCH_CONFIG: import('./types').MatchConfig = {
  maxPlayers: 30,
  botFillEnabled: true,
  botFillDelay: 5000, // 5 seconds

  arenaRadius: 100, // 100 meter radius
  zoneShrinkStartTime: 60000, // 1 minute before shrinking
  zoneShrinkInterval: 30000, // Shrink every 30 seconds
  zoneDamagePerSecond: 5,

  suddenFaceThreshold: 5, // Last 5 players
  suddenFaceCooldownReduction: 0.5, // 50% cooldowns

  matchTimeLimit: 240000, // 4 minutes max
};
