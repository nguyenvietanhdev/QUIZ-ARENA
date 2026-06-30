// Shared Socket.io event contract.
// Keep client/src/events.ts in sync with this file (single source of truth for the
// wire protocol). Strong typing here catches desync between client and server at
// compile time — important for a real-time app where payloads must match exactly.

export interface PlayerInfo {
  id: string; // socket id for now; a stable player id arrives in Week 4 (reconnect)
  name: string;
  joinedAt: number;
}

/** Full snapshot of a room. We broadcast this whole object on every change so
 *  clients never have to reconstruct state from deltas (anti-desync). */
export interface RoomState {
  pin: string;
  host: { id: string; name: string };
  players: PlayerInfo[];
  version: number; // bumped on every mutation; clients ignore stale/older versions
}

/** Standard ack envelope: either a success payload or an error code. */
export type Ack<T> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

// ----- Game (Week 2) --------------------------------------------------------

export type GamePhase = "question" | "reveal" | "ended";

/** A question as the client is allowed to see it — NO correct answer. */
export interface QuestionPublic {
  index: number; // 0-based
  total: number;
  text: string;
  choices: string[];
}

export interface ScoreEntry {
  id: string;
  name: string;
  score: number;
}

/** Full game snapshot, broadcast on every change (anti-desync, versioned). */
export interface GameState {
  phase: GamePhase;
  version: number;
  question?: QuestionPublic; // present in "question" and "reveal"
  answeredCount?: number; // "question" phase
  totalPlayers?: number;
  correctIndex?: number; // "reveal" phase only — revealed answer
  tally?: number[]; // "reveal": how many picked each choice
  scores?: ScoreEntry[]; // "reveal" & "ended": leaderboard (sorted)
}

/** Events the CLIENT emits to the SERVER. */
export interface ClientToServerEvents {
  // Host creates a new room and gets back a PIN + initial state.
  "room:create": (
    payload: { hostName: string },
    ack: (res: Ack<{ state: RoomState }>) => void
  ) => void;

  // Player joins an existing room by PIN.
  "room:join": (
    payload: { pin: string; name: string },
    ack: (res: Ack<{ state: RoomState; you: PlayerInfo }>) => void
  ) => void;

  // Explicit leave (button). Disconnect is handled automatically too.
  "room:leave": (ack?: (res: Ack<{}>) => void) => void;

  // Host: begin the game (broadcasts the first question).
  "game:start": (ack: (res: Ack<{}>) => void) => void;
  // Player: submit an answer for the current question.
  "game:answer": (
    payload: { questionIndex: number; choiceIndex: number },
    ack: (res: Ack<{ accepted: boolean }>) => void
  ) => void;
  // Host: reveal + grade the current question.
  "game:reveal": (ack: (res: Ack<{}>) => void) => void;
  // Host: advance to the next question (or end the game).
  "game:next": (ack: (res: Ack<{}>) => void) => void;
}

/** Events the SERVER emits to the CLIENT. */
export interface ServerToClientEvents {
  // Broadcast to everyone in a room whenever its state changes.
  "room:state": (state: RoomState) => void;
  // Sent to a room's members when the host ends the room.
  "room:closed": (payload: { reason: string }) => void;
  // Broadcast whenever the game advances (start / answer / reveal / next).
  "game:state": (state: GameState) => void;
}

/** Inter-server events (used later with the Redis adapter). */
export interface InterServerEvents {}

/** Per-socket state stored on the server. */
export interface SocketData {
  name?: string;
  pin?: string; // which room this socket is in
  role?: "host" | "player";
}
