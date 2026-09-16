import type { MoveRecord } from "../game/types";

export interface MoveHistoryProps {
  moves: MoveRecord[];
}

export function MoveHistory({ moves }: MoveHistoryProps) {
  return (
    <ol role="list" aria-label="Move history" className="history" data-testid="move-history">
      {moves.map((move) => (
        <li
          key={move.ply}
          role="listitem"
          data-side={move.side}
          data-ply={move.ply}
          data-from={move.from}
          data-to={move.to}
          data-promotion={move.promotion ?? ""}
          data-special={move.special ?? "none"}
          data-testid={`move-${move.ply}`}
        >
          {move.san}
        </li>
      ))}
    </ol>
  );
}
