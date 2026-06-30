// In-memory room store. This is the ONLY place that knows how rooms are stored,
// so in Week 4 we can swap the internals for Redis without touching the socket
// handlers. Everything that mutates a room bumps `version` and returns a fresh
// snapshot, keeping the server the single source of truth.

import type { GamePhase, GameState, PlayerInfo, RoomState } from "./events.js";
import { QUESTIONS, QUESTION_COUNT } from "./questions.js";

interface Game {
  phase: GamePhase;
  qIndex: number;
  answers: Map<string, number>; // socketId -> chosen choiceIndex (current question)
  scores: Map<string, number>; // socketId -> total score
  version: number;
}

interface Room {
  pin: string;
  hostId: string;
  hostName: string;
  players: Map<string, PlayerInfo>; // keyed by socket id
  version: number;
  createdAt: number;
  game?: Game; // present once the host starts the game
}

const rooms = new Map<string, Room>();

function generatePin(): string {
  // 6-digit numeric PIN, retry on the (rare) collision.
  for (let i = 0; i < 20; i++) {
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    if (!rooms.has(pin)) return pin;
  }
  throw new Error("Could not allocate a unique PIN");
}

function snapshot(room: Room): RoomState {
  return {
    pin: room.pin,
    host: { id: room.hostId, name: room.hostName },
    players: [...room.players.values()].sort((a, b) => a.joinedAt - b.joinedAt),
    version: room.version,
  };
}

export function createRoom(hostId: string, hostName: string): RoomState {
  const pin = generatePin();
  const room: Room = {
    pin,
    hostId,
    hostName,
    players: new Map(),
    version: 1,
    createdAt: Date.now(),
  };
  rooms.set(pin, room);
  return snapshot(room);
}

export class RoomError extends Error {}

export function joinRoom(
  pin: string,
  playerId: string,
  name: string
): { state: RoomState; you: PlayerInfo } {
  const room = rooms.get(pin);
  if (!room) throw new RoomError("ROOM_NOT_FOUND");

  const taken = [...room.players.values()].some(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  );
  if (taken) throw new RoomError("NAME_TAKEN");

  const you: PlayerInfo = { id: playerId, name, joinedAt: Date.now() };
  room.players.set(playerId, you);
  room.version++;
  return { state: snapshot(room), you };
}

/** Remove a socket from whatever it was doing in `pin`.
 *  Returns the new state, or null if the room no longer exists / was closed. */
export function leaveRoom(
  pin: string,
  socketId: string
): { state: RoomState | null; roomClosed: boolean } {
  const room = rooms.get(pin);
  if (!room) return { state: null, roomClosed: false };

  // Host leaving ends the room (host migration comes in Week 4).
  if (room.hostId === socketId) {
    rooms.delete(pin);
    return { state: null, roomClosed: true };
  }

  if (room.players.delete(socketId)) {
    room.version++;
    return { state: snapshot(room), roomClosed: false };
  }
  return { state: snapshot(room), roomClosed: false };
}

export function getRoom(pin: string): RoomState | null {
  const room = rooms.get(pin);
  return room ? snapshot(room) : null;
}

export function roomCount(): number {
  return rooms.size;
}

// ----- Game logic (Week 2) --------------------------------------------------

function publicQuestion(qIndex: number) {
  const q = QUESTIONS[qIndex];
  return {
    index: qIndex,
    total: QUESTION_COUNT,
    text: q.text,
    choices: q.choices,
  };
}

/** Build the leaderboard (sorted desc) from the score map + player names. */
function leaderboard(room: Room) {
  const game = room.game!;
  return [...game.scores.entries()]
    .map(([id, score]) => ({
      id,
      name: room.players.get(id)?.name ?? "(đã rời)",
      score,
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

/** Public game snapshot — never includes the correct answer during "question". */
function gameSnapshot(room: Room): GameState {
  const game = room.game!;
  const base = { phase: game.phase, version: game.version };

  if (game.phase === "ended") {
    return { ...base, scores: leaderboard(room) };
  }

  const q = QUESTIONS[game.qIndex];
  if (game.phase === "question") {
    return {
      ...base,
      question: publicQuestion(game.qIndex),
      answeredCount: game.answers.size,
      totalPlayers: room.players.size,
    };
  }

  // reveal
  const tally = q.choices.map(() => 0);
  for (const choice of game.answers.values()) {
    if (choice >= 0 && choice < tally.length) tally[choice]++;
  }
  return {
    ...base,
    question: publicQuestion(game.qIndex),
    correctIndex: q.correctIndex,
    tally,
    answeredCount: game.answers.size,
    totalPlayers: room.players.size,
    scores: leaderboard(room),
  };
}

function requireHost(pin: string, requesterId: string): Room {
  const room = rooms.get(pin);
  if (!room) throw new RoomError("ROOM_NOT_FOUND");
  if (room.hostId !== requesterId) throw new RoomError("NOT_HOST");
  return room;
}

export function startGame(pin: string, requesterId: string): GameState {
  const room = requireHost(pin, requesterId);
  if (room.players.size === 0) throw new RoomError("NO_PLAYERS");
  if (room.game && room.game.phase !== "ended")
    throw new RoomError("ALREADY_STARTED");

  const scores = new Map<string, number>();
  for (const id of room.players.keys()) scores.set(id, 0);

  room.game = {
    phase: "question",
    qIndex: 0,
    answers: new Map(),
    scores,
    version: 1,
  };
  return gameSnapshot(room);
}

export function recordAnswer(
  pin: string,
  playerId: string,
  questionIndex: number,
  choiceIndex: number
): { accepted: boolean; state: GameState | null } {
  const room = rooms.get(pin);
  if (!room || !room.game) throw new RoomError("NO_GAME");
  const game = room.game;

  // Reject anything that doesn't apply to the live question (anti-cheat / late).
  if (game.phase !== "question") return { accepted: false, state: null };
  if (questionIndex !== game.qIndex) return { accepted: false, state: null };
  if (!room.players.has(playerId)) return { accepted: false, state: null };
  if (game.answers.has(playerId)) return { accepted: false, state: null }; // one shot
  const q = QUESTIONS[game.qIndex];
  if (choiceIndex < 0 || choiceIndex >= q.choices.length)
    return { accepted: false, state: null };

  game.answers.set(playerId, choiceIndex);
  game.version++;
  return { accepted: true, state: gameSnapshot(room) };
}

export function revealQuestion(pin: string, requesterId: string): GameState {
  const room = requireHost(pin, requesterId);
  const game = room.game;
  if (!game) throw new RoomError("NO_GAME");
  if (game.phase !== "question") throw new RoomError("BAD_PHASE");

  // Grade on the server. Week 2: +1 per correct answer (speed bonus in Week 3).
  const q = QUESTIONS[game.qIndex];
  for (const [playerId, choice] of game.answers) {
    if (choice === q.correctIndex) {
      game.scores.set(playerId, (game.scores.get(playerId) ?? 0) + 1);
    }
  }
  game.phase = "reveal";
  game.version++;
  return gameSnapshot(room);
}

export function nextQuestion(pin: string, requesterId: string): GameState {
  const room = requireHost(pin, requesterId);
  const game = room.game;
  if (!game) throw new RoomError("NO_GAME");
  if (game.phase !== "reveal") throw new RoomError("BAD_PHASE");

  if (game.qIndex + 1 >= QUESTION_COUNT) {
    game.phase = "ended";
  } else {
    game.qIndex++;
    game.phase = "question";
    game.answers = new Map();
  }
  game.version++;
  return gameSnapshot(room);
}
