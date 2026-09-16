import { Chess } from "chess.js";
import type { Color, Move, PieceSymbol, Square } from "chess.js";
import type { GameResult, MoveRecord, Side, SpecialMoveKind } from "./types";

export type MoveAttempt = { ok: true; move: Move } | { ok: false; error: string };

export function createChess(fen?: string): Chess {
  return fen ? new Chess(fen) : new Chess();
}

export function loadPosition(chess: Chess, fen: string): boolean {
  try {
    chess.load(fen);
    return true;
  } catch {
    return false;
  }
}

export function resetPosition(chess: Chess): void {
  chess.reset();
}

export function sideOf(color: Color): Side {
  return color === "w" ? "white" : "black";
}

/**
 * Apply a move through chess.js. `move()` throws on illegal input in chess.js
 * 1.4.0 (research R4), so illegal moves are caught and reported without mutating
 * authoritative state.
 */
export function attemptMove(
  chess: Chess,
  from: Square,
  to: Square,
  promotion?: PieceSymbol,
): MoveAttempt {
  try {
    const move = chess.move({ from, to, promotion });
    return { ok: true, move };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invalid move" };
  }
}

/** Sorted unique legal destination squares for a piece, derived from chess.js. */
export function getLegalTargets(chess: Chess, square: Square): Square[] {
  const targets = chess.moves({ square, verbose: true }).map((move) => move.to);
  return [...new Set(targets)].sort();
}

/** Verbose moves from `from` to `to` (used to detect promotion). */
export function getMoveOptions(chess: Chess, from: Square, to: Square): Move[] {
  return chess
    .moves({ square: from, verbose: true })
    .filter((move) => move.to === to);
}

export function describeSpecial(move: Move): SpecialMoveKind {
  if (move.isKingsideCastle() || move.isQueensideCastle()) return "castle";
  if (move.isEnPassant()) return "en-passant";
  if (move.isPromotion()) return "promotion";
  if (move.isCapture()) return "capture";
  return null;
}

/** Single owner of the `special` field derivation (T033). */
export function toMoveRecord(move: Move, ply: number): MoveRecord {
  return {
    ply,
    side: sideOf(move.color),
    san: move.san,
    from: move.from,
    to: move.to,
    promotion: move.promotion,
    special: describeSpecial(move),
  };
}

/**
 * The only source of truth for terminal game state. Deliberately does NOT use
 * `chess.isGameOver()`, which also aggregates out-of-scope draws (research R4,
 * data-model.md).
 */
export function deriveResult(chess: Chess): GameResult | null {
  if (chess.isCheckmate()) {
    return { kind: "checkmate", winner: chess.turn() === "w" ? "black" : "white" };
  }
  if (chess.isStalemate()) {
    return { kind: "stalemate", winner: null };
  }
  return null;
}
