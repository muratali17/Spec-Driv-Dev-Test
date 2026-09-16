# Phase 0 Research: Browser Chess vs Computer

**Feature**: `001-chess-vs-computer`
**Date**: 2026-09-16
**Plan**: [plan.md](./plan.md)

This document resolves every technical unknown required before design, and records
the evidence behind each decision. Where behavior was uncertain, it was verified
empirically against the actual packages rather than assumed.

---

## R1. Browser Stockfish package and API

### Decision

Use the **`stockfish` npm package (nmrugg/stockfish.js), version `19.0.0`**, and
specifically the **`lite single-threaded` build**:

- `stockfish-19-lite-single.js` (Emscripten glue, ~21 KB)
- `stockfish-19-lite-single.wasm` (~1.79 MB)

The engine file is copied into `public/engine/` at setup time and instantiated
directly as a Web Worker. The engine speaks the **UCI text protocol** over
`postMessage`/`onmessage`; no third-party wrapper library is required.

### Rationale

- **Runs as a plain static asset.** The single-threaded build does not use
  `SharedArrayBuffer`, so it does **not** require the `COOP`/`COEP`
  cross-origin-isolation headers. This directly satisfies the constitution's
  "static, client-served artifact" requirement (Principles II and III) and keeps
  Playwright/Vite setup trivial.
- **Self-resolving WASM path.** Verified in the shipped glue code: when running as
  a worker, the engine derives the WASM URL from its own script URL by replacing
  `.js` with `.wasm`:
  ```js
  e = self.location.hash.substr(1).split(",");
  u = decodeURIComponent(e[0] || location.origin + location.pathname.replace(/\.js$/i, ".wasm"));
  ```
  Therefore serving `/engine/stockfish-19-lite-single.js` automatically loads
  `/engine/stockfish-19-lite-single.wasm` with no `locateFile` override.
- **Deterministic.** Single-threaded search combined with a fixed `go depth` and a
  cleared transposition table produces identical `bestmove` output run-to-run
  (verified below). This is what makes the difficulty tiers and acceptance tests
  deterministic.
- **Maintained and current.** Stockfish 19, actively published, versus older or
  less convenient alternatives.

### Alternatives considered

| Alternative | Why rejected |
|---|---|
| `stockfish@10.0.2` (nmrugg, 2018) | Much smaller install (~1.5 MB) and the same simple worker API, but the package is stale/unmaintained and pinned to Stockfish 10. Rejected in favor of the maintained current release; noted as a fallback if install size becomes a problem. |
| `@lichess-org/stockfish-web` / `lila-stockfish-web` | Modern and small, but the README explicitly states it is "not straight-forward to load and use"; NNUE networks must be loaded manually via `setNnueBuffer`. Extra complexity with no acceptance-testing benefit. |
| `stockfish.wasm` (niklasf) / multi-threaded builds | Require `SharedArrayBuffer` and thus cross-origin isolation (COOP/COEP) headers, which conflicts with simple static hosting. |
| Full-strength `stockfish-19.js` (~94 MB) | Far larger than needed; the lite build is already far stronger than any human and faster to load. |

### Trade-off and mitigation

The npm tarball ships all four engine flavors and is large (~161 MB unpacked).
Mitigation:

- Install `stockfish` as a **devDependency** (needed only to source the engine
  files at build time).
- A small setup script (`scripts/copy-engine.mjs`) copies **only**
  `stockfish-19-lite-single.js` and `stockfish-19-lite-single.wasm` into
  `public/engine/`.
- `public/engine/` is git-ignored; the copy runs from `predev`, `prebuild`, and
  `pretest`.
- The deployed/static output only contains the ~1.8 MB engine pair.

---

## R2. Stockfish execution model and Web Worker protocol

### Decision

Run Stockfish in a Web Worker and wrap it in a small, typed UCI client. The React
UI never blocks on search. The worker message contract is documented in
[contracts/engine-worker.md](./contracts/engine-worker.md).

### Per-computer-turn UCI sequence (authoritative-state safe)

```
ucinewgame
setoption name Clear Hash value true
position fen <fen from chess.js>       # never Stockfish's own state
go depth <difficulty depth>
... await "bestmove <uci>" ...
```

Then the returned UCI move (`e2e4`, or `e7e8q` when promoting) is applied through
**chess.js**, which is the single source of truth. Stockfish never owns
application state (Architecture requirement 2).

### Rationale

- `ucinewgame` + `Clear Hash` were empirically required to make fixed-depth
  searches deterministic across consecutive positions; without them, residual
  transposition-table state changed the chosen move between runs.
- Sending `position fen` from the authoritative game state (rather than `position
  startpos moves ...`) removes any drift between chess.js and Stockfish.
- `bestmove (none)` can occur in degenerate positions; it is treated as "no
  computer move" and the orchestrator re-derives game end from chess.js.

### Verification performed

- The engine was driven under Node via the package's own interface and produced
  valid `bestmove` output at all tested depths.
- Determinism was measured over repeated runs; see R3.
- Worker/`postMessage` behavior was confirmed by reading the shipped glue
  (`listener: function (e) { postMessage(e) }`, `onmessage` dispatching to
  `processCommand`).

---

## R3. Difficulty tiers (Easy / Medium / Hard)

### Decision

Map each difficulty to a **fixed UCI search depth**, and deliberately **do not
use the `Skill Level` option**:

| Difficulty | Engine configuration | Rationale |
|---|---|---|
| Easy | `go depth 1` | Immediate/shallow; frequently misses multi-move tactics. |
| Medium | `go depth 4` | Sees short tactics and simple threats. |
| Hard | `go depth 12` | Sees deeper tactics; strongest tier. |

The active tier is exposed to the browser as a stable value (e.g.
`data-difficulty="hard"`, `data-engine-depth="12"`) so acceptance tests can assert
the configuration, and each tier's move is asserted on a curated set of positions.

### Rationale and evidence

- **Determinism is mandatory for acceptance testing.** With `Skill Level < 20`,
  the engine intentionally randomizes (it exercises a PRNG). Empirical results on
  the starting position at depth 2 over three runs:

  | Configuration | Moves observed | Deterministic? |
  |---|---|---|
  | `skill 0` | `b1c3`, `e2e3`, `b1c3` | No |
  | `skill 5` | `g1f3`, `b1c3`, `d2d4` | No |
  | `skill 10` | `b1c3`, `d2d4`, `b1c3` | No |
  | `skill 20` (default) + fixed depth | `e2e4`, `e2e4`, `e2e4` | Yes |

  Therefore `Skill Level` is rejected, and strength is varied only by depth.

- **With `ucinewgame` + `Clear Hash` + fixed depth, results are stable.** Starting
  position and a middlegame position were each searched three times at depths
  1, 2, 3, 4, 6, 8, and 10: every depth produced identical moves on all repeats.

- **Depth 12 stays fast on the lite engine** in testing (observed 15–70 ms for the
  positions tried), well within the "respond within a few seconds" assumption.

- **The tiers are observably different on curated positions.** Recorded example
  moves from the pinned engine (single-threaded lite, hash cleared):

  | Position | Depth 1 (Easy) | Depth 4 (Medium) | Depth 12 (Hard) |
  |---|---|---|---|
  | Kiwipete `r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1` | `e2a6` | `e2a6` | `d5e6` |
  | Rook endgame `8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1` | `a5a6` | `b4f4` | `b4f4` |

  Together these show Easy diverging from Hard, and Medium matching a different
  tier on each position — i.e. three tiers with distinct, assertable behavior.

### Curated-fixture policy

Exact expected moves depend on the engine version and build. The planned approach:

1. Pin `stockfish` exactly in `package.json` (no `^`).
2. Generate the curated fixture table offline with the pinned engine and commit it
   as test data (`tests/fixtures/engine-moves.ts`), each entry containing the FEN
   plus the expected UCI move per difficulty.
3. Playwright asserts the app's computer move matches the fixture for the active
   tier.
4. If the engine version is ever bumped, the fixture generator is re-run and the
   change is reviewed — this is documented and intentional, not silent.

FR-008 ("difficulty must not alter rules or legal moves") is satisfied because
difficulty changes only the UCI `go depth` command; legal move generation is
always chess.js.

---

## R4. chess.js as the authoritative rules and game-state engine

### Decision

Use **`chess.js` version `1.4.0`** as the sole authority for legal moves, captures,
check, checkmate, stalemate, castling, en passant, and promotion legality. All
state transitions go through a thin wrapper module; the UI never computes chess
legality itself.

### Relevant API (verified against `dist/types/chess.d.ts`)

- Construct/load/inspect: `new Chess(fen?)`, `load(fen)`, `fen()`, `reset()`,
  `turn()`, `board()`, `get(square)`.
- Move generation/application: `moves()`, `moves({ verbose: true })`,
  `move({ from, to, promotion })`, `undo()`, `history({ verbose: true })`.
- Condition checks: `isCheck()` / `inCheck()`, `isCheckmate()`, `isStalemate()`,
  plus `isDraw()`, `isGameOver()`, `isInsufficientMaterial()`,
  `isThreefoldRepetition()`, `isDrawByFiftyMoves()`.

  **Scope note:** only `isCheckmate()` and `isStalemate()` are in scope as
  application terminal conditions (spec Assumptions). The other draw detectors are
  available in chess.js but MUST NOT be used to end the game; in particular
  `isGameOver()` aggregates all of them, so it is **not** used as the application's
  game-over test. The orchestrator derives terminal state from an explicit
  `deriveResult(chess)` helper that checks only checkmate and stalemate (see
  [data-model.md](./data-model.md#terminal-condition-derivation-authoritative)).
  An out-of-scope draw therefore leaves the game in `playing`.
- `Move` exposes `from`, `to`, `promotion`, `san`, `lan`, and predicates
  `isCapture()`, `isPromotion()`, `isEnPassant()`, `isKingsideCastle()`,
  `isQueensideCastle()`.

### Critical behavioral finding

`move()` **throws** `Error("Invalid move: ...")` for illegal input in 1.4.0 (it
does not return `null`; the type signature says `Move`). The wrapper must
therefore treat illegal human moves and illegal/foreign engine moves as a
try/catch path that leaves the authoritative state unchanged.

Promotion requires the `promotion` field to be supplied explicitly; omitting it
for a promotion move fails the internal match and throws. The UI must therefore
collect the promotion choice before calling `move()` and must not advance the turn
until a piece is chosen.

### Rationale

Constitution Principle V mandates delegating high-risk chess rules to a mature
library. chess.js is the de-facto standard and is pure client-side JavaScript.

---

## R5. Observable thinking state and minimum visible duration

### Decision

The game orchestrator owns an explicit `thinking` boolean and drives this
observable lifecycle:

```
human move -> validate/apply via chess.js -> thinking = true
           -> request Stockfish -> receive bestmove
           -> wait until >= 250 ms elapsed since thinking began
           -> apply/validate via chess.js -> thinking = false
           -> return control to human (unless deriveResult() reports checkmate/stalemate)
```

The minimum duration is enforced by waiting on
`Promise.all([engineMove, delay(remainingMs)])` measured from the moment thinking
began. The state is exposed in the DOM on a stable status element:

- `aria-busy="true"` while thinking,
- `data-thinking="true"` / `data-thinking="false"`,
- visible text such as "Computer is thinking…".

### Rationale

Clarification and FR-016 require a deterministic browser-observable flag **and** a
minimum visible duration of at least 250 ms. The flag guarantees a test can catch
the state; the minimum duration guarantees a human/test can perceive the indicator
even though the engine often answers in milliseconds.

### How tests observe the duration

Playwright installs a `MutationObserver` on the status element (via
`page.evaluate`), records the timestamp when `data-thinking` flips `true` and
again when it flips `false`, and asserts the delta is `>= 250 ms`. No production
timing hooks are needed.

---

## R6. Deterministic positions for complex chess scenarios

### Problem

Checkmate (both sides), stalemate, promotion, castling, and en passant cannot be
reliably reached by playing normal moves, because the computer chooses black's
replies. Reproducing them by move sequence would be brittle or impossible.

### Decision: a minimal, documented test-position hook

The app reads an optional initial-position override from the URL query string at
startup (test/automation affordance, not UI):

- `?fen=<url-encoded FEN>` — seeds the authoritative position through
  `chess.load(fen)` before the game starts.
- `?difficulty=easy|medium|hard` — preselects the difficulty.

No extra controls are added to the production UI. If the seeded FEN is
black-to-move, the normal orchestrator rule "when it is black's turn, the computer
moves" runs the engine automatically — which is exactly the real behavior, not a
special test path. This enables all complex positions:

| Scenario | Seeded FEN to move | How the state is reached |
|---|---|---|
| Human delivers checkmate | White to move, mate-in-1 | Human plays the mating move; chess.js reports checkmate; human wins. |
| Computer delivers checkmate | Black to move, mate-in-1 | Orchestrator runs the engine; computer mates; computer wins. |
| Stalemate | Side to move with no legal moves and not in check | Directly detectable by chess.js after the seeding/next move. |
| Promotion | White pawn on the 7th, clear path | Human moves to the last rank; promotion dialog appears. |
| Castling | White king/rook unmoved, path clear | Human plays king two squares (or the castling destination). |
| En passant | Black pawn just advanced two squares with an en-passant square set | Human captures to the en-passant target. |

### Rationale and alternatives

- Alternatives considered: a hidden debug panel, a `window.__test__` API, or
  adding FEN load controls to the UI. The URL parameter is the least invasive: it
  adds no visible UI, requires no separate test-only bundle, and is itself
  browser-observable and deterministic.
- URL-encoded FENs are exact and human-inspectable in test files, making each
  scenario's setup self-documenting.
- This is a testing affordance only; it does not change gameplay for normal users
  (who simply never pass the parameter).

---

## R7. Build, framework, and state management

### Decisions

- **Vite + React + TypeScript** single-page app; `npm run build` emits static
  assets to `dist/`.
- **No global state library.** Game state lives in one `useReducer`/custom hook
  (`useChessGame`) plus local component state. This is sufficient because the
  state is a single session with a linear lifecycle; Redux/Zustand would be
  premature (Principles IX and X).
- **Click/tap select-then-destination** only; drag-and-drop is out of scope.
- Board squares are buttons in a `role="grid"` of `role="gridcell"` buttons with
  stable `data-square` values and accessible names, so Playwright can target them
  semantically. See [contracts/ui-observability.md](./contracts/ui-observability.md).

### Rationale

The stack was specified by the feature request. The constitution explicitly
prefers simple React state and warns against premature abstraction and
dependencies.

---

## R8. Acceptance testing and agent-driven validation

### Decisions

- **Playwright Test** (`@playwright/test`) drives spec-level acceptance tests. It
  is configured with a `webServer` that builds and serves the static output (or
  runs the Vite preview server) so tests start deterministically with no manual
  setup (Principle XII).
- **Playwright MCP** is the agent-driven browser validation tool used during
  development to exercise the running app interactively; it reuses the same
  accessible selectors and observable state as the automated suite.
- Tests are organized by user story / scenario and share FEN fixtures and
  difficulty fixtures.

### Rationale

The feature request names Playwright and Playwright MCP explicitly. Using a
single set of stable selectors for both prevents drift between automated and
agent-driven validation.

---

## R9. Responsive/mobile layout

### Decision

Lay out the board and panels with CSS that scales the board to the viewport
(e.g. `min(90vw, 90vh, 560px)`), stacks status/history vertically on narrow
screens, and avoids fixed widths that force horizontal scrolling. Acceptance
testing covers 480 px, 375 px, and the guaranteed minimum of 320 px.

### Rationale

Satisfies FR-036/FR-037 and SC-011 without added complexity or a UI framework.
Constitution Principle VIII keeps styling proportionate to testing goals.

---

## Summary of resolved unknowns

| Unknown | Resolution |
|---|---|
| Which browser Stockfish package/API | `stockfish@19.0.0`, `lite-single` build, used directly as a Web Worker via UCI over `postMessage`. |
| How the WASM binary is located | Automatically: engine replaces `.js` with `.wasm` in its own URL; files copied to `public/engine/`. |
| How Easy/Medium/Hard are defined | Fixed search depths 1 / 4 / 12; `Skill Level` rejected because it is nondeterministic. |
| How tiers become browser-observable | `data-difficulty` and `data-engine-depth` on the status region plus curated expected-move fixtures. |
| Authoritative game state | chess.js 1.4.0; `move()` throws on illegal input and must be wrapped. |
| Deterministic engine output | `ucinewgame` + `Clear Hash` + fixed `go depth`; verified repeatable. |
| Thinking-state observability | `thinking` flag in orchestrator, `data-thinking`/`aria-busy` in DOM, minimum 250 ms enforced and MutationObserver-assertable. |
| Complex test positions | `?fen=` startup override plus normal black-to-move auto-run; no production UI changes. |
| Static deployability | Vite build to `dist/`; no backend, DB, or runtime API; single-threaded engine needs no special headers. |

No `NEEDS CLARIFICATION` items remain.
