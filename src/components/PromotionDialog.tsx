import type { PieceSymbol } from "chess.js";

const OPTIONS: { piece: PieceSymbol; label: string }[] = [
  { piece: "q", label: "Queen" },
  { piece: "r", label: "Rook" },
  { piece: "b", label: "Bishop" },
  { piece: "n", label: "Knight" },
];

export interface PromotionDialogProps {
  onChoose: (piece: PieceSymbol) => void;
}

export function PromotionDialog({ onChoose }: PromotionDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose promotion piece"
      className="promotion"
      data-testid="promotion-dialog"
    >
      <p className="promotion__title">Choose a promotion piece</p>
      <div className="promotion__options">
        {OPTIONS.map((option) => (
          <button
            key={option.piece}
            type="button"
            className="promotion__option"
            data-testid={`promote-${option.piece}`}
            onClick={() => onChoose(option.piece)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
