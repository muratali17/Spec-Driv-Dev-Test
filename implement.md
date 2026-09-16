# Implementation Log: Browser Chess vs Computer

**Feature**: `specs/001-chess-vs-computer`
**Date**: 2026-09-16
**Command**: `/speckit.implement`
**Result**: All 54 tasks (T001–T054) completed and marked `[X]`.

---

## Summary

Implemented the entire browser chess-vs-computer prototype from the specification,
plan, data model, and contracts. The app is a 100% client-side React + TypeScript
single-page application built with Vite. `chess.js@1.4.0` is the authoritative
rules/state engine; Stockfish (`stockfish@19.0.0`, `lite-single` build) runs in a
Web Worker and supplies the computer's (black) move, which is then validated
through chess.js. Acceptance tests are Playwright, run against a built+previewed
static bundle.

**Verification**: `tsc --noEmit` clean, `eslint .` clean, `playwright test` 41/41
passing, engine fixtures deterministic across regenerations, and a Playwright MCP
manual pass covering start, move/reply, restart, promotion, and 320px viewport.

---

## Phase 1 — Setup (T001–T008)

- `package.json`: pinned `chess.js@1.4.0` and `stockfish@19.0.0` (devDependency);
  scripts `dev`, `build`, `preview`, `test:e2e`, `copy-engine`,
  `generate:engine-fixtures`, `lint`, `format`; `predev`/`prebuild`/`pretest:e2e`
  run `copy-engine` so engine assets always exist first.
- `tsconfig.json` (strict, `react-jsx`, no emit, DOM + node types) and
  `tsconfig.node.json` (config files).
- `vite.config.ts`: React plugin, static `dist/` output, no COOP/COEP headers.
- `.gitignore`: `node_modules/`, `dist/`, `public/engine/`, `test-results/`,
  `playwright-report/`, `.playwright-mcp/`, logs/editor folders.
- `playwright.config.ts`: `testIdAttribute: "data-testid"`, Chromium project,
  `webServer` = `npm run build && npm run preview`.
- `scripts/copy-engine.mjs`: copies only `stockfish-19-lite-single.js` and
  `.wasm` from `node_modules/stockfish/bin` into `public/engine/`.
- `scripts/generate-engine-fixtures.mjs`: drives the pinned engine under Node with
  `ucinewgame` + `Clear Hash` + `position fen` + `go depth`, writes
  `tests/fixtures/engine-moves.ts`.
- `eslint.config.js` (flat, typescript-eslint, react-hooks, react-refresh) and
  `.prettierrc`.

## Phase 2 — Foundational (T009–T017)

- `src/game/types.ts`: `Difficulty`, `Side`, `GamePhase`, `ResultKind`,
  `GameResult`, `MoveRecord`, `PromotionRequest`, `GameState`, `EngineTier`.
- `src/game/chessGame.ts`: `createChess`/`loadPosition`/`resetPosition`,
  `attemptMove` (try/catch — chess.js `move()` throws on illegal input),
  `getLegalTargets`, `getMoveOptions`, `describeSpecial`, `toMoveRecord`
  (single owner of the `special` field), and `deriveResult` (checkmate/stalemate
  only; never `isGameOver()`).
- `src/engine/difficulty.ts`: `TIER_DEPTH = { easy: 1, medium: 4, hard: 12 }`.
- `src/engine/uci.ts`: line splitting, `parseBestMove`, `parseUci`.
- `src/engine/stockfishClient.ts`: typed UCI client (`init`, `findBestMove`,
  `dispose`) with bounded timeout and null-on-failure semantics.
- `src/test/startupOptions.ts`: `?fen=` and `?difficulty=` parsing (no UI).
- `tests/helpers/game.ts`: navigation, selection, click/move, state reads,
  MutationObserver thinking-duration helper, horizontal-scroll helper.
- `tests/fixtures/positions.ts`: curated engine positions (Kiwipete, rook
  endgame) plus check/mate/stalemate/promotion/castling/en-passant/draw FENs.
- `tests/fixtures/engine-moves.ts`: generated expected UCI replies per tier.

## Phase 3 — US1 Start a new game (T018–T027)

- `tests/e2e/start-game.spec.ts`: three options, no-difficulty feedback, start at
  each tier with correct depth, difficulty locked while playing.
- Components: `DifficultySelector` (radiogroup), `StartControls`,
  `Square`, `Board` (grid/row/gridcell, white at bottom), `GameStatus`,
  `MoveHistory`.
- `src/game/useChessGame.ts` core: `useReducer` state, `selectDifficulty`,
  `startGame` (seed or standard start; auto-runs a computer turn if black to
  move), seeded loading.
- `src/App.tsx`, `src/main.tsx`, `src/styles.css`, `index.html`.

## Phase 4 — US2 Legal moves, computer turn (T028–T034, T054)

- `tests/e2e/legal-illegal-moves.spec.ts`, `computer-turn.spec.ts`,
  `history-status.spec.ts`.
- `handleSquareClick`: select-then-destination, own-piece reselect, same-square
  cancel, illegal move feedback.
- Computer turn: `thinking = true` before the request, `findBestMove`, enforce a
  minimum visible duration, validate/apply through chess.js, generation token
  prevents stale replies, append `MoveRecord`, re-derive result.
- Engine-error observability (`data-engine-error`, visible message) with no
  retries; cleared on restart.

## Phase 5 — US3 Game end (T035–T038)

- Added check/mate/stalemate/out-of-scope-draw fixtures.
- `tests/e2e/game-end.spec.ts`: check identification, both mate directions,
  stalemate draw, no moves after end, out-of-scope draw keeps playing.
- `GameStatus` surfaces turn/thinking/check/result; `useChessGame` enforces
  terminal state and ignores non-checkmate/stalemate draws.

## Phase 6 — US4 Restart (T039–T041)

- `tests/e2e/restart.spec.ts`: reset from active/ended/while-thinking, stale move
  abandonment, re-selection required before restarting.
- `restartGame`: increments the generation token, resets chess, clears all
  session state, returns to `setup` with difficulty cleared.

## Phase 7 — US5 Special moves (T042–T046)

- Added promotion/castling/en-passant fixtures (legal and illegal variants).
- `tests/e2e/special-moves.spec.ts`: promotion dialog blocks turn advance and
  applies the chosen piece; castling moves king+rook; en passant removes the
  captured pawn; illegal castling/en passant rejected.
- `PromotionDialog`; promotion handling in `useChessGame`; chess.js predicate
  helpers exposed for the destination-click path.

## Phase 8 — US6 Mobile (T047–T048)

- `tests/e2e/mobile.spec.ts`: 480/375/320 px, no horizontal overflow, full
  move + reply + status/history.
- Responsive CSS: `min(90vw, 90vh, 560px)` board, stacked panels, no fixed widths.

## Phase 9 — Polish (T049–T053)

- README usage note added; quickstart reviewed (no drift).
- Playwright MCP manual checklist executed against `npm run dev`: start,
  start-without-difficulty feedback, move + computer reply, restart, seeded
  promotion (`d8=Q`), and 320 px (0 px overflow).
- `npm run lint`, `npx tsc --noEmit`, `npm run test:e2e` all pass.
- Accessibility pass: semantic roles/labels (`status`, `radiogroup`/`radio`,
  `grid`/`row`/`gridcell`, `dialog`) and pointer/click-only interactions.
- Engine determinism verified by regenerating fixtures with no diff.

---

## Notable fixes during implementation

- **UCI line framing**: the worker posts one line per message *without* a
  trailing newline. The initial buffer-only splitter never emitted `uciok`, so
  the engine appeared to hang. Fixed by splitting each incoming message per line
  (`String(data).split("\n")`).
- **React refs during render**: strict `react-hooks/refs` lint rejected reading
  the `Chess` ref while rendering. Moved the instance to `useState(() => ...)`
  and updated the state mirror in an effect.
- **Initial status text**: `statusText` was empty on first render; now derived at
  state creation so status is present at all times (FR-028).
- **Engine failure fast-path**: worker load errors now resolve pending waits
  immediately instead of waiting out the 10 s handshake timeout.

## Notes / boundaries

- `public/engine/` is generated and git-ignored; engine fixture generation runs
  under Node as offline test tooling only and never participates in browser
  gameplay.
- No commit was made; `.opencode/skills/` was pre-existing and left untouched.
