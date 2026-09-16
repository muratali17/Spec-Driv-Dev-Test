import type { Piece, Square as SquareName } from "chess.js";

const PIECE_NAMES: Record<string, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

const WHITE_GLYPHS: Record<string, string> = {
  p: "\u2659",
  n: "\u2658",
  b: "\u2657",
  r: "\u2656",
  q: "\u2655",
  k: "\u2654",
};

const BLACK_GLYPHS: Record<string, string> = {
  p: "\u265F",
  n: "\u265E",
  b: "\u265D",
  r: "\u265C",
  q: "\u265B",
  k: "\u265A",
};

function glyphFor(piece: Piece): string {
  return (piece.color === "w" ? WHITE_GLYPHS : BLACK_GLYPHS)[piece.type];
}

export interface SquareProps {
  square: SquareName;
  piece: Piece | null;
  selected: boolean;
  legalTarget: boolean;
  onSelect: (square: SquareName) => void;
}

export function Square({ square, piece, selected, legalTarget, onSelect }: SquareProps) {
  const side = piece ? (piece.color === "w" ? "white" : "black") : "none";
  const pieceType = piece ? piece.type : "";
  const label = piece ? `${square}, ${side} ${PIECE_NAMES[piece.type]}` : `${square}, empty`;
  const className = [
    "square",
    selected ? "square--selected" : "",
    legalTarget ? "square--target" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={className}
      data-square={square}
      data-side={side}
      data-piece={pieceType}
      aria-label={label}
      aria-selected={selected}
      onClick={() => onSelect(square)}
    >
      {piece ? glyphFor(piece) : ""}
    </button>
  );
}
