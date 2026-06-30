import { useEffect, useRef, useState } from "react";
import { socket } from "./socket";
import type { RoomState } from "./events";

export type Role = "host" | "player";

export interface UseRoom {
  connected: boolean;
  room: RoomState | null;
  role: Role | null;
  youId: string | null;
  error: string | null;
  notice: string | null;
  createRoom: (hostName: string) => void;
  joinRoom: (pin: string, name: string) => void;
  leaveRoom: () => void;
  clearError: () => void;
}

export function useRoom(): UseRoom {
  const [connected, setConnected] = useState(socket.connected);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [youId, setYouId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Track the latest applied version so out-of-order broadcasts are dropped.
  const versionRef = useRef(0);

  // Only accept a snapshot if it's newer than what we already show.
  const applyState = (s: RoomState) => {
    if (s.version < versionRef.current) return; // stale → ignore (anti-desync)
    versionRef.current = s.version;
    setRoom(s);
  };

  const reset = () => {
    versionRef.current = 0;
    setRoom(null);
    setRole(null);
    setYouId(null);
  };

  useEffect(() => {
    socket.connect();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onState = (s: RoomState) => applyState(s);
    const onClosed = (p: { reason: string }) => {
      reset();
      setNotice(
        p.reason === "HOST_LEFT" ? "Host đã rời phòng — phòng đã đóng." : "Phòng đã đóng."
      );
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room:state", onState);
    socket.on("room:closed", onClosed);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room:state", onState);
      socket.off("room:closed", onClosed);
      socket.disconnect();
    };
  }, []);

  const createRoom = (hostName: string) => {
    setError(null);
    socket.emit("room:create", { hostName }, (res) => {
      if (!res.ok) return setError(res.error);
      versionRef.current = res.state.version;
      setRoom(res.state);
      setRole("host");
      setYouId(socket.id ?? null);
      setNotice(null);
    });
  };

  const joinRoom = (pin: string, name: string) => {
    setError(null);
    socket.emit("room:join", { pin, name }, (res) => {
      if (!res.ok) return setError(res.error);
      versionRef.current = res.state.version;
      setRoom(res.state);
      setRole("player");
      setYouId(res.you.id);
      setNotice(null);
    });
  };

  const leaveRoom = () => {
    socket.emit("room:leave");
    reset();
  };

  return {
    connected,
    room,
    role,
    youId,
    error,
    notice,
    createRoom,
    joinRoom,
    leaveRoom,
    clearError: () => setError(null),
  };
}
