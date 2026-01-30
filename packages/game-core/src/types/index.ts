/**
 * Core Game Types for FaceRoyale
 * Shared between client and server
 */

// ============ Vector Types ============

export interface Vector2 {
  x: number;
  y: number;
}

// ============ Player Types ============

export interface Player {
  id: string;
  sessionId: string;
  username: string;
  avatarId: string;

  position: Vector2;
  rotation: number; // Facing direction in radians

  health: number; // 0-100
  shield: number; // 0-50

  isAlive: boolean;
  isBot: boolean;

  kills: number;
  damageDealt: number;
  eliminationTime: number; // When eliminated (for rankings)

  cooldowns: Record<string, number>; // Ability ID -> remaining cooldown ms
  fatigue: Record<string, number>; // Ability ID -> fatigue penalty 0-0.8
}

// ============ Zone Types ============

export interface Zone {
  center: Vector2;
  currentRadius: number;
  targetRadius: number;
  shrinkRate: number; // meters per second
  damagePerSecond: number;
}

// ============ Power-Up Types ============

export type PowerUpType = 'health' | 'shield' | 'speed' | 'megaExpression';

export interface PowerUp {
  id: string;
  type: PowerUpType;
  position: Vector2;
  isActive: boolean;
  respawnTime?: number;
}

// ============ Ability Types ============

export type AbilityId =
  | 'screamAttack'
  | 'shieldBurst'
  | 'intimidate'
  | 'charm'
  | 'explosivePush'
  | 'quickStrike'
  | 'meditate'
  | 'dodge';

export type AbilityEffectType = 'cone' | 'aoe' | 'single' | 'self';

export interface AbilityConfig {
  id: AbilityId;
  name: string;
  description: string;
  damage: number;
  range: number;
  cooldown: number; // ms
  fatiguePenalty: number;
  effectType: AbilityEffectType;
  coneAngle?: number; // For cone attacks, in degrees
  duration?: number; // For buffs/debuffs, in ms
  effectValue?: number; // For non-damage effects (slow %, heal amount, etc.)
}

export interface AbilityEffect {
  playerId: string;
  abilityId: AbilityId;
  position: Vector2;
  rotation: number;
  intensity: number; // 0-1, affects damage/range
  affectedPlayers: string[];
  timestamp: number;
}

// ============ Match Types ============

export type MatchPhase =
  | 'waiting'
  | 'countdown'
  | 'playing'
  | 'suddenFace'
  | 'ended';

export interface MatchConfig {
  maxPlayers: number;
  botFillEnabled: boolean;
  botFillDelay: number; // ms before bots are added

  arenaRadius: number; // Starting radius
  zoneShrinkStartTime: number; // ms after match start
  zoneShrinkInterval: number; // ms between shrink phases
  zoneDamagePerSecond: number;

  suddenFaceThreshold: number; // Players remaining to trigger
  suddenFaceCooldownReduction: number; // Multiplier (0.5 = 50% cooldowns)

  matchTimeLimit: number; // Max match duration ms
}

export interface MatchState {
  phase: MatchPhase;
  phaseStartTime: number;
  phaseEndTime: number;
  serverTime: number;

  players: Map<string, Player>;
  zone: Zone;
  powerUps: PowerUp[];

  playersAlive: number;
  winnerId: string | null;

  config: MatchConfig;
}

// ============ Event Types ============

export interface DamageEvent {
  targetId: string;
  sourceId: string | null;
  amount: number;
  type: 'ability' | 'zone';
  abilityId?: AbilityId;
  newHealth: number;
  newShield: number;
}

export interface EliminationEvent {
  eliminatedId: string;
  eliminatorId: string | null;
  placement: number;
  weapon: string; // Ability ID or 'zone'
}

export interface PowerUpCollectedEvent {
  powerUpId: string;
  playerId: string;
  type: PowerUpType;
}

export interface MatchEndEvent {
  winnerId: string | null;
  rankings: MatchRanking[];
}

export interface MatchRanking {
  playerId: string;
  username: string;
  placement: number;
  kills: number;
  damageDealt: number;
  survivalTime: number;
  xpEarned: number;
  coinsEarned: number;
}

// ============ Input Types ============

export interface MoveInput {
  direction: Vector2; // Normalized -1 to 1
  timestamp: number;
}

export interface FaceInput {
  expressions: import('@faceroyale/face-tracking').ExpressionState;
  headPose: import('@faceroyale/face-tracking').HeadPose;
  timestamp: number;
}

export interface AbilityInput {
  abilityId: AbilityId;
  intensity: number; // 0-1
  targetPosition?: Vector2; // For aimed abilities
  timestamp: number;
}

// ============ Bot Types ============

export type BotPersonality = 'aggressive' | 'defensive' | 'circler' | 'random';

export interface BotConfig {
  personality: BotPersonality;
  skillLevel: number; // 0.2-0.6, affects accuracy and reaction time
  reactionTimeMs: number; // 300-800ms
}
