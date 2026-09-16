import type { Difficulty, GameResult, GamePhase, Side } from "../game/types";

export interface GameStatusProps {
  phase: GamePhase;
  turn: Side;
  thinking: boolean;
  check: boolean;
  result: GameResult | null;
  difficulty: Difficulty | null;
  engineDepth: number | null;
  engineError: boolean;
  legalTargets: string[];
  statusText: string;
}

export function GameStatus({
  phase,
  turn,
  thinking,
  check,
  result,
  difficulty,
  engineDepth,
  engineError,
  legalTargets,
  statusText,
}: GameStatusProps) {
  return (
    <section
      role="status"
      aria-live="polite"
      aria-label="Game status"
      aria-busy={thinking}
      className="status"
      data-testid="game-status"
      data-phase={phase}
      data-turn={turn}
      data-thinking={String(thinking)}
      data-check={String(check)}
      data-result={result ? result.kind : "none"}
      data-winner={result?.winner ?? "none"}
      data-difficulty={difficulty ?? "none"}
      data-engine-depth={engineDepth ?? "none"}
      data-engine-error={String(engineError)}
      data-legal-targets={legalTargets.join(",")}
    >
      <p data-testid="status-text">{statusText}</p>
      {thinking ? (
        <p className="thinking" data-testid="thinking-indicator">
          Computer is thinking…
        </p>
      ) : null}
      {engineError ? (
        <p className="engine-error" data-testid="engine-error">
          The computer is unavailable right now.
        </p>
      ) : null}
    </section>
  );
}
