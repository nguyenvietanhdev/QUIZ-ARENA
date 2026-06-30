import { useRoom } from "./useRoom";
import { Home } from "./screens/Home";
import { Lobby } from "./screens/Lobby";

const ERROR_TEXT: Record<string, string> = {
  NAME_REQUIRED: "Vui lòng nhập tên.",
  INVALID_PIN: "Mã PIN phải gồm 6 chữ số.",
  ROOM_NOT_FOUND: "Không tìm thấy phòng với mã PIN này.",
  NAME_TAKEN: "Tên này đã có người dùng trong phòng.",
  JOIN_FAILED: "Không vào được phòng, thử lại.",
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

      {room.room ? (
        <Lobby
          state={room.room}
          role={room.role!}
          youId={room.youId}
          onLeave={room.leaveRoom}
        />
      ) : (
        <Home
          connected={room.connected}
          error={errMsg}
          onCreate={room.createRoom}
          onJoin={room.joinRoom}
          onInput={room.clearError}
        />
      )}
    </div>
  );
}
