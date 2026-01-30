'use client';

import { useRef, useEffect, memo } from 'react';
import type { PracticeGameState, GamePlayer, Vector2 } from '@/hooks/usePracticeGame';

interface GameCanvasProps {
  gameState: PracticeGameState;
  localPlayerId: string;
  arenaSize: number;
}

const PLAYER_RADIUS = 15;

function GameCanvasComponent({ gameState, localPlayerId, arenaSize }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    const displaySize = Math.min(window.innerWidth - 32, window.innerHeight - 300, 600);
    canvas.width = displaySize * dpr;
    canvas.height = displaySize * dpr;
    canvas.style.width = `${displaySize}px`;
    canvas.style.height = `${displaySize}px`;
    ctx.scale(dpr, dpr);

    const scale = displaySize / arenaSize;

    // Clear
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, displaySize, displaySize);

    // Draw zone (safe area)
    const zone = gameState.zone;
    ctx.beginPath();
    ctx.arc(
      zone.center.x * scale,
      zone.center.y * scale,
      zone.currentRadius * scale,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = 'rgba(20, 25, 35, 1)';
    ctx.fill();

    // Draw zone border
    ctx.strokeStyle = '#FF3366';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw danger zone gradient
    ctx.beginPath();
    ctx.rect(0, 0, displaySize, displaySize);
    ctx.arc(
      zone.center.x * scale,
      zone.center.y * scale,
      zone.currentRadius * scale,
      0,
      Math.PI * 2,
      true
    );
    ctx.fillStyle = 'rgba(255, 51, 102, 0.3)';
    ctx.fill();

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 50 * scale;
    for (let x = 0; x < displaySize; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, displaySize);
      ctx.stroke();
    }
    for (let y = 0; y < displaySize; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(displaySize, y);
      ctx.stroke();
    }

    // Sort players to draw local player last (on top)
    const sortedPlayers = [...gameState.players].sort((a, b) => {
      if (a.id === localPlayerId) return 1;
      if (b.id === localPlayerId) return -1;
      return 0;
    });

    // Draw players
    sortedPlayers.forEach((player) => {
      if (!player.isAlive) return;

      const x = player.position.x * scale;
      const y = player.position.y * scale;
      const radius = PLAYER_RADIUS * scale;
      const isLocal = player.id === localPlayerId;

      // Draw direction indicator
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(player.rotation);

      // Direction triangle
      ctx.beginPath();
      ctx.moveTo(radius + 5, 0);
      ctx.lineTo(radius - 5, -5);
      ctx.lineTo(radius - 5, 5);
      ctx.closePath();
      ctx.fillStyle = isLocal ? '#00D26A' : '#FF3366';
      ctx.fill();

      ctx.restore();

      // Shield glow
      if (player.shield > 0) {
        ctx.beginPath();
        ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(100, 200, 255, ${0.3 + player.shield / 100})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Player body (bean shape)
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);

      // Create gradient based on character color
      const gradient = ctx.createRadialGradient(x - radius / 3, y - radius / 3, 0, x, y, radius);
      gradient.addColorStop(0, player.character.primaryColor);
      gradient.addColorStop(1, player.character.secondaryColor);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Border
      ctx.strokeStyle = isLocal ? '#00D26A' : (player.isBot ? 'rgba(255, 255, 255, 0.3)' : '#FF3366');
      ctx.lineWidth = isLocal ? 3 : 2;
      ctx.stroke();

      // Draw emoji
      ctx.font = `${radius * 1.2}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(player.character.emoji, x, y + 1);

      // Health bar background
      const barWidth = radius * 2.5;
      const barHeight = 4;
      const barX = x - barWidth / 2;
      const barY = y - radius - 12;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      // Health bar
      const healthPercent = player.health / player.maxHealth;
      const healthColor = healthPercent > 0.5 ? '#00D26A' : healthPercent > 0.25 ? '#FFD93D' : '#FF3366';
      ctx.fillStyle = healthColor;
      ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

      // Shield bar
      if (player.shield > 0) {
        const shieldPercent = player.shield / 50;
        ctx.fillStyle = '#64C8FF';
        ctx.fillRect(barX, barY - 5, barWidth * shieldPercent, 3);
      }

      // Name tag
      if (isLocal) {
        ctx.fillStyle = '#00D26A';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('YOU', x, y + radius + 14);
      }
    });

    // Draw minimap
    const minimapSize = 80;
    const minimapX = displaySize - minimapSize - 10;
    const minimapY = 10;
    const minimapScale = minimapSize / arenaSize;

    // Minimap background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);

    // Minimap zone
    ctx.beginPath();
    ctx.arc(
      minimapX + zone.center.x * minimapScale,
      minimapY + zone.center.y * minimapScale,
      zone.currentRadius * minimapScale,
      0,
      Math.PI * 2
    );
    ctx.strokeStyle = '#FF3366';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Minimap players
    gameState.players.forEach((player) => {
      if (!player.isAlive) return;
      ctx.fillStyle = player.id === localPlayerId ? '#00D26A' : '#FF3366';
      ctx.beginPath();
      ctx.arc(
        minimapX + player.position.x * minimapScale,
        minimapY + player.position.y * minimapScale,
        player.id === localPlayerId ? 4 : 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });

    // Minimap border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(minimapX, minimapY, minimapSize, minimapSize);

  }, [gameState, localPlayerId, arenaSize]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded-2xl border-2 border-white/10 shadow-2xl"
      style={{ touchAction: 'none' }}
    />
  );
}

export const GameCanvas = memo(GameCanvasComponent);
