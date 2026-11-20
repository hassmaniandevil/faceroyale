# HANDOVER.md — FaceRoyale

> Status: IN PROGRESS

## What This Product Is

FaceRoyale is a web-based battle royale game where facial expressions control combat abilities. A sister product to FaceFights, it scales the face-combat mechanic into chaotic 10-40 player matches. Players use expressions (scream, eyebrow raise, smile, head tilt, etc.) to attack, shield, dodge, and heal. Last face standing wins. Built by the FaceFights team at MoodHelp Ltd.

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, PixiJS (via web app)
- **Game server**: Colyseus (WebSocket-based multiplayer rooms, @colyseus/core + schema + ws-transport + monitor)
- **API**: Express + tRPC
- **Face tracking**: MediaPipe Face Mesh (packages/face-tracking)
- **Database**: PostgreSQL + Prisma (packages/database)
- **State**: Zustand
- **Styling**: Tailwind CSS 3, shadcn/ui components (Radix UI: dialog, dropdown-menu, toast, slot)
- **Animation**: Framer Motion
- **Audio**: Howler.js
- **Auth**: JWT + bcryptjs
- **Queue**: BullMQ + ioredis
- **Monorepo**: pnpm workspaces + Turborepo
- **Testing**: Vitest
- **Deployment**: Vercel (web), separate hosting needed for game-server and API

## What Is Built and Working

- Full monorepo scaffold with 3 apps and 6 packages
- packages/face-tracking: expression detection pipeline
- packages/game-core: shared game logic, ability config, action triggers
- packages/database: Prisma schema
- packages/ui: shared components
- packages/audio and packages/analytics: scaffolded
- apps/web: Next.js web app with components, hooks, stores
- apps/game-server: Colyseus BattleRoyaleRoom with server-side combat resolution
- apps/api: Express + tRPC API with JWT auth, BullMQ job queue
- Battle royale mode: 10 fighters, last man standing
- 1v1 face fighting mode (complete rewrite for visual feedback)
- Vercel deployment configuration (multiple attempts at config)
- 15 commits total

## What Is Unfinished

- Full ability system (8 abilities defined in README but partial implementation)
- Bot AI system for filling matches
- Matchmaking queue
- Zone shrinking mechanics
- User authentication flow (JWT backend exists, no frontend flow)
- Player profiles, XP, leveling
- Cosmetics and Battle Pass
- Clip recording
- Mobile optimization
- Production deployment of game-server and API (Vercel only handles web)

## Known Bugs

- Vercel deployment went through multiple config iterations (12 config-related commits) -- framework detection conflicts with monorepo
- Game server and API require separate hosting (not solved)

## Project Structure

```
faceroyale/
├── apps/
│   ├── web/                # Next.js web app
│   │   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── stores/
│   ├── game-server/        # Colyseus multiplayer server
│   │   └── src/
│   └── api/                # Express + tRPC API
│       └── src/
├── packages/
│   ├── face-tracking/      # MediaPipe expression detection
│   ├── game-core/          # Shared game logic + abilities
│   ├── database/           # Prisma schema
│   ├── ui/                 # Shared UI components
│   ├── audio/              # Sound system
│   └── analytics/          # Telemetry
├── .env.example
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.json
├── vercel.json
└── README.md
```

## How to Run It

```bash
# Prerequisites: Node 20+, pnpm 8+, PostgreSQL, Redis (optional)
pnpm install
cp .env.example .env       # Edit with your DB connection

pnpm db:push               # Initialize database
pnpm dev                   # Start all services
# Or individually:
pnpm dev:web               # Web app on :3000
pnpm dev:server            # Game server on :2567
pnpm dev:api               # API on :3001
```

## Env Var Names (from .env.example)

- DATABASE_URL
- REDIS_URL
- JWT_SECRET
- REFRESH_SECRET
- GAME_SERVER_PORT
- NEXT_PUBLIC_GAME_SERVER_URL
- API_PORT
- CORS_ORIGIN
- NODE_ENV

## Next Steps (In Order)

1. Complete the 8 facial expression abilities with cooldowns and balancing
2. Implement bot AI to fill matches when player count is low
3. Build matchmaking queue with BullMQ/Redis
4. Add zone shrinking mechanics (every 30s after 60s mark)
5. Build user authentication frontend flow
6. Deploy game-server and API to Railway/Render/Fly.io
7. Player profiles, XP, and leveling
8. Cosmetics and Battle Pass
9. Clip recording and sharing
10. Mobile optimization

## Key Documentation

- `/Users/hassanyasin/faceroyale/README.md` -- Comprehensive project overview with architecture details
- `/Users/hassanyasin/faceroyale/.env.example` -- Environment configuration
