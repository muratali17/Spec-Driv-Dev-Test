import type { PieceSymbol, Square } from "chess.js";

/** Human-selectable computer strength. Locked while a game is active. */
export type Difficulty = "easy" | "medium" | "hard";

/** White is always the human; black is always the computer. */
export type Side = "white" | "black";

export type GamePhase = "setup" | "playing" | "ended";

/** Only these two outcomes are application terminal states. */
export type ResultKind = "checkmate" | "stalemate";

export interface GameResult {
  kind: ResultKind;
  winner: Side | null;
}

export type SpecialMoveKind = "castle" | "en-passant" | "promotion" | "capture" | null;

export interface MoveRecord {
  /** 1-based half-move number (white = 1, black = 2, ...). */
  ply: number;
  side: Side;
  san: string;
  from: Square;
  to: Square;
  promotion?: PieceSymbol;
  special: SpecialMoveKind;
}

export interface PromotionRequest {
  from: Square;
  to: Square;
  side: Side;
}

export interface GameState {
  phase: GamePhase;
  difficulty: Difficulty | null;
  fen: string;
  turn: Side;
  selectedSquare: Square | null;
  legalTargets: Square[];
  thinking: boolean;
  check: boolean;
  statusText: string;
  result: GameResult | null;
  moveHistory: MoveRecord[];
  promotion: PromotionRequest | null;
  message: string | null;
  engineError: boolean;
}

/** Fixed difficulty -> search depth mapping (internal, non-UI). */
export type EngineTier = Record<Difficulty, number>;
