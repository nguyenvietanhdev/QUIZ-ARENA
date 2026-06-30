import type { RoomState } from "../events";
import type { Role } from "../useRoom";

interface Props {
  state: RoomState;
  role: Role;
  youId: string | null;
  onLeave: () => void;
}

export function Lobby({ state, role, youId, onLeave }: Props) {
  const { pin, host, players } = state;

  return (
    <div>
      <div className="lobby-head">
        <div>
          <span className="muted">Mã PIN</span>
          <div className="pin-display">{pin}</div>
        </div>
        <div className="role-badge">{role === "host" ? "HOST" : "PLAYER"}</div>
      </div>

      <p className="muted host-line">
        Host: <strong>{host.name}</strong>
      </p>

      <div className="players-head">
        <span>Người chơi</span>
        <span className="count">{players.length}</span>
      </div>

      {players.length === 0 ? (
        <p className="empty">Chưa có ai vào… chờ người chơi 👀</p>
      ) : (
        <ul className="players">
          {players.map((p) => (
            <li key={p.id} className={p.id === youId ? "me" : ""}>
              <span className="avatar">{p.name.charAt(0).toUpperCase()}</span>
              {p.name}
              {p.id === youId && <span className="you-tag">bạn</span>}
            </li>
          ))}
        </ul>
      )}

      {role === "host" && players.length > 0 && (
        <p className="hint">▶ Tuần 2 sẽ thêm nút “Bắt đầu” ở đây.</p>
      )}

      <button className="ghost" onClick={onLeave}>
        {role === "host" ? "Đóng phòng" : "Rời phòng"}
      </button>
    </div>
  );
}
