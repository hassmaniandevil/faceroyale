/**
 * FaceRoyale Character Roster
 * 30 unique characters inspired by Clash of Clans + Among Us aesthetic
 * Bean-shaped bodies, simple features, distinctive costumes and colors
 */

export interface CharacterStats {
  health: number;      // 80-120 base HP
  speed: number;       // 0.8-1.2 movement multiplier
  power: number;       // 0.8-1.2 damage multiplier
  defense: number;     // 0.8-1.2 damage reduction
  ability: number;     // 0.8-1.2 ability effectiveness
}

export interface Character {
  id: string;
  name: string;
  title: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';

  // Visual
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  emoji: string;
  costume: string;

  // Stats
  stats: CharacterStats;

  // Special passive ability
  passive: {
    name: string;
    description: string;
    effect: string;
  };
}

export const CHARACTERS: Character[] = [
  // ============ COMMON (10) ============
  {
    id: 'blob_soldier',
    name: 'Blob Soldier',
    title: 'The Recruit',
    description: 'A basic bean trooper ready for battle. What they lack in special abilities, they make up for in determination.',
    rarity: 'common',
    primaryColor: '#4A90D9',
    secondaryColor: '#2E5A8C',
    accentColor: '#FFD700',
    emoji: '🫡',
    costume: 'military_helmet',
    stats: { health: 100, speed: 1.0, power: 1.0, defense: 1.0, ability: 1.0 },
    passive: {
      name: 'Basic Training',
      description: 'No special abilities',
      effect: 'none',
    },
  },
  {
    id: 'bean_scout',
    name: 'Bean Scout',
    title: 'The Swift',
    description: 'A speedy little bean with a propeller cap. Zooms around the arena like nobody\'s business.',
    rarity: 'common',
    primaryColor: '#7ED321',
    secondaryColor: '#4A7C1B',
    accentColor: '#FF6B6B',
    emoji: '🏃',
    costume: 'propeller_cap',
    stats: { health: 85, speed: 1.15, power: 0.9, defense: 0.85, ability: 1.0 },
    passive: {
      name: 'Quick Feet',
      description: '+15% movement speed',
      effect: 'speed_boost',
    },
  },
  {
    id: 'chonk',
    name: 'Chonk',
    title: 'The Thicc',
    description: 'An absolute unit of a bean. Slow but incredibly hard to knock out.',
    rarity: 'common',
    primaryColor: '#FF9F43',
    secondaryColor: '#CC7A33',
    accentColor: '#FFFFFF',
    emoji: '🐻',
    costume: 'sumo_belt',
    stats: { health: 120, speed: 0.8, power: 1.05, defense: 1.15, ability: 0.9 },
    passive: {
      name: 'Thick Skin',
      description: '+20 max HP, -20% speed',
      effect: 'tank',
    },
  },
  {
    id: 'pea_shooter',
    name: 'Pea Shooter',
    title: 'The Spitter',
    description: 'A green bean with a talent for ranged attacks. Projectiles go further.',
    rarity: 'common',
    primaryColor: '#2ECC71',
    secondaryColor: '#1E8449',
    accentColor: '#F1C40F',
    emoji: '🌱',
    costume: 'leaf_crown',
    stats: { health: 90, speed: 1.0, power: 1.1, defense: 0.9, ability: 1.05 },
    passive: {
      name: 'Long Range',
      description: '+15% projectile range',
      effect: 'range_boost',
    },
  },
  {
    id: 'brick',
    name: 'Brick',
    title: 'The Wall',
    description: 'A tough-looking red bean. Takes hits like a champion.',
    rarity: 'common',
    primaryColor: '#E74C3C',
    secondaryColor: '#922B21',
    accentColor: '#BDC3C7',
    emoji: '🧱',
    costume: 'construction_hat',
    stats: { health: 110, speed: 0.9, power: 0.95, defense: 1.2, ability: 0.9 },
    passive: {
      name: 'Fortified',
      description: '+20% damage reduction',
      effect: 'defense_boost',
    },
  },
  {
    id: 'sparky',
    name: 'Sparky',
    title: 'The Electric',
    description: 'A yellow bean crackling with energy. Abilities charge faster.',
    rarity: 'common',
    primaryColor: '#F1C40F',
    secondaryColor: '#D4AC0D',
    accentColor: '#3498DB',
    emoji: '⚡',
    costume: 'lightning_bolt',
    stats: { health: 90, speed: 1.05, power: 1.0, defense: 0.9, ability: 1.15 },
    passive: {
      name: 'Energized',
      description: '-15% ability cooldowns',
      effect: 'cooldown_reduction',
    },
  },
  {
    id: 'shadow_bean',
    name: 'Shadow Bean',
    title: 'The Sneaky',
    description: 'A dark, mysterious bean. Hard to track on the minimap.',
    rarity: 'common',
    primaryColor: '#2C3E50',
    secondaryColor: '#1A252F',
    accentColor: '#9B59B6',
    emoji: '🌑',
    costume: 'ninja_mask',
    stats: { health: 85, speed: 1.1, power: 1.05, defense: 0.85, ability: 1.0 },
    passive: {
      name: 'Low Profile',
      description: 'Smaller radar signature',
      effect: 'stealth',
    },
  },
  {
    id: 'pinky',
    name: 'Pinky',
    title: 'The Charmer',
    description: 'An adorable pink bean. Charm ability lasts longer.',
    rarity: 'common',
    primaryColor: '#FF69B4',
    secondaryColor: '#DB7093',
    accentColor: '#FFD700',
    emoji: '💕',
    costume: 'heart_antenna',
    stats: { health: 90, speed: 1.0, power: 0.9, defense: 0.95, ability: 1.15 },
    passive: {
      name: 'Heartbreaker',
      description: '+20% charm duration',
      effect: 'charm_boost',
    },
  },
  {
    id: 'rocky',
    name: 'Rocky',
    title: 'The Boulder',
    description: 'A grey, stone-textured bean. Knockback resistant.',
    rarity: 'common',
    primaryColor: '#7F8C8D',
    secondaryColor: '#566573',
    accentColor: '#E67E22',
    emoji: '🪨',
    costume: 'rock_pattern',
    stats: { health: 105, speed: 0.85, power: 1.0, defense: 1.1, ability: 0.95 },
    passive: {
      name: 'Immovable',
      description: '-30% knockback received',
      effect: 'knockback_resist',
    },
  },
  {
    id: 'mint',
    name: 'Mint',
    title: 'The Fresh',
    description: 'A cool cyan bean. Regenerates health slowly over time.',
    rarity: 'common',
    primaryColor: '#1ABC9C',
    secondaryColor: '#16A085',
    accentColor: '#FFFFFF',
    emoji: '🍃',
    costume: 'leaf_headband',
    stats: { health: 95, speed: 1.0, power: 0.95, defense: 1.0, ability: 1.05 },
    passive: {
      name: 'Refreshing',
      description: 'Regen 1 HP every 3 seconds',
      effect: 'regen',
    },
  },

  // ============ RARE (10) ============
  {
    id: 'captain_bean',
    name: 'Captain Bean',
    title: 'The Leader',
    description: 'A heroic bean with a cape. Inspires nearby allies with a damage boost aura.',
    rarity: 'rare',
    primaryColor: '#3498DB',
    secondaryColor: '#2980B9',
    accentColor: '#E74C3C',
    emoji: '🦸',
    costume: 'hero_cape',
    stats: { health: 100, speed: 1.0, power: 1.1, defense: 1.0, ability: 1.1 },
    passive: {
      name: 'Rally Cry',
      description: '+5% damage to nearby allies',
      effect: 'damage_aura',
    },
  },
  {
    id: 'frost_bean',
    name: 'Frost Bean',
    title: 'The Frozen',
    description: 'An icy blue bean with snowflake patterns. Attacks slow enemies.',
    rarity: 'rare',
    primaryColor: '#85C1E9',
    secondaryColor: '#5DADE2',
    accentColor: '#FFFFFF',
    emoji: '❄️',
    costume: 'ice_crown',
    stats: { health: 90, speed: 0.95, power: 1.05, defense: 1.0, ability: 1.15 },
    passive: {
      name: 'Chilling Touch',
      description: 'Attacks slow enemies by 10%',
      effect: 'slow_on_hit',
    },
  },
  {
    id: 'pyro_bean',
    name: 'Pyro Bean',
    title: 'The Inferno',
    description: 'A fiery red-orange bean engulfed in flames. Leaves fire trails.',
    rarity: 'rare',
    primaryColor: '#E74C3C',
    secondaryColor: '#FF6B35',
    accentColor: '#F1C40F',
    emoji: '🔥',
    costume: 'flame_hair',
    stats: { health: 85, speed: 1.05, power: 1.2, defense: 0.85, ability: 1.0 },
    passive: {
      name: 'Burning Path',
      description: 'Leave damaging fire when dashing',
      effect: 'fire_trail',
    },
  },
  {
    id: 'medic_bean',
    name: 'Medic Bean',
    title: 'The Healer',
    description: 'A white bean with a red cross. Meditation heals more.',
    rarity: 'rare',
    primaryColor: '#FFFFFF',
    secondaryColor: '#ECF0F1',
    accentColor: '#E74C3C',
    emoji: '⚕️',
    costume: 'nurse_hat',
    stats: { health: 95, speed: 1.0, power: 0.85, defense: 1.0, ability: 1.25 },
    passive: {
      name: 'First Aid',
      description: '+50% meditation healing',
      effect: 'heal_boost',
    },
  },
  {
    id: 'knight_bean',
    name: 'Knight Bean',
    title: 'The Armored',
    description: 'A bean in shining silver armor. Shield ability is stronger.',
    rarity: 'rare',
    primaryColor: '#BDC3C7',
    secondaryColor: '#7F8C8D',
    accentColor: '#F1C40F',
    emoji: '🛡️',
    costume: 'knight_helmet',
    stats: { health: 110, speed: 0.85, power: 1.0, defense: 1.2, ability: 1.1 },
    passive: {
      name: 'Iron Defense',
      description: '+25% shield strength',
      effect: 'shield_boost',
    },
  },
  {
    id: 'wizard_bean',
    name: 'Wizard Bean',
    title: 'The Arcane',
    description: 'A purple bean with a pointy hat. Abilities deal more damage.',
    rarity: 'rare',
    primaryColor: '#9B59B6',
    secondaryColor: '#7D3C98',
    accentColor: '#F1C40F',
    emoji: '🧙',
    costume: 'wizard_hat',
    stats: { health: 80, speed: 0.95, power: 1.25, defense: 0.8, ability: 1.2 },
    passive: {
      name: 'Arcane Power',
      description: '+25% ability damage',
      effect: 'ability_damage',
    },
  },
  {
    id: 'ninja_bean',
    name: 'Ninja Bean',
    title: 'The Silent',
    description: 'A black bean with a red headband. Dodge has shorter cooldown.',
    rarity: 'rare',
    primaryColor: '#17202A',
    secondaryColor: '#1C2833',
    accentColor: '#E74C3C',
    emoji: '🥷',
    costume: 'ninja_headband',
    stats: { health: 85, speed: 1.15, power: 1.1, defense: 0.85, ability: 1.1 },
    passive: {
      name: 'Shadow Step',
      description: '-30% dodge cooldown',
      effect: 'dodge_cooldown',
    },
  },
  {
    id: 'pirate_bean',
    name: 'Pirate Bean',
    title: 'The Buccaneer',
    description: 'An eyepatch-wearing bean. Finds more loot from eliminations.',
    rarity: 'rare',
    primaryColor: '#784212',
    secondaryColor: '#5D3408',
    accentColor: '#F1C40F',
    emoji: '🏴‍☠️',
    costume: 'pirate_hat',
    stats: { health: 100, speed: 1.0, power: 1.1, defense: 0.95, ability: 1.0 },
    passive: {
      name: 'Plunder',
      description: '+25% coins from eliminations',
      effect: 'loot_boost',
    },
  },
  {
    id: 'astronaut_bean',
    name: 'Astronaut Bean',
    title: 'The Spacer',
    description: 'A bean in a space helmet. Takes reduced zone damage.',
    rarity: 'rare',
    primaryColor: '#FFFFFF',
    secondaryColor: '#D5D8DC',
    accentColor: '#3498DB',
    emoji: '👨‍🚀',
    costume: 'space_helmet',
    stats: { health: 95, speed: 0.95, power: 1.0, defense: 1.1, ability: 1.0 },
    passive: {
      name: 'Life Support',
      description: '-40% zone damage',
      effect: 'zone_resist',
    },
  },
  {
    id: 'chef_bean',
    name: 'Chef Bean',
    title: 'The Gourmet',
    description: 'A bean with a chef hat. Health pickups are more effective.',
    rarity: 'rare',
    primaryColor: '#FFFFFF',
    secondaryColor: '#F8F9F9',
    accentColor: '#E74C3C',
    emoji: '👨‍🍳',
    costume: 'chef_hat',
    stats: { health: 100, speed: 1.0, power: 0.95, defense: 1.0, ability: 1.1 },
    passive: {
      name: 'Master Chef',
      description: '+50% healing from pickups',
      effect: 'pickup_heal',
    },
  },

  // ============ EPIC (7) ============
  {
    id: 'void_walker',
    name: 'Void Walker',
    title: 'The Dimension Shifter',
    description: 'A dark purple bean with cosmic patterns. Can briefly phase through attacks.',
    rarity: 'epic',
    primaryColor: '#4A235A',
    secondaryColor: '#1A1A2E',
    accentColor: '#BB8FCE',
    emoji: '🌌',
    costume: 'void_cloak',
    stats: { health: 85, speed: 1.1, power: 1.1, defense: 0.9, ability: 1.25 },
    passive: {
      name: 'Phase Shift',
      description: '10% chance to dodge any attack',
      effect: 'phase_dodge',
    },
  },
  {
    id: 'thunder_chief',
    name: 'Thunder Chief',
    title: 'The Storm Bringer',
    description: 'A gold and blue bean crackling with lightning. Stun abilities chain to nearby enemies.',
    rarity: 'epic',
    primaryColor: '#F1C40F',
    secondaryColor: '#3498DB',
    accentColor: '#FFFFFF',
    emoji: '⛈️',
    costume: 'storm_crown',
    stats: { health: 95, speed: 1.0, power: 1.15, defense: 0.95, ability: 1.2 },
    passive: {
      name: 'Chain Lightning',
      description: 'Stun jumps to 1 nearby enemy',
      effect: 'chain_stun',
    },
  },
  {
    id: 'crystal_guardian',
    name: 'Crystal Guardian',
    title: 'The Gemstone',
    description: 'A translucent crystalline bean. Reflects a portion of damage back.',
    rarity: 'epic',
    primaryColor: '#85C1E9',
    secondaryColor: '#D6EAF8',
    accentColor: '#F4D03F',
    emoji: '💎',
    costume: 'crystal_spikes',
    stats: { health: 100, speed: 0.9, power: 1.0, defense: 1.25, ability: 1.1 },
    passive: {
      name: 'Crystal Shell',
      description: 'Reflect 15% damage to attackers',
      effect: 'damage_reflect',
    },
  },
  {
    id: 'shadow_monarch',
    name: 'Shadow Monarch',
    title: 'The Dark Ruler',
    description: 'A black bean with glowing red eyes. Gains power from eliminations.',
    rarity: 'epic',
    primaryColor: '#1C1C1C',
    secondaryColor: '#2C2C2C',
    accentColor: '#E74C3C',
    emoji: '👹',
    costume: 'shadow_crown',
    stats: { health: 90, speed: 1.05, power: 1.15, defense: 0.9, ability: 1.15 },
    passive: {
      name: 'Soul Harvest',
      description: '+5% damage per elimination (max 25%)',
      effect: 'stacking_damage',
    },
  },
  {
    id: 'nature_spirit',
    name: 'Nature Spirit',
    title: 'The Forest Guardian',
    description: 'A green bean covered in leaves and vines. Heals while standing still.',
    rarity: 'epic',
    primaryColor: '#27AE60',
    secondaryColor: '#1E8449',
    accentColor: '#F4D03F',
    emoji: '🌿',
    costume: 'leaf_armor',
    stats: { health: 100, speed: 0.95, power: 0.95, defense: 1.1, ability: 1.2 },
    passive: {
      name: 'Photosynthesis',
      description: 'Heal 2 HP/sec when not moving',
      effect: 'stationary_heal',
    },
  },
  {
    id: 'mecha_bean',
    name: 'Mecha Bean',
    title: 'The Machine',
    description: 'A robotic bean with metal plating. Immune to slow effects.',
    rarity: 'epic',
    primaryColor: '#7F8C8D',
    secondaryColor: '#566573',
    accentColor: '#E74C3C',
    emoji: '🤖',
    costume: 'robot_armor',
    stats: { health: 110, speed: 0.9, power: 1.15, defense: 1.15, ability: 0.95 },
    passive: {
      name: 'Overclocked',
      description: 'Immune to slow effects',
      effect: 'slow_immune',
    },
  },
  {
    id: 'phoenix_bean',
    name: 'Phoenix Bean',
    title: 'The Reborn',
    description: 'A fiery orange bean with flaming wings. Revives once per match with 30% HP.',
    rarity: 'epic',
    primaryColor: '#E67E22',
    secondaryColor: '#D35400',
    accentColor: '#F1C40F',
    emoji: '🦅',
    costume: 'flame_wings',
    stats: { health: 85, speed: 1.1, power: 1.15, defense: 0.85, ability: 1.15 },
    passive: {
      name: 'Rebirth',
      description: 'Revive once with 30% HP',
      effect: 'revive',
    },
  },

  // ============ LEGENDARY (3) ============
  {
    id: 'cosmic_emperor',
    name: 'Cosmic Emperor',
    title: 'The Universal',
    description: 'A galaxy-patterned bean radiating cosmic energy. All stats slightly boosted.',
    rarity: 'legendary',
    primaryColor: '#1A1A2E',
    secondaryColor: '#16213E',
    accentColor: '#E94560',
    emoji: '🌟',
    costume: 'cosmic_crown',
    stats: { health: 105, speed: 1.05, power: 1.1, defense: 1.05, ability: 1.15 },
    passive: {
      name: 'Cosmic Balance',
      description: '+5% to all stats',
      effect: 'all_stats',
    },
  },
  {
    id: 'golden_king',
    name: 'Golden King',
    title: 'The Magnificent',
    description: 'A solid gold bean wearing a jeweled crown. Earns double coins.',
    rarity: 'legendary',
    primaryColor: '#F4D03F',
    secondaryColor: '#D4AC0D',
    accentColor: '#E74C3C',
    emoji: '👑',
    costume: 'royal_crown',
    stats: { health: 100, speed: 1.0, power: 1.1, defense: 1.1, ability: 1.1 },
    passive: {
      name: 'Midas Touch',
      description: 'Earn 2x coins from all sources',
      effect: 'double_coins',
    },
  },
  {
    id: 'chaos_lord',
    name: 'Chaos Lord',
    title: 'The Unpredictable',
    description: 'A multicolored swirling bean of pure chaos. Abilities have random bonus effects.',
    rarity: 'legendary',
    primaryColor: '#9B59B6',
    secondaryColor: '#E74C3C',
    accentColor: '#3498DB',
    emoji: '🎭',
    costume: 'chaos_mask',
    stats: { health: 95, speed: 1.05, power: 1.1, defense: 1.0, ability: 1.2 },
    passive: {
      name: 'Chaos Theory',
      description: '20% chance for abilities to deal 2x damage',
      effect: 'random_crit',
    },
  },
];

// Helper functions
export function getCharacterById(id: string): Character | undefined {
  return CHARACTERS.find(c => c.id === id);
}

export function getCharactersByRarity(rarity: Character['rarity']): Character[] {
  return CHARACTERS.filter(c => c.rarity === rarity);
}

export function getRandomCharacter(): Character {
  return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
}

export function getStarterCharacters(): Character[] {
  return CHARACTERS.filter(c =>
    ['blob_soldier', 'bean_scout', 'chonk', 'pea_shooter', 'brick'].includes(c.id)
  );
}

// Stats summary
export const CHARACTER_COUNT = {
  total: CHARACTERS.length,
  common: CHARACTERS.filter(c => c.rarity === 'common').length,
  rare: CHARACTERS.filter(c => c.rarity === 'rare').length,
  epic: CHARACTERS.filter(c => c.rarity === 'epic').length,
  legendary: CHARACTERS.filter(c => c.rarity === 'legendary').length,
};
