# FaceRoyale

**Battle Royale with Your Face** — The most expressive battle royale ever made. Your face is your weapon.

40 players enter, one face remains.

## Overview

FaceRoyale is a web-based battle royale game where facial expressions control combat abilities. Built as a sister site to FaceFights, it scales the facial-expression combat mechanic into chaotic 20-40 player matches.

### Core Gameplay

- **Scream Attack** — Open your mouth wide to blast enemies in a cone
- **Shield Burst** — Raise your eyebrows to generate a protective shield
- **Intimidate** — Furrow your brows to slow nearby enemies
- **Charm** — Smile to confuse a single target
- **Explosive Push** — Puff your cheeks to knock back enemies
- **Quick Strike** — Blink quickly to land a fast hit
- **Meditate** — Hold a neutral face to heal
- **Dodge** — Tilt your head to dash

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 14, React, TypeScript, PixiJS |
| Game Server | Colyseus (WebSocket-based multiplayer) |
| API | Express + tRPC |
| Face Tracking | MediaPipe Face Mesh |
| Database | PostgreSQL + Prisma |
| Styling | Tailwind CSS |
| State | Zustand |

## Project Structure

```
faceroyale/
├── apps/
│   ├── web/                    # Next.js web app
│   ├── game-server/            # Colyseus game server
│   └── api/                    # Express + tRPC API
├── packages/
│   ├── game-core/              # Shared game logic
│   ├── face-tracking/          # Face detection
│   ├── database/               # Prisma schema
│   └── ui/                     # Shared components
└── infrastructure/
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- PostgreSQL database
- Redis (optional, for matchmaking)

### Setup

1. **Install dependencies**

```bash
pnpm install
```

2. **Set up environment variables**

```bash
cp .env.example .env
```

Edit `.env` with your database connection:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/faceroyale"
JWT_SECRET="your-secret-key"
REFRESH_SECRET="your-refresh-secret"
NEXT_PUBLIC_GAME_SERVER_URL="ws://localhost:2567"
```

3. **Initialize database**

```bash
pnpm db:push
```

4. **Start development servers**

```bash
# Start all services
pnpm dev

# Or start individually:
pnpm dev:web        # Web app on :3000
pnpm dev:server     # Game server on :2567
pnpm dev:api        # API on :3001
```

5. **Open the game**

Navigate to `http://localhost:3000`

## Development

### Key Commands

```bash
pnpm dev              # Start all apps in dev mode
pnpm build            # Build all apps
pnpm test             # Run tests
pnpm lint             # Lint all packages
pnpm db:studio        # Open Prisma Studio
pnpm db:migrate       # Run database migrations
```

### Architecture

#### Face Tracking Pipeline

```
Camera → MediaPipe Face Mesh → Expression Detector → Action Trigger System → Game Server
```

1. **Camera** captures video frames
2. **MediaPipe** detects 468 facial landmarks
3. **Expression Detector** calculates expression values (0-1)
4. **Action Trigger System** maps expressions to abilities with cooldowns
5. **Game Server** receives triggered abilities and resolves combat

#### Game Loop

- Server runs at 20 ticks/second
- Client sends movement + ability triggers
- Server broadcasts state updates to all clients
- Zone shrinks every 30 seconds after 60s mark

### Adding New Abilities

1. Add configuration to `packages/game-core/src/abilities/config.ts`
2. Add trigger to `packages/face-tracking/src/triggers/action-trigger.ts`
3. Handle ability in `apps/game-server/src/rooms/BattleRoyaleRoom.ts`
4. Add UI icon to `apps/web/components/game/AbilityWheel.tsx`

## Performance Targets

| Metric | Target |
|--------|--------|
| FPS | 60 |
| Face tracking | 30 FPS |
| Network tick rate | 20 Hz |
| Queue time | < 10s |
| Match duration | 2-4 min |

## Safety & Privacy

- **Camera access** — Required for gameplay, all processing runs locally in browser
- **No video uploaded** — Only expression data (numbers) sent to server
- **Age gates** — Implemented for compliance
- **No voice chat** — Reduces moderation burden

## Roadmap

### Phase 1: Foundation ✅
- [x] Monorepo setup
- [x] Face tracking package
- [x] Game core package
- [x] Database schema
- [x] Basic web app
- [x] Colyseus game server

### Phase 2: Multiplayer
- [ ] Full ability implementation
- [ ] Bot AI system
- [ ] Matchmaking
- [ ] Zone mechanics

### Phase 3: Metagame
- [ ] User authentication
- [ ] Player profiles
- [ ] XP & leveling
- [ ] Cosmetics

### Phase 4: Polish
- [ ] Battle Pass
- [ ] Events system
- [ ] Clip recording
- [ ] Mobile optimization

## License

Proprietary — All rights reserved

## Credits

Built by the FaceFights team. Inspired by the chaos of battle royales and the joy of making faces.
