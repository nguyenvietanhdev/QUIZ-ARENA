import { useEffect, useRef, useState } from "react";
import { socket } from "./socket";
import type { GameState, RoomState } from "./events";

export type Role = "host" | "player";

export interface UseRoom {
  connected: boolean;
  room: RoomState | null;
  game: GameState | null;
  myAnswer: number | null;
  role: Role | null;
  youId: string | null;
  error: string | null;
  notice: string | null;
  createRoom: (hostName: string) => void;
  joinRoom: (pin: string, name: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  answer: (choiceIndex: number) => void;
  reveal: () => void;
  next: () => void;
  clearError: () => void;
}

export function useRoom(): UseRoom {
  const [connected, setConnected] = useState(socket.connected);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [myAnswer, setMyAnswer] = useState<number | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [youId, setYouId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Separate version cursors for room vs game (two independent streams).
  const roomVersionRef = useRef(0);
  const gameVersionRef = useRef(0);
  const qIndexRef = useRef(-1); // to detect when a new question starts

  const applyRoom = (s: RoomState) => {
    if (s.version < roomVersionRef.current) return; // stale → drop (anti-desync)
    roomVersionRef.current = s.version;
    setRoom(s);
  };

  const applyGame = (s: GameState) => {
    if (s.version < gameVersionRef.current) return;
    gameVersionRef.current = s.version;
    // New question → forget my previous selection.
    const idx = s.question?.index ?? -1;
    if (s.phase === "question" && idx !== qIndexRef.current) {
      qIndexRef.current = idx;
      setMyAnswer(null);
    }
    setGame(s);
  };

  const reset = () => {
    roomVersionRef.current = 0;
    gameVersionRef.current = 0;
    qIndexRef.current = -1;
    setRoom(null);
    setGame(null);
    setMyAnswer(null);
    setRole(null);
    setYouId(null);
  };

  useEffect(() => {
    socket.connect();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onRoom = (s: RoomState) => applyRoom(s);
    const onGame = (s: GameState) => applyGame(s);
    const onClosed = (p: { reason: string }) => {
      reset();
      setNotice(
        p.reason === "HOST_LEFT"
          ? "Host đã rời phòng — phòng đã đóng."
          : "Phòng đã đóng."
      );
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room:state", onRoom);
    socket.on("game:state", onGame);
    socket.on("room:closed", onClosed);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room:state", onRoom);
      socket.off("game:state", onGame);
      socket.off("room:closed", onClosed);
      socket.disconnect();
    };
  }, []);

  const createRoom = (hostName: string) => {
    setError(null);
    socket.emit("room:create", { hostName }, (res) => {
      if (!res.ok) return setError(res.error);
      roomVersionRef.current = res.state.version;
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
      roomVersionRef.current = res.state.version;
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

  const startGame = () => {
    setError(null);
    socket.emit("game:start", (res) => {
      if (!res.ok) setError(res.error);
    });
  };

  const answer = (choiceIndex: number) => {
    if (!game?.question || myAnswer !== null) return; // one shot, client-side guard
    setMyAnswer(choiceIndex); // optimistic; server is still authority on scoring
    socket.emit(
      "game:answer",
      { questionIndex: game.question.index, choiceIndex },
      (res) => {
        if (!res.ok || !res.accepted) setMyAnswer(null); // revert if rejected
      }
    );
  };

  const reveal = () => {
    socket.emit("game:reveal", (res) => {
      if (!res.ok) setError(res.error);
    });
  };

  const next = () => {
    socket.emit("game:next", (res) => {
      if (!res.ok) setError(res.error);
    });
  };

  return {
    connected,
    room,
    game,
    myAnswer,
    role,
    youId,
    error,
    notice,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    answer,
    reveal,
    next,
    clearError: () => setError(null),
  };
}
