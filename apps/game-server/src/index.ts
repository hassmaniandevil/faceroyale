/**
 * FaceRoyale Game Server
 * Colyseus-based multiplayer game server
 */

import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { monitor } from '@colyseus/monitor';
import express from 'express';
import cors from 'cors';
import { BattleRoyaleRoom } from './rooms/BattleRoyaleRoom';

const PORT = parseInt(process.env.GAME_SERVER_PORT || '2567', 10);

async function main() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Colyseus monitor (admin panel)
  if (process.env.NODE_ENV !== 'production') {
    app.use('/colyseus', monitor());
  }

  // Create game server
  const gameServer = new Server({
    transport: new WebSocketTransport({
      server: app.listen(PORT),
    }),
  });

  // Register rooms
  gameServer.define('battle_royale', BattleRoyaleRoom);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Shutting down game server...');
    await gameServer.gracefullyShutdown();
    process.exit(0);
  });

  console.log(`🎮 FaceRoyale Game Server listening on port ${PORT}`);
  console.log(`📊 Monitor available at http://localhost:${PORT}/colyseus`);
}

main().catch(console.error);
