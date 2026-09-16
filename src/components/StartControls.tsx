export interface StartControlsProps {
  onStart: () => void;
  onRestart: () => void;
  message: string | null;
}

export function StartControls({ onStart, onRestart, message }: StartControlsProps) {
  return (
    <div className="controls">
      <button type="button" className="controls__button" data-testid="start-game" onClick={onStart}>
        Start Game
      </button>
      <button
        type="button"
        className="controls__button"
        data-testid="restart-game"
        onClick={onRestart}
      >
        Restart Game
      </button>
      {message ? (
        <p role="status" className="message" data-testid="message">
          {message}
        </p>
      ) : null}
    </div>
  );
}
