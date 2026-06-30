import http from "node:http";
import express from "express";
import cors from "cors";
import { Server, type Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "./events.js";
import { createRoom, joinRoom, leaveRoom, RoomError } from "./rooms.js";

const PORT = Number(process.env.PORT) || 3001;
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

const app = express();
app.use(cors({ origin: CLIENT_ORIGINS }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

const httpServer = http.createServer(app);

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: { origin: CLIENT_ORIGINS },
});

// --- helpers ----------------------------------------------------------------

const MAX_NAME = 20;
const cleanName = (s: unknown) =>
  typeof s === "string" ? s.trim().slice(0, MAX_NAME) : "";

type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/** Detach a socket from its current room and tell everyone left behind. */
function detach(socket: AppSocket) {
  const pin = socket.data.pin;
  if (!pin) return;

  const { state, roomClosed } = leaveRoom(pin, socket.id);
  socket.leave(pin);
  socket.data.pin = undefined;
  socket.data.role = undefined;

  if (roomClosed) {
    // Host left: kick everyone and clear their client state.
    io.to(pin).emit("room:closed", { reason: "HOST_LEFT" });
    io.in(pin).socketsLeave(pin);
  } else if (state) {
    io.to(pin).emit("room:state", state);
  }
}

// --- socket wiring -----------------------------------------------------------

io.on("connection", (socket) => {
  console.log(`[+] connected: ${socket.id} (total: ${io.engine.clientsCount})`);

  socket.on("room:create", ({ hostName }, ack) => {
    const name = cleanName(hostName);
    if (!name) return ack({ ok: false, error: "NAME_REQUIRED" });
    if (socket.data.pin) detach(socket); // one room per socket

    const state = createRoom(socket.id, name);
    socket.join(state.pin);
    socket.data = { name, pin: state.pin, role: "host" };
    console.log(`[room:create] ${name} -> PIN ${state.pin}`);
    ack({ ok: true, state });
  });

  socket.on("room:join", ({ pin, name }, ack) => {
    const cleanPin = String(pin ?? "").trim();
    const playerName = cleanName(name);
    if (!playerName) return ack({ ok: false, error: "NAME_REQUIRED" });
    if (!/^\d{6}$/.test(cleanPin))
      return ack({ ok: false, error: "INVALID_PIN" });

    try {
      // Attempt the join FIRST. Only after it succeeds do we tear down any
      // previous room membership — otherwise a rejected join (bad PIN, taken
      // name) would wrongly kick the player out of the room they're already in.
      const { state, you } = joinRoom(cleanPin, socket.id, playerName);
      if (socket.data.pin && socket.data.pin !== cleanPin) detach(socket);
      socket.join(cleanPin);
      socket.data = { name: playerName, pin: cleanPin, role: "player" };
      console.log(`[room:join] ${playerName} -> PIN ${cleanPin}`);
      ack({ ok: true, state, you });
      // Broadcast keeps every client on the same authoritative version.
      io.to(cleanPin).emit("room:state", state);
    } catch (err) {
      const error = err instanceof RoomError ? err.message : "JOIN_FAILED";
      ack({ ok: false, error });
    }
  });

  socket.on("room:leave", (ack) => {
    detach(socket);
    ack?.({ ok: true });
  });

  socket.on("disconnect", (reason) => {
    console.log(`[-] disconnected: ${socket.id} (${reason})`);
    detach(socket);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 QuizArena server listening on http://localhost:${PORT}`);
  console.log(`   allowed client origins: ${CLIENT_ORIGINS.join(", ")}`);
});
