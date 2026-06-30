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
}

export interface ServerToClientEvents {
  "room:state": (state: RoomState) => void;
  "room:closed": (payload: { reason: string }) => void;
}
