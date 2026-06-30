# QuizArena ⚡

Real-time multiplayer quiz platform (Kahoot-style). Server-authoritative, built to
showcase **real-time / concurrency / state-sync** skills.

> Status: **Week 2 — Game round MVP** (full multiplayer round, server-graded)

## Architecture (target)

```
┌────────────┐   WebSocket    ┌─────────────────────┐   pub/sub   ┌───────┐
│  React     │ ◀────────────▶ │  Node + Express +   │ ◀─────────▶ │ Redis │
│  (Vite,TS) │   Socket.io    │  Socket.io          │             │ state │
└────────────┘                │  (server-authority) │             │ + TTL │
                              └─────────┬───────────┘             └───────┘
                                        │
                                  ┌─────▼─────┐
                                  │ Postgres  │  (question banks, match history)
                                  └───────────┘
```

**Core principle:** the server is the single source of truth. Scores, the countdown
timer, and correct answers are all computed server-side. The client only renders.
The correct answer is never sent to clients until the reveal phase.

## Monorepo layout

```
quiz-arena/
├── server/   # Node + Express + Socket.io (TypeScript)
│   └── src/
│       ├── index.ts      # socket wiring (room + game handlers)
│       ├── rooms.ts      # in-memory room + game state (Redis-ready)
│       ├── questions.ts  # question bank (server-only correct answers)
│       └── events.ts     # typed wire protocol (source of truth)
└── client/   # React + Vite + TypeScript + socket.io-client
    └── src/
        ├── useRoom.ts    # connection + state hook (version anti-desync)
        ├── events.ts     # mirror of server protocol
        └── screens/      # Home / Lobby / Game
```

## Run locally

Two terminals:

```bash
# Terminal 1 — backend
cd server
npm install
npm run dev          # http://localhost:3001

# Terminal 2 — frontend
cd client
npm install
npm run dev          # http://localhost:5173
```

Open http://localhost:5173, create a room as host, join from other tabs with the
PIN, then start the quiz.

## Roadmap

- [x] **Week 0** — Setup: Express+Socket.io + React, exchange a `hello` event.
- [x] **Week 1** — Rooms & presence (PIN, join/leave, live player list).
- [x] **Week 2** — Game round MVP (start → broadcast question → grade → next).
- [ ] **Week 3** — Scoring & leaderboard, server-side countdown timer.
- [ ] **Week 4** — Scale: Redis state + pub/sub (multi-instance), reconnect, TTL.
- [ ] **Week 5** — Deploy + polished README + demo.
