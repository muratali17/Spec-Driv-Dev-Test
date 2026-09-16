# Contract: Stockfish Web Worker Boundary

**Feature**: `001-chess-vs-computer`

Stockfish is the computer opponent **only**. It receives a position and a search
depth, and returns a move. It never owns or mutates application state; the returned
move is applied and validated by `chess.js` via the game layer (Architecture
requirement 2).

## Worker identity and loading

- Worker script: `public/engine/stockfish-19-lite-single.js` (served statically).
- The engine resolves its own WASM by replacing `.js` with `.wasm` in its URL; no
  `locateFile` override is needed as long as both files are served side by side.
- Instantiated as a classic worker:
  ```ts
  new Worker(`${import.meta.env.BASE_URL}engine/stockfish-19-lite-single.js`)
  ```
- No `SharedArrayBuffer` and no cross-origin-isolation headers are required.

## Message format

Both directions are **UTF-8 strings** (UCI lines). The engine posts one line per
`postMessage`. Multiple lines may occasionally be batched; the client splits on
`\n`.

### Client -> Worker (UCI commands)

| Command | Purpose |
|---|---|
| `uci` | Handshake; expect `uciok` and `option` lines. |
| `isready` | Readiness handshake; expect `readyok`. |
| `ucinewgame` | Reset engine game state (per computer turn). |
| `setoption name Clear Hash value true` | Clear transposition table for determinism. |
| `position fen <FEN>` | Set the authoritative position from `chess.fen()`. |
| `go depth <N>` | Begin a fixed-depth search on the current position. |
| `stop` | Abort the current search (used on restart/dispose). |
| `quit` | Terminate the engine. |

### Worker -> Client (UCI output)

| Line pattern | Meaning |
|---|---|
| `uciok` | Handshake complete. |
| `readyok` | Ready. |
| `info ... depth <d> ... score ...` | Progress/evaluation (ignored by the game, optionally logged). |
| `bestmove <from><to>[promotion]` | Chosen move in UCI form, e.g. `e2e4`, `e7e8q`. |
| `bestmove (none)` | No legal move; the game layer treats this as "no computer move". |

## Client API (`src/engine/stockfishClient.ts`)

```ts
export interface StockfishClient {
  /** Handshake (`uci`/`isready`); resolves when the engine is ready. */
  init(): Promise<void>;
  /** Search a fresh position at a fixed depth; resolves the bestmove UCI or null. */
  findBestMove(fen: string, depth: number): Promise<string | null>;
  /** Stop any active search and terminate the worker. */
  dispose(): void;
}
```

### Per-call protocol (must be followed exactly)

```
ucinewgame
setoption name Clear Hash value true
position fen <fen>
go depth <depth>
(a wait for the next "bestmove ..." line)
```

- `init()` is called once at app start (or lazily on first computer turn) and is
  idempotent.
- `findBestMove` must not be called concurrently; the orchestrator ensures one
  computer turn at a time.
- The depth passed in comes from `difficulty.ts`; the client has no difficulty
  knowledge.

## Difficulty mapping (`src/engine/difficulty.ts`)

```ts
export const TIER_DEPTH: Record<Difficulty, number> = {
  easy: 1,
  medium: 4,
  hard: 12,
};
```

- Deterministic because search is fixed-depth and single-threaded, and the hash is
  cleared before each search (see research R3).
- `Skill Level` is intentionally **not** used; it randomizes output.

## Cancellation / restart semantics

- The orchestrator tracks a monotonically increasing `generation` token.
- On restart (or new game), the generation increments; any `bestmove` resolving
  for an older generation is discarded and never applied (FR-035).
- Optionally the client sends `stop` on restart; correctness does not depend on it
  because of the generation check.

## Error handling

- If the worker fails to load or does not answer within a bounded timeout, the
  computer turn ends without a move and the game reports a recoverable status.
- An invalid or illegal `bestmove` is rejected by `chess.js`; the raw FEN is never
  trusted as game state.
