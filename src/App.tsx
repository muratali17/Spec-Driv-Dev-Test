import { Board } from "./components/Board";
import { DifficultySelector } from "./components/DifficultySelector";
import { GameStatus } from "./components/GameStatus";
import { MoveHistory } from "./components/MoveHistory";
import { PromotionDialog } from "./components/PromotionDialog";
import { StartControls } from "./components/StartControls";
import { useChessGame } from "./game/useChessGame";

export function App() {
  const {
    state,
    board,
    engineDepth,
    selectDifficulty,
    startGame,
    handleSquareClick,
    choosePromotion,
    restartGame,
  } = useChessGame();

  return (
    <main className="app">
      <h1 className="app__title">Chess vs Computer</h1>
      <GameStatus
        phase={state.phase}
        turn={state.turn}
        thinking={state.thinking}
        check={state.check}
        result={state.result}
        difficulty={state.difficulty}
        engineDepth={engineDepth}
        engineError={state.engineError}
        legalTargets={state.legalTargets}
        statusText={state.statusText}
      />
      <DifficultySelector
        value={state.difficulty}
        disabled={state.phase !== "setup"}
        onChange={selectDifficulty}
      />
      <StartControls onStart={startGame} onRestart={restartGame} message={state.message} />
      <Board
        board={board}
        selectedSquare={state.selectedSquare}
        legalTargets={state.legalTargets}
        onSquareClick={handleSquareClick}
      />
      {state.promotion ? <PromotionDialog onChoose={choosePromotion} /> : null}
      <MoveHistory moves={state.moveHistory} />
    </main>
  );
}
