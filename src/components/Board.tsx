import type { Piece, Square as SquareName } from "chess.js";
import { Square } from "./Square";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

export interface BoardProps {
  board: (Piece | null)[][];
  selectedSquare: SquareName | null;
  legalTargets: SquareName[];
  onSquareClick: (square: SquareName) => void;
}

export function Board({ board, selectedSquare, legalTargets, onSquareClick }: BoardProps) {
  return (
    <div role="grid" aria-label="Chess board" className="board" data-testid="board">
      {board.map((row, rowIndex) => (
        <div role="row" className="board__row" key={rowIndex}>
          {row.map((piece, columnIndex) => {
            const name = `${FILES[columnIndex]}${8 - rowIndex}` as SquareName;
            const isLight = (rowIndex + columnIndex) % 2 === 0;
            return (
              <div
                role="gridcell"
                className={`board__cell board__cell--${isLight ? "light" : "dark"}`}
                key={name}
              >
                <Square
                  square={name}
                  piece={piece}
                  selected={selectedSquare === name}
                  legalTarget={legalTargets.includes(name)}
                  onSelect={onSquareClick}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
