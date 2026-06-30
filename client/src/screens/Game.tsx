import type { GameState } from "../events";
import type { Role } from "../useRoom";

interface Props {
  game: GameState;
  role: Role;
  youId: string | null;
  myAnswer: number | null;
  onAnswer: (choiceIndex: number) => void;
  onReveal: () => void;
  onNext: () => void;
  onLeave: () => void;
}

const CHOICE_COLORS = ["#ef4444", "#3b82f6", "#eab308", "#22c55e"];

export function Game({
  game,
  role,
  youId,
  myAnswer,
  onAnswer,
  onReveal,
  onNext,
  onLeave,
}: Props) {
  if (game.phase === "ended") {
    return <Ended game={game} youId={youId} onLeave={onLeave} />;
  }

  const q = game.question!;
  const isReveal = game.phase === "reveal";
  const isHost = role === "host";
  const lastQuestion = q.index === q.total - 1;

  return (
    <div>
      <div className="q-head">
        <span className="muted">
          Câu {q.index + 1}/{q.total}
        </span>
        {!isReveal && (
          <span className="answered">
            {game.answeredCount ?? 0}/{game.totalPlayers ?? 0} đã trả lời
          </span>
        )}
      </div>

      <h2 className="q-text">{q.text}</h2>

      <div className="choices">
        {q.choices.map((choice, i) => {
          const correct = isReveal && i === game.correctIndex;
          const mineWrong = isReveal && i === myAnswer && i !== game.correctIndex;
          const picked = myAnswer === i;

          const cls = [
            "choice",
            correct ? "correct" : "",
            mineWrong ? "wrong" : "",
            picked && !isReveal ? "picked" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={i}
              className={cls}
              style={{ borderColor: CHOICE_COLORS[i % 4] }}
              disabled={isHost || isReveal || myAnswer !== null}
              onClick={() => onAnswer(i)}
            >
              <span className="shape" style={{ background: CHOICE_COLORS[i % 4] }} />
              {choice}
              {isReveal && (
                <span className="votes">{game.tally?.[i] ?? 0}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Player feedback */}
      {!isHost && !isReveal && myAnswer !== null && (
        <p className="hint">✅ Đã chọn — chờ mọi người…</p>
      )}
      {!isHost && isReveal && (
        <p className={myAnswer === game.correctIndex ? "good" : "bad"}>
          {myAnswer === game.correctIndex
            ? "🎉 Chính xác! +1 điểm"
            : myAnswer === null
            ? "⌛ Bạn chưa trả lời"
            : "❌ Sai rồi"}
        </p>
      )}

      {/* Host controls */}
      {isHost && !isReveal && (
        <button className="primary" onClick={onReveal}>
          Hiện đáp án
        </button>
      )}
      {isHost && isReveal && (
        <button className="primary" onClick={onNext}>
          {lastQuestion ? "Xem kết quả 🏆" : "Câu tiếp →"}
        </button>
      )}

      {/* Live leaderboard during reveal */}
      {isReveal && game.scores && (
        <Leaderboard scores={game.scores} youId={youId} compact />
      )}

      <button className="ghost" onClick={onLeave}>
        {isHost ? "Đóng phòng" : "Rời phòng"}
      </button>
    </div>
  );
}

function Ended({
  game,
  youId,
  onLeave,
}: {
  game: GameState;
  youId: string | null;
  onLeave: () => void;
}) {
  return (
    <div>
      <h2 className="q-text" style={{ textAlign: "center" }}>
        🏆 Kết thúc!
      </h2>
      <Leaderboard scores={game.scores ?? []} youId={youId} />
      <button className="ghost" onClick={onLeave}>
        Rời phòng
      </button>
    </div>
  );
}

function Leaderboard({
  scores,
  youId,
  compact,
}: {
  scores: { id: string; name: string; score: number }[];
  youId: string | null;
  compact?: boolean;
}) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <ol className={`leaderboard ${compact ? "compact" : ""}`}>
      {scores.map((s, i) => (
        <li key={s.id} className={s.id === youId ? "me" : ""}>
          <span className="rank">{medals[i] ?? i + 1}</span>
          <span className="lb-name">{s.name}</span>
          <span className="lb-score">{s.score}</span>
        </li>
      ))}
    </ol>
  );
}
