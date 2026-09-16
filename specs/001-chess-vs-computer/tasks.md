---
description: "Task list for Browser Chess vs Computer implementation"
---

# Tasks: Browser Chess vs Computer

**Input**: Design documents from `/specs/001-chess-vs-computer/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Included — Playwright acceptance tests are explicitly required by the specification
(FR-038, FR-039, SC-012, SC-013) and the plan (`@playwright/test`, Playwright MCP). Tests are
written before implementation within each user story phase.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US6)
- All tasks include exact file paths

## Path Conventions

Single frontend project (per plan.md): `src/`, `tests/`, `scripts/`, `public/` at repository root.

**Cross-phase file note**: `src/game/useChessGame.ts` is intentionally extended across phases
(T025 → T031/T032 → T037 → T040 → T044 → T054). Those tasks are sequential and must never be marked
`[P]` with each other. `src/components/GameStatus.tsx` is likewise extended (T023 → T034 → T054 →
T036) and those tasks are sequential. Likewise, `tests/fixtures/positions.ts` is intentionally
extended across phases (T016 → T038 → T046); those tasks must never be marked `[P]` with each other.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, tooling, and the engine asset pipeline.

- [X] T001 Initialize project in `package.json` with pinned dependencies (`react`, `react-dom`, `chess.js@1.4.0`, `stockfish@19.0.0` as devDependency, `vite`, `@vitejs/plugin-react`, `typescript`, `@playwright/test`) and scripts `dev`, `build`, `preview`, `test:e2e`, `copy-engine`, `generate:engine-fixtures`, plus `predev`/`prebuild`/`pretest:e2e` runners that invoke `copy-engine` so engine assets always exist before dev, build, and E2E runs
- [X] T002 [P] Add TypeScript strict-mode configuration in `tsconfig.json` and `tsconfig.node.json` (target modern browsers, `strict: true`, JSX react-jsx)
- [X] T003 [P] Configure Vite build and dev server in `vite.config.ts` (React plugin, static `dist/` output, no cross-origin-isolation headers)
- [X] T004 [P] Update `.gitignore` to ignore `node_modules/`, `dist/`, `public/engine/`, `test-results/`, `playwright-report/`
- [X] T005 [P] Configure Playwright in `playwright.config.ts` (`testIdAttribute: "data-testid"`, Chromium project, `webServer` that invokes `npm run build` + `npm run preview` so the static app builds and serves deterministically and `prebuild`→`copy-engine` guarantees engine assets exist before tests, per Constitution XII)
- [X] T006 [P] Create `scripts/copy-engine.mjs` to copy only `stockfish-19-lite-single.js` and `stockfish-19-lite-single.wasm` from `node_modules/stockfish` into `public/engine/`
- [X] T007 [P] Create `scripts/generate-engine-fixtures.mjs` to search each curated **black-to-move** FEN (from `tests/fixtures/positions.ts`) with the `ucinewgame` + `setoption name Clear Hash value true` + `position fen <FEN>` + `go depth <N>` protocol and write `tests/fixtures/engine-moves.ts` (per research R3); this runs the pinned engine under Node as offline test tooling only and is not part of browser gameplay (research R3, C1)
- [X] T008 [P] Configure ESLint and Prettier in `eslint.config.js` and `.prettierrc` with `lint`/`format` npm scripts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared domain, chess/engine boundaries, and test infrastructure required by every story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T009 [P] Define shared domain types in `src/game/types.ts`: `Difficulty = "easy" | "medium" | "hard"`, `Side = "white" | "black"`, `GamePhase = "setup" | "playing" | "ended"`, `ResultKind = "checkmate" | "stalemate"`, `GameResult = { kind: ResultKind; winner: Side | null }`, `GameState`, `MoveRecord` (with 1-based half-move `ply`), `PromotionRequest`, `EngineTier` exactly as specified in data-model.md
- [X] T010 Implement the chess.js wrapper in `src/game/chessGame.ts`: `new Chess`/`loadPosition`/`reset`, `attemptMove({ from, to, promotion })` that calls `chess.move()` inside try/catch (move() throws on illegal input — research R4), `getLegalTargets(square)` from `chess.moves({ square, verbose: true })`, and `deriveResult(chess)` returning checkmate/stalemate **only** (never `isGameOver()`; out-of-scope draws keep the game `playing`)
- [X] T011 [P] Implement difficulty mapping in `src/engine/difficulty.ts` with the fixed tier table `TIER_DEPTH = { easy: 1, medium: 4, hard: 12 }` (no `Skill Level`, which is nondeterministic per research R3)
- [X] T012 [P] Implement UCI parsing helpers in `src/engine/uci.ts` (split batched lines on `\n`, `parseUci(move)` → `{ from, to, promotion? }`, detect `bestmove (none)`)
- [X] T013 Implement `StockfishClient` in `src/engine/stockfishClient.ts` per `contracts/engine-worker.md`: `init()` (`uci`/`isready`, idempotent), `findBestMove(fen, depth)` using `ucinewgame` + `setoption name Clear Hash value true` + `position fen <fen>` + `go depth <depth>`, `dispose()`, and a bounded timeout that resolves `null` on engine failure
- [X] T014 [P] Implement startup test affordance in `src/test/startupOptions.ts` parsing `?fen=<url-encoded FEN>` and `?difficulty=easy|medium|hard` (research R6; no UI added)
- [X] T015 [P] Create shared Playwright helpers in `tests/helpers/game.ts` (click square by `data-square`, start game, observe/wait for `data-thinking` via `MutationObserver`, read status data attributes)
- [X] T016 [P] Create curated fixtures in `tests/fixtures/positions.ts`: for each difficulty scenario a seed FEN plus a fixed scripted white move and the resulting black-to-move FEN (derived from the Kiwipete and rook-endgame positions), plus placeholders for check/checkmate/stalemate/promotion/castling/en passant. Black-to-move FENs are the inputs the engine is asserted on (research R3)
- [X] T017 Generate deterministic engine-move fixtures into `tests/fixtures/engine-moves.ts` by running `npm run generate:engine-fixtures` against the pinned engine over the curated black-to-move FENs (depends on T007, T011, T012, T016); tooling-only, no runtime participation (research R3, C1)

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Start a New Game at a Chosen Difficulty (Priority: P1) 🎯 MVP

**Goal**: Player selects Easy/Medium/Hard and starts a game from the standard position as white.

**Independent Test**: Load app, confirm `data-phase="setup"`, select each difficulty, start, confirm
`data-phase="playing"`, `data-turn="white"`, standard start position, `data-difficulty` and
`data-engine-depth` correct, and difficulty locked while playing.

### Tests for User Story 1

- [X] T018 [P] [US1] Write Playwright acceptance tests for US1 scenarios 1–4 in `tests/e2e/start-game.spec.ts` (three options present, start-without-difficulty blocked with `[data-testid="message"]`, successful start, difficulty locked + displayed while playing)

### Implementation for User Story 1

- [X] T019 [P] [US1] Implement `src/components/DifficultySelector.tsx` as a `role="radiogroup"` with exactly three `role="radio"` buttons named Easy/Medium/Hard, none checked on load, disabled/hidden during `playing`/`ended` (FR-004, FR-006)
- [X] T020 [P] [US1] Implement `src/components/StartControls.tsx` with `[data-testid="start-game"]` and `[data-testid="message"]` non-disruptive feedback; start with no difficulty must not start and must show a message (FR-005)
- [X] T021 [P] [US1] Implement `src/components/Square.tsx` as an accessible button carrying `data-square`, `data-side`, `data-piece`, `aria-selected`, and label `"<square>, <side> <piece>"` or `"<square>, empty"` per `contracts/ui-observability.md`
- [X] T022 [US1] Implement `src/components/Board.tsx` as `role="grid"` with 8 `role="row"`s of `role="gridcell"` buttons, ranks 8→1 and files a→h, white pieces at the bottom (FR-003); depends on T021
- [X] T023 [P] [US1] Implement `src/components/GameStatus.tsx` carrying the machine-readable contract (`data-testid="game-status"`, `data-phase`, `data-turn`, `data-thinking`, `data-check`, `data-result`, `data-winner`, `data-difficulty`, `data-engine-depth`, `data-engine-error`, `data-legal-targets`) plus `[data-testid="status-text"]` (FR-028, FR-040)
- [X] T024 [P] [US1] Implement `src/components/MoveHistory.tsx` as `role="list"` `[data-testid="move-history"]` with `role="listitem"` entries exposing `data-side` and `data-ply` (1-based half-move: white=1, black=2, ...) (empty in setup)
- [X] T025 [US1] Implement the core of `src/game/useChessGame.ts`: `useReducer` state (`phase`, `difficulty`, `fen`, `turn`, `selectedSquare`, `legalTargets`, `thinking`, `check`, `statusText`, `result`, `moveHistory`, `promotion`, `message`, `engineError`), `selectDifficulty`, `startGame` (requires difficulty; loads the `?fen=` seed if present, otherwise resets the `Chess` instance to the standard start position; if the resulting position is black to move, begins a computer turn), and seeded-position loading via `src/test/startupOptions.ts` (N2: `statusText` is part of the orchestrator state and projects to `[data-testid="status-text"]`)
- [X] T026 [US1] Compose the app in `src/App.tsx`, add `src/main.tsx` React entry, and add base layout in `src/styles.css`; wire `DifficultySelector`, `StartControls`, `Board`, `GameStatus`, `MoveHistory` to `useChessGame` (depends on T019–T025)
- [X] T027 [US1] Integrate difficulty lock (selector unavailable while `playing`/`ended`, current value displayed) and start-without-difficulty feedback through the orchestrator (FR-005, FR-006)

**Checkpoint**: User Story 1 is fully functional and independently testable (MVP).

---

## Phase 4: User Story 2 - Play Legal Moves and Receive a Computer Response (Priority: P1)

**Goal**: Human selects piece then destination; computer replies automatically with a legal move, with
an observable thinking state, input blocking, and move history.

**Independent Test**: Start a game, make one legal white move, observe `data-thinking="true"`,
confirm input is blocked, wait for exactly one legal black reply, and confirm both moves are in the
history and `data-turn="white"`. Additionally, for each curated black-to-move FEN × each tier, seed
via `?fen=`, and confirm `data-engine-depth` and the computer's reply match
`tests/fixtures/engine-moves.ts` (SC-006).

### Tests for User Story 2

- [X] T028 [P] [US2] Write Playwright tests in `tests/e2e/legal-illegal-moves.spec.ts` (legal move applies; illegal destination leaves board/turn unchanged with message; black piece not selectable; own-piece reselect; same-square deselect; own-piece capture rejected)
- [X] T029 [P] [US2] Write Playwright tests in `tests/e2e/computer-turn.spec.ts` (thinking indicator visible, `data-thinking` true→false interval ≥ 250 ms measured via MutationObserver, input blocked while thinking, exactly one legal black reply; for every curated black-to-move FEN × every tier {easy, medium, hard}, seed via `?fen=`, assert `data-engine-depth` is `1|4|12` respectively and that the computer's reply equals the expected move in `tests/fixtures/engine-moves.ts`; **FR-008**: seed one fixed position, select the same white piece at each tier, and assert `data-legal-targets` is identical across Easy/Medium/Hard while `data-engine-depth` differs; **FR-040**: block the engine asset with `page.route('**/engine/**', r => r.abort())` (or force the client timeout), make a legal white move, and assert `data-engine-error="true"`, `[data-testid="engine-error"]` visible, and `data-thinking="false"`, with the normal thinking/reply behavior unchanged when the route is not blocked) (FR-007, FR-008, FR-040, SC-006, SC-014)
- [X] T030 [P] [US2] Write Playwright tests in `tests/e2e/history-status.spec.ts` (each move recorded once, in order, with correct `data-side`; status reflects turn/thinking)

### Implementation for User Story 2

- [X] T031 [US2] Extend `handleSquareClick` in `src/game/useChessGame.ts`: no-op when `ended`/`thinking`/`turn !== "white"`/`promotion != null`; select white pieces and compute `legalTargets`; alternative own-piece reselects; same square cancels; legal target attempts the move; illegal target sets `message` with state unchanged (FR-009–FR-013)
- [X] T032 [US2] Implement the computer turn in `src/game/useChessGame.ts`: set `thinking = true` before the engine request, call `findBestMove(fen, TIER_DEPTH[difficulty])`, wait until ≥ 250 ms elapsed, apply/validate via `chess.move()` (reject invalid), clear `thinking`, append `MoveRecord`, re-derive result, and enforce single reply per human turn via a generation token (FR-014–FR-018)
- [X] T033 [US2] Populate and side-attribute the move history from `moveHistory` in `src/components/MoveHistory.tsx`, deriving `special` from chess.js `Move` predicates (FR-032); this task is the single owner of `special` derivation (T045 consumes it and must not re-implement it)
- [X] T034 [US2] Wire selection visuals (`aria-selected`/styling), the visible `[data-testid="thinking-indicator"]` shown only while `data-thinking="true"`, and click no-ops while thinking/black-turn into `src/components/Board.tsx`, `src/components/Square.tsx`, and `src/components/GameStatus.tsx` (FR-010, FR-016, FR-017). The status region is the single authoritative location for `aria-busy` (set to `"true"` only while thinking); the thinking indicator itself must not carry `aria-busy`
- [X] T054 [US2] Implement minimal engine-error observability in `src/game/useChessGame.ts` and `src/components/GameStatus.tsx`: when `findBestMove` resolves `null` (worker load failure, bounded timeout, or no move) set `engineError = true` and clear `thinking` without advancing the turn; render the visible, non-disruptive `[data-testid="engine-error"]` message only while `data-engine-error="true"`; clear `engineError` on restart. No retries, recovery workflows, or product scope (FR-040, SC-014); do not change the normal thinking-state behavior

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Understand Game Status and End-of-Game Conditions (Priority: P1)

**Goal**: Check, checkmate (both sides), and stalemate are detected, displayed, and end the game;
no moves accepted after the end.

**Independent Test**: Seed check, black-mate, white-mate, and stalemate positions via `?fen=`;
confirm `data-check`, `data-result`, and `data-winner` update correctly and further moves are no-ops.

### Fixtures (prerequisite for tests)

- [X] T038 [US3] Add the check, black-mate-in-1, white-mate-in-1, and stalemate FENs (and expected outcome) to `tests/fixtures/positions.ts`

### Tests for User Story 3

- [X] T035 [P] [US3] Write Playwright tests in `tests/e2e/game-end.spec.ts` (check displayed with side; black checkmated → `data-result="checkmate"`, `data-winner="white"`; white checkmated → `data-winner="black"`; stalemate → `data-result="stalemate"`, `data-winner="none"`; no move accepted after end; out-of-scope draw keeps game `playing`) (consumes the T038 fixtures; T038 must complete first)

### Implementation for User Story 3

- [X] T036 [US3] Surface status text and result in `src/components/GameStatus.tsx`: whose turn, thinking, check (identifying the side), checkmate + winner, stalemate as draw (FR-029–FR-031)
- [X] T037 [US3] Enforce terminal state in `src/game/useChessGame.ts`: after every applied move set `phase="ended"` and `result` from `deriveResult(chess)` (checkmate/stalemate only); make `handleSquareClick` a no-op when `phase === "ended"` (FR-025–FR-027)

**Checkpoint**: User Story 3 works independently; rules outcomes are correct and observable.

---

## Phase 6: User Story 4 - Restart the Game (Priority: P2)

**Goal**: Restart from any state (playing, ended, or while thinking) cleanly returns to setup.

**Independent Test**: Make moves, restart mid-game, confirm board/history/status reset and difficulty
selection returns; repeat while thinking and after a completed game, confirming no stale computer move.

### Tests for User Story 4

- [X] T039 [P] [US4] Write Playwright tests in `tests/e2e/restart.spec.ts` (reset from active game; reset from completed game; restart while thinking abandons the pending move and no stale move is applied; start blocked until a new difficulty is selected)

### Implementation for User Story 4

- [X] T040 [US4] Implement `restartGame()` in `src/game/useChessGame.ts`: increment the generation token to discard any in-flight `bestmove`, `chess.reset()`, clear selection/`legalTargets`/`promotion`/`message`/history/`result`/`thinking`, set `difficulty = null` and `phase = "setup"` (FR-033–FR-035)
- [X] T041 [US4] Add the `[data-testid="restart-game"]` control available in every phase into `src/components/StartControls.tsx` and wire it in `src/App.tsx`

**Checkpoint**: Restart works from all states without stale state.

---

## Phase 7: User Story 5 - Perform Special Chess Moves (Priority: P2)

**Goal**: Promotion, castling, and en passant are performable through browser interactions.

**Independent Test**: Seed positions allowing each special move, perform it via clicks, and confirm
the resulting board state and move history; illegal attempts are rejected like any illegal move.

### Fixtures (prerequisite for tests)

- [X] T046 [US5] Add promotion, castling, and en passant FENs plus expected resulting squares to `tests/fixtures/positions.ts`

### Tests for User Story 5

- [X] T042 [P] [US5] Write Playwright tests in `tests/e2e/special-moves.spec.ts` (promotion dialog appears and blocks turn advance until a piece is chosen, chosen piece occupies destination; castling moves king and rook; en passant removes the captured pawn; illegal castling/en passant rejected with board unchanged) (consumes the T046 fixtures; T046 must complete first)

### Implementation for User Story 5

- [X] T043 [P] [US5] Implement `src/components/PromotionDialog.tsx` as `role="dialog"` `[data-testid="promotion-dialog"]` with Queen/Rook/Bishop/Knight buttons (`promote-q|r|b|n`) (FR-024)
- [X] T044 [US5] Handle promotion in `src/game/useChessGame.ts`: when a selected white pawn move reaches the last rank set `promotion` without calling `chess.move`; `choosePromotion(piece)` applies `chess.move({ from, to, promotion })`; block all other actions while `promotion != null` (spec Edge Case)
- [X] T045 [P] [US5] Ensure castling and en passant are applied and legal destinations are exposed through `src/game/chessGame.ts` (chess.js predicates `isKingsideCastle`, `isQueensideCastle`, `isEnPassant`, `isPromotion`, `isCapture`) for the destination-click path (FR-022, FR-023); do not re-implement the `special` field (owned by T033)

**Checkpoint**: All standard special moves work and are recorded correctly.

---

## Phase 8: User Story 6 - Play on a Mobile-Sized Viewport (Priority: P3)

**Goal**: The full app is usable at 320–480 px widths with no horizontal scrolling.

**Independent Test**: At 480/375/320 px, confirm no horizontal scroll, start a game, complete a legal
move, observe the reply, and read status/history.

### Tests for User Story 6

- [X] T047 [P] [US6] Write Playwright tests in `tests/e2e/mobile.spec.ts` (at 480/375/320 px assert `document.documentElement.scrollWidth <= window.innerWidth`, and complete a legal move + read status/history at each width)

### Implementation for User Story 6

- [X] T048 [US6] Implement responsive layout in `src/styles.css`: board sized `min(90vw, 90vh, 560px)`, vertically stacked status/history/controls on narrow screens, no fixed widths forcing horizontal scroll (FR-036, FR-037)

**Checkpoint**: All six user stories are independently functional.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, accessibility, and cleanup across stories.

- [X] T049 [P] Update `specs/001-chess-vs-computer/quickstart.md` if implementation details drifted, and add a short root `README.md` usage note
- [X] T050 Run the quickstart manual checklist via Playwright MCP against `npm run dev`, exercising start, moves, thinking, restart, seeded special positions, and 320 px width
- [X] T051 Run `npm run lint`, `npx tsc --noEmit`, and `npm run test:e2e`; fix all failures
- [X] T052 [P] Accessibility pass: verify every control and observable state exposes stable roles/labels per `contracts/ui-observability.md` (FR-039) and that all core interactions are pointer/click-only
- [X] T053 Verify engine determinism and responsiveness (repeat `generate:engine-fixtures` and confirm no diff; confirm replies within a few seconds at every tier) and review the final tree against the constitution

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phases 3–8)**: Depend on Foundational
  - US1 (P1) must complete first: it provides `App.tsx` composition, the board, and the start flow that every other story's independent test needs
  - US2 (P1) depends on US1 (needs a started game and rendered board)
  - US3 (P1) depends on US1 + US2 (needs applied moves to reach terminal states)
  - US4 (P2), US5 (P2), US6 (P3) depend on US1/US2 for a playable base
- **Polish (Phase 9)**: Depends on all targeted user stories

### User Story Dependencies

- **US1 (P1)**: After Foundational — no story dependencies
- **US2 (P1)**: After US1 — integrates with the US1 board/status but is independently testable
- **US3 (P1)**: After US1 + US2 — uses applied moves to reach terminal states
- **US4 (P2)**: After US1 + US2 — restarts an active/thinking game
- **US5 (P2)**: After US1 + US2 — special moves are applied through the same move pipeline
- **US6 (P3)**: After US1 + US2 — responsive behavior of the existing UI

### Within Each User Story

- Fixture-producing tasks precede the tests that consume them (T038 → T035; T046 → T042)
- Tests are written before implementation and must fail first
- Shared wrapper/engine tasks precede UI tasks
- Models/wrappers before services/orchestrator before endpoints/UI
- Story complete and validated before moving to the next priority

### Parallel Opportunities

- All Setup tasks marked `[P]` (T002–T008) after T001
- All Foundational `[P]` tasks (T009, T011, T012, T014, T015, T016) run in parallel; T010, T013, T017 are sequential
- All test tasks within a story marked `[P]` run in parallel
- Independent component tasks within US1 (T019, T020, T021, T023, T024) run in parallel
- `useChessGame.ts` tasks (T025, T031, T032, T037, T040, T044, T054) are strictly sequential
- `GameStatus.tsx` tasks (T023, T034, T054, T036) are strictly sequential
- `tests/fixtures/positions.ts` tasks (T016, T038, T046) are strictly sequential (never `[P]` with each other); T017 additionally depends on T007/T011/T012/T016

---

## Parallel Example: User Story 1

```bash
# Tests first:
Task: "Write Playwright acceptance tests in tests/e2e/start-game.spec.ts"

# Independent components in parallel:
Task: "Implement src/components/DifficultySelector.tsx"
Task: "Implement src/components/StartControls.tsx"
Task: "Implement src/components/Square.tsx"
Task: "Implement src/components/GameStatus.tsx"
Task: "Implement src/components/MoveHistory.tsx"
```

## Parallel Example: User Story 2

```bash
Task: "Write tests in tests/e2e/legal-illegal-moves.spec.ts"
Task: "Write tests in tests/e2e/computer-turn.spec.ts"
Task: "Write tests in tests/e2e/history-status.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: US1
4. **STOP and VALIDATE**: run `tests/e2e/start-game.spec.ts` independently
5. Deploy/demo the static `dist/` if ready

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → validate → demo (MVP)
3. US2 → validate → demo (core gameplay)
4. US3 → validate → demo (rules outcomes)
5. US4/US5 → validate → demo (restart + special moves)
6. US6 → validate → demo (mobile)
7. Polish → final full-suite + quickstart validation

### Notes

- `[P]` tasks touch different files and have no incomplete dependencies
- `[Story]` labels map tasks to spec user stories for traceability
- Illegal human moves and illegal engine moves both flow through the `chess.js` try/catch path
- Verify tests fail before implementing each story
- Commit after each task or logical group; never commit `public/engine/`
