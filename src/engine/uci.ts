import type { PieceSymbol, Square } from "chess.js";

export interface ParsedUciMove {
  from: Square;
  to: Square;
  promotion?: PieceSymbol;
}

const UCI_MOVE = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/;

/** Split a (possibly batched) engine message into trimmed non-empty lines. */
export function splitLines(chunk: string): string[] {
  return chunk
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** Extract the move from a `bestmove ...` line; `null` for `bestmove (none)`. */
export function parseBestMove(line: string): string | null {
  const match = line.match(/^bestmove\s+(\S+)/);
  if (!match) return null;
  return match[1] === "(none)" ? null : match[1];
}

/** Parse a UCI move string (e.g. `e2e4`, `e7e8q`) into squares. */
export function parseUci(uci: string): ParsedUciMove | null {
  const match = uci.trim().match(UCI_MOVE);
  if (!match) return null;
  const [, from, to, promotion] = match;
  const parsed: ParsedUciMove = { from: from as Square, to: to as Square };
  if (promotion) parsed.promotion = promotion as PieceSymbol;
  return parsed;
}
