import { useState } from "react";

interface Props {
  connected: boolean;
  error: string | null;
  onCreate: (hostName: string) => void;
  onJoin: (pin: string, name: string) => void;
  onInput: () => void;
}

type Tab = "join" | "host";

export function Home({ connected, error, onCreate, onJoin, onInput }: Props) {
  const [tab, setTab] = useState<Tab>("join");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");

  const handle = () => {
    if (tab === "host") onCreate(name.trim());
    else onJoin(pin.trim(), name.trim());
  };

  const canSubmit =
    connected && name.trim() && (tab === "host" || /^\d{6}$/.test(pin.trim()));

  return (
    <div>
      <div className="tabs">
        <button
          className={tab === "join" ? "tab active" : "tab"}
          onClick={() => setTab("join")}
        >
          Vào phòng
        </button>
        <button
          className={tab === "host" ? "tab active" : "tab"}
          onClick={() => setTab("host")}
        >
          Tạo phòng
        </button>
      </div>

      {tab === "join" && (
        <input
          className="pin-input"
          value={pin}
          inputMode="numeric"
          maxLength={6}
          placeholder="Mã PIN (6 số)"
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, ""));
            onInput();
          }}
        />
      )}

      <input
        value={name}
        placeholder={tab === "host" ? "Tên host…" : "Tên của bạn…"}
        maxLength={20}
        onChange={(e) => {
          setName(e.target.value);
          onInput();
        }}
        onKeyDown={(e) => e.key === "Enter" && canSubmit && handle()}
      />

      {error && <div className="error">{error}</div>}

      <button className="primary" onClick={handle} disabled={!canSubmit}>
        {tab === "host" ? "Tạo phòng mới" : "Tham gia"}
      </button>
    </div>
  );
}
