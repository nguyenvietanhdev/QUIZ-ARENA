import { useRoom } from "./useRoom";
import { Home } from "./screens/Home";
import { Lobby } from "./screens/Lobby";
import { Game } from "./screens/Game";

const ERROR_TEXT: Record<string, string> = {
  NAME_REQUIRED: "Vui lòng nhập tên.",
  INVALID_PIN: "Mã PIN phải gồm 6 chữ số.",
  ROOM_NOT_FOUND: "Không tìm thấy phòng với mã PIN này.",
  NAME_TAKEN: "Tên này đã có người dùng trong phòng.",
  JOIN_FAILED: "Không vào được phòng, thử lại.",
  NO_PLAYERS: "Cần ít nhất 1 người chơi để bắt đầu.",
  NOT_HOST: "Chỉ host mới làm được thao tác này.",
};

export default function App() {
  const room = useRoom();
  const errMsg = room.error ? ERROR_TEXT[room.error] ?? room.error : null;

  return (
    <div className="card">
      <header className="app-head">
        <h1>QuizArena ⚡</h1>
        <span className={`status ${room.connected ? "on" : "off"}`}>
          <span className="dot" />
          {room.connected ? "Online" : "Offline"}
        </span>
      </header>

      {room.notice && <div className="notice">{room.notice}</div>}

      {!room.room ? (
        <Home
          connected={room.connected}
          error={errMsg}
          onCreate={room.createRoom}
          onJoin={room.joinRoom}
          onInput={room.clearError}
        />
      ) : room.game ? (
        <Game
          game={room.game}
          role={room.role!}
          youId={room.youId}
          myAnswer={room.myAnswer}
          onAnswer={room.answer}
          onReveal={room.reveal}
          onNext={room.next}
          onLeave={room.leaveRoom}
        />
      ) : (
        <Lobby
          state={room.room}
          role={room.role!}
          youId={room.youId}
          onLeave={room.leaveRoom}
          onStart={room.startGame}
        />
      )}

      {errMsg && room.room && <div className="error" style={{ marginTop: 12 }}>{errMsg}</div>}
    </div>
  );
}
