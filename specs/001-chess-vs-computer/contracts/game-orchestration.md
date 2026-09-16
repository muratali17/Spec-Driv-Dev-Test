# Contract: Game Orchestration (`useChessGame`)

**Feature**: `001-chess-vs-computer`

The orchestrator is the only place that sequences human moves, computer turns, the
thinking state, and restart. It is a single React hook backed by `useReducer`
plus a `Chess` instance and a `StockfishClient`. It exposes state to components and
actions to the board/controls.

## Owned state

```ts
interface GameState {
  phase: "setup" | "playing" | "ended";
  difficulty: Difficulty | null;
  fen: string;
  turn: "white" | "black";
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
```

Full field definitions: [data-model.md](../data-model.md).

## Exposed actions

| Action | Behavior |
|---|---|
| `selectDifficulty(difficulty)` | Allowed only in `setup`; sets or clears the choice. |
| `startGame()` | Requires a difficulty. If a `?fen=` seed is present, loads that FEN; otherwise resets the `Chess` instance to the standard start position. Sets `phase = "playing"`. If the resulting position is black to move, immediately begins a computer turn. |
| `handleSquareClick(square)` | Implements select-then-destination; no-op when blocked. |
| `choosePromotion(piece)` | Completes a pending promotion through `chess.js`. |
| `restartGame()` | Full reset to `setup`; increments the generation token; abandons any in-flight computer move; clears `engineError`. |

## Human interaction rules (`handleSquareClick`)

1. No-op if `phase === "ended"`, if `thinking === true`, if `turn !== "white"`, or
   if `promotion !== null`.
2. If no square is selected:
   - If the clicked square holds a white piece, select it and compute
     `legalTargets` from `chess.moves({ square, verbose: true })`.
   - Otherwise ignore (including black pieces — FR-013).
3. If a square is selected:
   - Clicking the same square cancels the selection.
   - Clicking another own white piece moves the selection.
   - Clicking a legal target attempts the move through the game layer.
   - Clicking an illegal target leaves the board unchanged, keeps the selection
     behavior defined by the spec, and sets a non-disruptive `message`.

## Move application (authoritative)

All mutations go through `src/game/chessGame.ts`, never directly through React
state:

```ts
// attempt a human move
try {
  const move = chess.move({ from, to, promotion? });
  // success: append MoveRecord, update fen/turn/check/result
} catch (err) {
  // illegal: state unchanged, set message
}
```

- `chess.js` `move()` throws on illegal input (research R4); it must be caught.
- Promotion: if the selected move is a pawn reaching the last rank, set
  `promotion` and do **not** call `chess.move` until a piece is chosen.

## Computer turn (`runComputerTurn`)

```
if phase !== "playing" or generation changed: abort
thinking = true                       // DOM: data-thinking="true"
const startedAt = performance.now()
const generation = currentGeneration
const best = await engine.findBestMove(chess.fen(), TIER_DEPTH[difficulty])
await delay(max(0, 250 - (performance.now() - startedAt)))
if generation !== currentGeneration: return            // restart happened
if best == null: engineError = true; thinking = false; return   // DOM: data-engine-error="true"
try { apply chess.move(parseUci(best)) } catch { engineError = true; thinking = false; return }
thinking = false                     // DOM: data-thinking="false"
append MoveRecord; result = deriveResult(chess)
if result == null: return control to human (turn is now white)
```

`engine.findBestMove` resolves `null` when the worker fails to load, the bounded
timeout elapses, or no move is available; the orchestrator maps that to
`engineError = true` (FR-040). This is a terminal-for-the-turn error state: the
turn does not advance to the human and no further moves are forced. `engineError`
is cleared by `restartGame()`.

Guarantees:

- `thinking` is set before the engine request and cleared only after the move is
  applied (FR-016).
- The indicator is visible for at least 250 ms (FR-016, SC-004).
- Exactly one computer move per completed human turn (FR-014).
- The computer move is validated through `chess.js` (FR-015).
- Abandoned turns are dropped via the generation token (FR-035).
- Engine failure is deterministic and browser-observable; the normal thinking
  contract is unchanged when the engine succeeds (FR-040, SC-014).

## Terminal-state evaluation

Application terminal state is derived **explicitly** from the only in-scope
conditions, never from `chess.isGameOver()`:

```ts
function deriveResult(chess: Chess): GameResult | null {
  if (chess.isCheckmate()) {
    // The side to move is the mated side; the winner is the other side.
    return { kind: "checkmate", winner: chess.turn() === "w" ? "black" : "white" };
  }
  if (chess.isStalemate()) return { kind: "stalemate", winner: null };
  return null; // not an application terminal state
}
```

After every applied move (human or computer):

- `isCheckmate()` -> `phase = "ended"`, `result = { kind: "checkmate", winner }`.
- `isStalemate()` -> `phase = "ended"`, `result = { kind: "stalemate", winner:
  null }`.
- `isCheck()` -> `check = true` (displayed; game continues).
- Any other `isGameOver()` condition (`isThreefoldRepetition()`,
  `isDrawByFiftyMoves()`, `isInsufficientMaterial()`, `isDraw()`) is **out of
  scope** and is ignored: the game remains in `playing` and `result` stays `null`.
- Once `phase === "ended"`, `handleSquareClick` is a no-op (FR-027).

This keeps terminal application state limited to the two outcomes the
specification defines and does not expand feature scope.

## Determinism and test affordance

At startup, `src/test/startupOptions.ts` may read a `?fen=` override and a
`?difficulty=` preselect from the URL (research R6). The override is applied
through `chess.load(fen)` before `phase` leaves `setup`. No other test-specific
code path exists.

## Module boundaries

| Module | Responsibility | Must not |
|---|---|---|
| `components/*` | Render state; dispatch user intent. | Contain chess rules or engine calls. |
| `game/chessGame.ts` | Wrap chess.js; authoritative operations. | Touch React or the Worker. |
| `game/useChessGame.ts` | Orchestrate turns/thinking/restart. | Compute chess legality by hand. |
| `engine/stockfishClient.ts` | UCI over Worker; return a move. | Mutate game state. |
| `engine/difficulty.ts` | Difficulty -> depth map. | Change chess rules. |
| `test/startupOptions.ts` | Parse URL test affordance. | Add UI. |
