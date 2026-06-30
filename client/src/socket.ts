import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "./events";

// Server URL comes from env so dev/prod differ without code changes.
const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001";

// One shared, typed socket instance for the whole app.
// autoConnect:false lets React control exactly when we connect (in an effect),
// which avoids duplicate connections under StrictMode double-mount.
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  SERVER_URL,
  { autoConnect: false }
);
