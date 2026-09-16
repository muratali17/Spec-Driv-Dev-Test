import type { Difficulty } from "../game/types";

const OPTIONS: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

export interface DifficultySelectorProps {
  value: Difficulty | null;
  disabled: boolean;
  onChange: (difficulty: Difficulty) => void;
}

export function DifficultySelector({ value, disabled, onChange }: DifficultySelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Difficulty"
      className="difficulty"
      data-testid="difficulty-selector"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          data-testid={`difficulty-${option.value}`}
          className={`difficulty__option${value === option.value ? " difficulty__option--active" : ""}`}
          disabled={disabled}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
