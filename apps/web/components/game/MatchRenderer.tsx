'use client';

import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { useGameStore, selectLocalPlayer } from '@/stores/gameStore';

// Colors
const COLORS = {
  background: 0x1a1a2e,
  arena: 0x252536,
  arenaBorder: 0x35354a,
  zone: 0xff4444,
  zoneSafe: 0x44ff44,
  playerSelf: 0x00ff88,
  playerEnemy: 0xff4444,
  playerBot: 0xaaaaaa,
  powerUpHealth: 0x44ff44,
  powerUpShield: 0x4488ff,
  powerUpSpeed: 0xffff44,
  powerUpMega: 0xff44ff,
};

export function MatchRenderer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const playersRef = useRef<Map<string, PIXI.Container>>(new Map());
  const zoneRef = useRef<PIXI.Graphics | null>(null);
  const powerUpsRef = useRef<Map<string, PIXI.Graphics>>(new Map());

  const players = useGameStore((s) => s.players);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const zone = useGameStore((s) => s.zone);
  const powerUps = useGameStore((s) => s.powerUps);

  // Initialize PIXI
  useEffect(() => {
    if (!containerRef.current) return;

    const app = new PIXI.Application();

    app
      .init({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: COLORS.background,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      })
      .then(() => {
        containerRef.current?.appendChild(app.canvas);
        appRef.current = app;

        // Create arena
        const arena = new PIXI.Graphics();
        arena.circle(0, 0, 100);
        arena.fill({ color: COLORS.arena });
        arena.stroke({ color: COLORS.arenaBorder, width: 2 });
        app.stage.addChild(arena);

        // Create zone graphics
        const zoneGraphics = new PIXI.Graphics();
        app.stage.addChild(zoneGraphics);
        zoneRef.current = zoneGraphics;

        // Center stage
        app.stage.position.set(app.screen.width / 2, app.screen.height / 2);

        // Handle resize
        const handleResize = () => {
          app.renderer.resize(window.innerWidth, window.innerHeight);
          app.stage.position.set(app.screen.width / 2, app.screen.height / 2);
        };
        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
        };
      });

    return () => {
      app.destroy(true);
    };
  }, []);

  // Update camera to follow local player
  useEffect(() => {
    if (!appRef.current) return;

    const localPlayer = localPlayerId
      ? players.get(localPlayerId)
      : null;

    if (localPlayer) {
      // Smoothly move camera to follow player
      const scale = 4; // Zoom level
      appRef.current.stage.scale.set(scale);
      appRef.current.stage.position.set(
        appRef.current.screen.width / 2 - localPlayer.position.x * scale,
        appRef.current.screen.height / 2 - localPlayer.position.y * scale
      );
    }
  }, [players, localPlayerId]);

  // Update zone
  useEffect(() => {
    if (!zoneRef.current) return;

    const g = zoneRef.current;
    g.clear();

    // Draw zone circle
    g.circle(zone.center.x, zone.center.y, zone.currentRadius);
    g.stroke({ color: COLORS.zone, width: 2, alpha: 0.5 });

    // Draw zone fill (danger area is outside)
    // This is simplified - in full implementation you'd mask the outside area
  }, [zone]);

  // Update players
  useEffect(() => {
    if (!appRef.current) return;

    const stage = appRef.current.stage;

    // Remove players that left
    for (const [id, container] of playersRef.current) {
      if (!players.has(id)) {
        stage.removeChild(container);
        playersRef.current.delete(id);
      }
    }

    // Add/update players
    for (const [id, player] of players) {
      let container = playersRef.current.get(id);

      if (!container) {
        // Create new player
        container = new PIXI.Container();

        // Body
        const body = new PIXI.Graphics();
        const color =
          id === localPlayerId
            ? COLORS.playerSelf
            : player.isBot
            ? COLORS.playerBot
            : COLORS.playerEnemy;
        body.circle(0, 0, 3);
        body.fill({ color });
        container.addChild(body);

        // Health bar background
        const healthBg = new PIXI.Graphics();
        healthBg.rect(-4, -6, 8, 1.5);
        healthBg.fill({ color: 0x333333 });
        container.addChild(healthBg);

        // Health bar fill
        const healthBar = new PIXI.Graphics();
        healthBar.name = 'healthBar';
        container.addChild(healthBar);

        // Direction indicator
        const direction = new PIXI.Graphics();
        direction.name = 'direction';
        direction.moveTo(0, 0);
        direction.lineTo(4, 0);
        direction.stroke({ color: 0xffffff, width: 1 });
        container.addChild(direction);

        stage.addChild(container);
        playersRef.current.set(id, container);
      }

      // Update position
      container.position.set(player.position.x, player.position.y);
      container.visible = player.isAlive;

      // Update health bar
      const healthBar = container.getChildByName('healthBar') as PIXI.Graphics;
      if (healthBar) {
        healthBar.clear();
        const healthPercent = player.health / 100;
        const color = healthPercent > 0.5 ? 0x44ff44 : healthPercent > 0.25 ? 0xffff44 : 0xff4444;
        healthBar.rect(-4, -6, 8 * healthPercent, 1.5);
        healthBar.fill({ color });
      }

      // Update direction
      const direction = container.getChildByName('direction') as PIXI.Graphics;
      if (direction) {
        direction.rotation = player.rotation;
      }
    }
  }, [players, localPlayerId]);

  // Update power-ups
  useEffect(() => {
    if (!appRef.current) return;

    const stage = appRef.current.stage;

    // Remove collected power-ups
    for (const [id, graphics] of powerUpsRef.current) {
      const powerUp = powerUps.find((p) => p.id === id);
      if (!powerUp || !powerUp.isActive) {
        stage.removeChild(graphics);
        powerUpsRef.current.delete(id);
      }
    }

    // Add/update power-ups
    for (const powerUp of powerUps) {
      if (!powerUp.isActive) continue;

      let graphics = powerUpsRef.current.get(powerUp.id);

      if (!graphics) {
        graphics = new PIXI.Graphics();
        const color =
          powerUp.type === 'health'
            ? COLORS.powerUpHealth
            : powerUp.type === 'shield'
            ? COLORS.powerUpShield
            : powerUp.type === 'speed'
            ? COLORS.powerUpSpeed
            : COLORS.powerUpMega;

        graphics.circle(0, 0, 2);
        graphics.fill({ color });
        graphics.stroke({ color: 0xffffff, width: 0.5 });

        graphics.position.set(powerUp.position.x, powerUp.position.y);
        stage.addChild(graphics);
        powerUpsRef.current.set(powerUp.id, graphics);
      }
    }
  }, [powerUps]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
