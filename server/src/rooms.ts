// In-memory room store. This is the ONLY place that knows how rooms are stored,
// so in Week 4 we can swap the internals for Redis without touching the socket
// handlers. Everything that mutates a room bumps `version` and returns a fresh
// snapshot, keeping the server the single source of truth.

import type { PlayerInfo, RoomState } from "./events.js";

interface Room {
  pin: string;
  hostId: string;
  hostName: string;
  players: Map<string, PlayerInfo>; // keyed by socket id
  version: number;
  createdAt: number;
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
