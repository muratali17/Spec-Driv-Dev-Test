import { Chess } from "chess.js";
import type { PieceSymbol, Square } from "chess.js";

export interface ScriptedMove {
  from: Square;
  to: Square;
  promotion?: PieceSymbol;
}

export interface EnginePosition {
  id: string;
  description: string;
  /** White-to-move seed position. */
  seedFen: string;
  /** Fixed legal white move that produces the black-to-move position. */
  whiteMove: ScriptedMove;
}

/**
 * Curated positions the engine is asserted on (research R3). The engine only ever
 * plays black in the app, so each entry defines a scripted white move whose result
 * is a black-to-move FEN. Expected replies are generated into `engine-moves.ts`.
 */
export const ENGINE_POSITIONS: EnginePosition[] = [
  {
    id: "kiwipete",
    description: "Kiwipete middlegame; white plays Bxa6. Tiers diverge (research R3).",
    seedFen: "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1",
    whiteMove: { from: "e2", to: "a6" },
  },
  {
    id: "rook-endgame",
    description: "Rook endgame; white plays Rxf4+. Tiers diverge (research R3).",
    seedFen: "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1",
    whiteMove: { from: "b4", to: "f4" },
  },
];

/** Compute the black-to-move FEN produced by a curated position's scripted move. */
export function blackToMoveFenFor(position: EnginePosition): string {
  const chess = new Chess(position.seedFen);
  chess.move(position.whiteMove);
  return chess.fen();
}

/** Standard chess starting position (used for FR-008 and engine-failure scenarios). */
export const STANDARD_START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/**
 * White to move and already in check (black rook e2 checks the white king on e1).
 * Deterministic: no engine turn runs, so `data-check="true"` is stable on start.
 */
export const CHECK_IN_PROGRESS_FEN = "4k3/8/8/8/8/8/4r3/4K3 w - - 0 1";

/** White to move; a1a8 delivers check to the black king on e8. */
export const CHECK_DELIVERY_FEN = "4k3/8/8/8/8/8/8/R3K3 w Q - 0 1";
export const CHECK_DELIVERY_MOVE: ScriptedMove = { from: "a1", to: "a8" };

/** White to move; a1a8 is back-rank checkmate. */
export const HUMAN_MATE_IN_1_FEN = "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1";
export const HUMAN_MATE_IN_1_MOVE: ScriptedMove = { from: "a1", to: "a8" };

/** Black (computer) to move; a8a1 is back-rank checkmate against white. */
export const COMPUTER_MATE_IN_1_FEN = "r5k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1";

/** Black to move with no legal moves and not in check -> stalemate. */
export const STALEMATE_FEN = "7k/5Q2/6K1/8/8/8/8/8 b - - 0 1";

/** White pawn on d7 with a clear path to promotion; kings far apart. */
export const PROMOTION_FEN = "k7/3P4/8/8/8/8/8/4K3 w - - 0 1";
export const PROMOTION_MOVE: ScriptedMove = { from: "d7", to: "d8" };

/** White king and both rooks eligible to castle with clear paths. */
export const CASTLING_FEN = "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1";
export const CASTLING_MOVE: ScriptedMove = { from: "e1", to: "g1" };

/** Kingside castling is blocked by the bishop on f1. */
export const CASTLING_BLOCKED_FEN = "r3k2r/8/8/8/8/8/8/R3KB1R w KQkq - 0 1";

/** Black has just played ...d7-d5; en passant target d6 is set. */
export const EN_PASSANT_FEN = "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1";
export const EN_PASSANT_MOVE: ScriptedMove = { from: "e5", to: "d6" };

/** Same pawns as above but with no en-passant target, so the capture is illegal. */
export const EN_PASSANT_UNAVAILABLE_FEN = "4k3/8/8/3pP3/8/8/8/4K3 w - - 0 1";

/** Kings only: insufficient material, an out-of-scope draw that keeps playing. */
export const INSUFFICIENT_MATERIAL_FEN = "8/8/8/4k3/8/8/4K3/8 w - - 0 1";

/** Open position where white can give check with a bishop/rook, used for engine checks. */
export const ENGINE_CHECK_FEN = "4k3/8/8/8/8/8/8/R3K3 w Q - 0 1";
