# Phase 1 Data Model: Browser Chess vs Computer

**Feature**: `001-chess-vs-computer`
**Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

The model is intentionally small. `chess.js` owns the board/fen/history inside the
session; the application keeps only the state needed to drive the UI and the
turn lifecycle. All types live in `src/game/types.ts`.

---

## Enumerations

### `Difficulty`
- `"easy" | "medium" | "hard"`
- Selected before start; immutable while a game is active (FR-006). Changing it
  requires a restart.

### `Side`
- `"white" | "black"` — white is always the human, black is always the computer
  (FR-001).

### `GamePhase`
- `"setup"` — no game started; difficulty may be chosen (FR-002, FR-005).
- `"playing"` — a game is in progress.
- `"ended"` — terminal result reached; no further moves accepted (FR-027).

### `ResultKind`
- `"checkmate" | "stalemate"` — the **only** terminal outcomes in scope. Other
  draws from tournament chess (threefold repetition, the fifty-move rule, and
  insufficient material) are explicitly out of scope (spec Assumptions) and are
  **not** application terminal states.

### Terminal-condition derivation (authoritative)

Application terminal state is derived **only** from the two in-scope conditions,
using an explicit helper rather than `chess.isGameOver()`:

```ts
function deriveResult(chess: Chess): GameResult | null {
  if (chess.isCheckmate()) {
    // The side to move is the mated side; the winner is the other side.
    return { kind: "checkmate", winner: chess.turn() === "w" ? "black" : "white" };
  }
  if (chess.isStalemate()) {
    return { kind: "stalemate", winner: null };
  }
  return null; // not an application terminal state
}
```

- `chess.isGameOver()` is **not** used to decide whether the application ends,
  because it also returns `true` for out-of-scope draws
  (`isThreefoldRepetition()`, `isDrawByFiftyMoves()`, `isInsufficientMaterial()`,
  and `isDraw()`).
- If `isGameOver()` is true but neither `isCheckmate()` nor `isStalemate()` holds
  (an out-of-scope draw), `deriveResult` returns `null` and the game **continues**
  in `playing`. This matches the spec's explicit exclusion and does not expand
  scope.
- `deriveResult` is the single source of truth for `phase === "ended"` and for
  `data-result` / `data-winner`; no other code checks game-over conditions.

### `EngineTier` (internal, non-UI)
- Fixed mapping used by the orchestrator and asserted by tests:

  | Difficulty | `depth` |
  |---|---|
  | easy | 1 |
  | medium | 4 |
  | hard | 12 |

---

## Entities

### `GameState` (owned by `useChessGame`)
The single source of truth for the UI. The `Chess` instance is authoritative for
rules; the surrounding fields describe session and orchestration.

| Field | Type | Description | Validation |
|---|---|---|---|
| `phase` | `GamePhase` | Setup / playing / ended. | Transitions only as defined below. |
| `difficulty` | `Difficulty \| null` | Selected tier. | `null` blocks start (FR-005). |
| `fen` | `string` | Current authoritative FEN, derived from `chess.fen()`. | Always a legal chess.js position. |
| `turn` | `Side` | Side to move, from `chess.turn()`. | Mirrors chess.js exactly. |
| `selectedSquare` | `Square \| null` | Currently selected human piece. | Only white pieces while human may act (FR-010, FR-013). |
| `legalTargets` | `Square[]` | Legal destinations for `selectedSquare` (from chess.js). | Derived; never hand-computed. |
| `thinking` | `boolean` | Computer is calculating/applying. | True only during a computer turn; cleared after apply (FR-016). |
| `statusText` | `string` | Human-readable status. | Derived from phase/turn/check/result. |
| `check` | `boolean` | Side to move is in check. | `chess.isCheck()`. |
| `result` | `{ kind: ResultKind; winner: Side \| null } \| null` | Terminal outcome. | Set only by `deriveResult()` (checkmate/stalemate); never from `isGameOver()` alone. |
| `moveHistory` | `MoveRecord[]` | Ordered move log. | Append on each applied move. |
| `promotion` | `PromotionRequest \| null` | Pending promotion choice. | Blocks turn advance until resolved. |
| `message` | `string \| null` | Non-disruptive feedback (e.g. illegal move). | Cleared on next valid action. |

### `MoveRecord`
One applied half-move, attributed to the side that made it (FR-032).

| Field | Type | Description |
|---|---|---|
| `index` | `number` | 1-based half-move number. |
| `side` | `Side` | `"white"` (human) or `"black"` (computer). |
| `san` | `string` | Standard algebraic notation from chess.js. |
| `from` / `to` | `Square` | Origin/destination. |
| `promotion` | `PieceSymbol \| undefined` | Promotion piece, when applicable. |
| `special` | `"castle" \| "en-passant" \| "promotion" \| "capture" \| null` | Derived from `Move` predicates for display/tests. |

### `PromotionRequest`
Created when a human pawn move reaches the last rank (FR-024).

| Field | Type | Description |
|---|---|---|
| `from` / `to` | `Square` | The pending pawn move. |
| `side` | `Side` | Always `"white"` for the human in scope. |

Invariant: while `promotion` is non-null, `turn` does not advance and no other
move is accepted (spec Edge Case). The chosen type (`q|r|b|n`) is passed to
`chess.move({ from, to, promotion })`.

### `Square`
- One of the 64 algebraic squares (`a1`–`h8`), matching chess.js `Square`.
- Rendered as an accessible button carrying `data-square` and a piece description.

### `Piece` (presentation only)
- Derived from `chess.board()` / `chess.get(square)`.
- Fields: `color: "w" | "b"`, `type: "p" | "n" | "b" | "r" | "q" | "k"`.
- Not persisted separately; chess.js remains authoritative.

### `EngineRequest` / `EngineResponse` (Worker boundary)
See [contracts/engine-worker.md](./contracts/engine-worker.md). The client sends a
FEN and a fixed depth, and receives a UCI move string.

---

## State Transitions

### Game phase

```
setup --select difficulty--> setup (difficulty set; still not started)
setup --start (difficulty != null)--> playing
setup --start (difficulty == null)--> setup  + message "select a difficulty"
playing --deriveResult() reports checkmate or stalemate--> ended
playing --restart--> setup (difficulty cleared, history/status cleared)
ended   --restart--> setup (difficulty cleared, history/status cleared)
```

### Turn + thinking lifecycle (FR-014, FR-016, FR-017, FR-018)

```
HUMAN_TURN
  | human clicks own white piece
  v
PIECE_SELECTED (legalTargets computed via chess.js)
  | human clicks legal target
  v
apply via chess.move()  -- throws --> ILLEGAL: message set, state unchanged, HUMAN_TURN
  | success
  v
if promotion needed -> PROMOTION_PENDING (blocks until chosen, then apply)
  |
  v
append MoveRecord
  |
  v
deriveResult(chess): checkmate/stalemate? -> ENDED (record result)
  | (out-of-scope draws are ignored: no terminal, continue)
  v
COMPUTER_THINKING (thinking = true; input blocked)
  | request bestmove from Worker (position fen, go depth tier)
  | receive move; wait until >= 250 ms since thinking began
  v
apply/validate via chess.move()  -- invalid/none --> ENDED or refetch (never mutate raw state)
  |
  v
thinking = false; append MoveRecord
  |
  v
deriveResult(chess): checkmate/stalemate? -> ENDED (record result)
  else -> HUMAN_TURN
```

### Restart (FR-033, FR-034, FR-035)

```
any phase/state --restart--> 
  cancel/ignore any in-flight engine request (generation token),
  chess.reset(),
  clear selection, legalTargets, promotion, message, history, result, thinking,
  difficulty = null, phase = setup
```

Invariant: a restart increments an orchestration generation token captured by the
in-flight computer turn; a late `bestmove` from an abandoned generation is
discarded and never applied.

---

## Validation Rules (traceability)

| Rule | Source | Enforcement |
|---|---|---|
| Only legal moves accepted | FR-011 | `chess.move()` in wrapper; illegal input caught and ignored. |
| Board unchanged on illegal move; turn retained | FR-012 | Wrapper returns `{ ok: false }`; reducer does not mutate. |
| Human cannot select/move black pieces | FR-013 | Selection rejects `color !== 'w'`. |
| Exactly one computer reply per human move | FR-014 | Single engine request per completed human turn. |
| Computer move must be legal | FR-015 | Applied through `chess.move()`; invalid result rejected. |
| Thinking observable ≥ 250 ms | FR-016 | Orchestrator gate + DOM flags. |
| Input blocked while thinking | FR-017 | Click handlers no-op when `thinking` or `turn !== 'white'`. |
| No moves after game end | FR-027 | `phase === 'ended'` disables the board. |
| Difficulty immutable during play | FR-006 | Selector hidden/disabled while `phase === 'playing'`. |
| Difficulty does not change rules | FR-008 | Difficulty only affects the UCI `go depth` value. |
| Promotion must resolve before turn advance | FR-024, edge case | `promotion` pending blocks other actions. |
| Restart abandons pending computer move | FR-035 | Generation token check on `bestmove`. |

---

## Derived / observable projections

The UI derives its `data-*` state directly from `GameState` (see
[contracts/ui-observability.md](./contracts/ui-observability.md)):

| DOM value | Derived from |
|---|---|
| `data-phase` | `phase` |
| `data-turn` | `turn` |
| `data-thinking` | `thinking` |
| `data-check` | `check` |
| `data-result` | `result?.kind ?? "none"` |
| `data-winner` | `result?.winner ?? "none"` |
| `data-difficulty` | `difficulty ?? "none"` |
| `data-engine-depth` | `difficulty ? tierDepth[difficulty] : "none"` |
| move list items | `moveHistory` |
