/**
 * Colyseus State Schema for FaceRoyale
 * Server-authoritative game state synchronized to clients
 */

import { Schema, MapSchema, ArraySchema, type } from '@colyseus/schema';

export class Vector2 extends Schema {
  @type('number') x: number = 0;
  @type('number') y: number = 0;
}

export class Player extends Schema {
  @type('string') id: string = '';
  @type('string') sessionId: string = '';
  @type('string') username: string = '';
  @type('string') avatarId: string = 'default';

  @type(Vector2) position: Vector2 = new Vector2();
  @type('number') rotation: number = 0;

  @type('number') health: number = 100;
  @type('number') shield: number = 0;
  @type('boolean') isAlive: boolean = true;
  @type('boolean') isBot: boolean = false;

  @type('number') kills: number = 0;
  @type('number') damageDealt: number = 0;
  @type('number') eliminationTime: number = 0;

  @type({ map: 'number' }) cooldowns: MapSchema<number> = new MapSchema();
  @type({ map: 'number' }) fatigue: MapSchema<number> = new MapSchema();

  // Debuffs
  @type('number') slowEndTime: number = 0;
  @type('number') charmEndTime: number = 0;
  @type('number') speedBoostEndTime: number = 0;
  @type('boolean') hasMegaExpression: boolean = false;
}

export class Zone extends Schema {
  @type(Vector2) center: Vector2 = new Vector2();
  @type('number') currentRadius: number = 100;
  @type('number') targetRadius: number = 100;
  @type('number') shrinkRate: number = 0;
  @type('number') damagePerSecond: number = 5;
  @type('number') nextShrinkTime: number = 0;
}

export class PowerUp extends Schema {
  @type('string') id: string = '';
  @type('string') type: string = ''; // 'health' | 'shield' | 'speed' | 'megaExpression'
  @type(Vector2) position: Vector2 = new Vector2();
  @type('boolean') isActive: boolean = true;
  @type('number') respawnTime: number = 0;
}

export class KillFeedEntry extends Schema {
  @type('string') killerId: string = '';
  @type('string') killerName: string = '';
  @type('string') victimId: string = '';
  @type('string') victimName: string = '';
  @type('string') weapon: string = '';
  @type('number') timestamp: number = 0;
}

export class GameState extends Schema {
  @type('string') phase: string = 'waiting';
  // 'waiting' | 'countdown' | 'playing' | 'suddenFace' | 'ended'

  @type('number') phaseStartTime: number = 0;
  @type('number') phaseEndTime: number = 0;
  @type('number') serverTime: number = 0;
  @type('number') matchStartTime: number = 0;

  @type({ map: Player }) players: MapSchema<Player> = new MapSchema();
  @type(Zone) zone: Zone = new Zone();
  @type([PowerUp]) powerUps: ArraySchema<PowerUp> = new ArraySchema();
  @type([KillFeedEntry]) killFeed: ArraySchema<KillFeedEntry> = new ArraySchema();

  @type('number') playersAlive: number = 0;
  @type('number') maxPlayers: number = 40;
  @type('string') winnerId: string = '';
}
