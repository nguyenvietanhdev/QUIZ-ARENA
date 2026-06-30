// Mirror of server/src/events.ts — keep both in sync (this is the wire protocol).

export interface PlayerInfo {
  id: string;
  name: string;
  joinedAt: number;
}

export interface RoomState {
  pin: string;
  host: { id: string; name: string };
  players: PlayerInfo[];
  version: number;
}

export type Ack<T> = ({ ok: true } & T) | { ok: false; error: string };

export type GamePhase = "question" | "reveal" | "ended";

export interface QuestionPublic {
  index: number;
  total: number;
  text: string;
  choices: string[];
}

export interface ScoreEntry {
  id: string;
  name: string;
  score: number;
}

export interface GameState {
  phase: GamePhase;
  version: number;
  question?: QuestionPublic;
  answeredCount?: number;
  totalPlayers?: number;
  correctIndex?: number;
  tally?: number[];
  scores?: ScoreEntry[];
}

export interface ClientToServerEvents {
  "room:create": (
    payload: { hostName: string },
    ack: (res: Ack<{ state: RoomState }>) => void
  ) => void;
  "room:join": (
    payload: { pin: string; name: string },
    ack: (res: Ack<{ state: RoomState; you: PlayerInfo }>) => void
  ) => void;
  "room:leave": (ack?: (res: Ack<{}>) => void) => void;
  "game:start": (ack: (res: Ack<{}>) => void) => void;
  "game:answer": (
    payload: { questionIndex: number; choiceIndex: number },
    ack: (res: Ack<{ accepted: boolean }>) => void
  ) => void;
  "game:reveal": (ack: (res: Ack<{}>) => void) => void;
  "game:next": (ack: (res: Ack<{}>) => void) => void;
}

export interface ServerToClientEvents {
  "room:state": (state: RoomState) => void;
  "room:closed": (payload: { reason: string }) => void;
  "game:state": (state: GameState) => void;
}
