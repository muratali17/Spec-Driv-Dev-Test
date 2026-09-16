# Implementation Plan: Browser Chess vs Computer

**Branch**: `001-chess-vs-computer` | **Date**: 2026-09-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-chess-vs-computer/spec.md`

## Summary

Build a single-page, entirely client-side chess game in which a human (always
white) plays a Stockfish computer opponent (always black) at one of three
pre-selected difficulty tiers. `chess.js` is the authoritative source of rules and
game state; Stockfish runs in a Web Worker and only supplies the computer's move,
which is then applied and validated through `chess.js`. The computer turn exposes
a deterministic, browser-observable "thinking" state held visible for at least
250 ms. The app builds to static assets with Vite and is verified with Playwright
acceptance tests derived from the specification, with Playwright MCP used for
agent-driven browser validation.

Technical decisions and their evidence are in [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode); Node.js 20+ for tooling only.

**Primary Dependencies**:
- `react` + `react-dom` (UI)
- `vite` + `@vitejs/plugin-react` (build + dev server)
- `chess.js@1.4.0` (authoritative rules/state)
- `stockfish@19.0.0` (devDependency; only the `lite-single` engine pair is copied
  into `public/engine/` and served as a static Web Worker)
- `@playwright/test` (acceptance tests)

**Storage**: N/A — no database, no persistence; a page refresh discards the game.

**Testing**: Playwright Test (`@playwright/test`) for acceptance tests, configured
with a `webServer` so the app builds and serves deterministically. Playwright MCP
for agent-driven browser validation. Unit-level checks, if any, are limited to pure
modules and are not required by the spec.

**Target Platform**: Modern desktop and mobile browsers; static single-page app
served from any static host. No backend and no cross-origin-isolation headers.

**Project Type**: Single web application (frontend only); one source tree plus an
end-to-end test tree.

**Performance Goals**:
- The UI thread stays responsive during engine search (engine runs in a Worker).
- The computer replies within a few seconds at every tier (measured lite-single
  depths 1–12 complete in tens of milliseconds in research).
- The thinking indicator is visible for at least 250 ms on every computer turn.

**Constraints**:
- 100% client-side; static deployable; no backend, database, or external gameplay
  API (Constitution Principles II–IV).
- No `SharedArrayBuffer`/cross-origin-isolation requirement.
- Usable down to 320 px viewport width with no horizontal scrolling.
- Deterministic, browser-observable states for automation (Principle XII).

**Scale/Scope**: One local session, one 8×8 board, three difficulty tiers, one
human and one computer side. No accounts, matchmaking, persistence, or analysis.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Prototype-Scale Scope | No production infrastructure; only what the spec requires. | PASS — single Vite app, no backend/CI beyond local tests. |
| II. Browser-Only Execution | All gameplay runs client-side; static artifacts. | PASS — engine and rules both run in the browser; `dist/` is static. |
| III. No Backend by Default | No backend introduced. | PASS — none. |
| IV. Excluded Product Features | No auth, accounts, DB, multiplayer, ratings, social. | PASS — none. |
| V. Leverage Mature Libraries | Delegate chess rules to a mature library. | PASS — chess.js 1.4.0 owns all rules. |
| VI. Browser-Testable Functionality | Every behavior observable through browser interactions. | PASS — all state exposed in the DOM (see contracts). |
| VII. Verifiable Acceptance Criteria | Unambiguous, observable criteria exist before implementation. | PASS — spec acceptance scenarios and success criteria; tests derived from them. |
| VIII. Simple Functional UI | Simple, responsive UI; styling proportionate. | PASS — minimal CSS, responsive, no UI framework. |
| IX. Readable, Modular, Testable Code | Clear module separation. | PASS — components / game / engine / worker / orchestration / tests separated. |
| X. No Premature Abstraction | No unnecessary abstractions or dependencies. | PASS — React state only; no global store. One wrapper each for chess.js and the worker. |
| XI. Scope Discipline | No scope expansion. | PASS — test-position hook is minimal and documented; no UI/feature growth. |
| XII. Playwright-Ready Automation | Stable accessible selectors; deterministic startup. | PASS — semantic roles/labels plus `data-*` state; `webServer` config. |

**Initial gate result: PASS.** No violations require Complexity Tracking.

**Post-design re-check: PASS.** Phase 1 artifacts preserve the same boundaries; the
only test-specific affordance (a URL query-parameter position seed) adds no UI and
no runtime dependency and is documented in research R6.

## Project Structure

### Documentation (this feature)

```text
specs/001-chess-vs-computer/
├── plan.md                        # This file
├── research.md                    # Phase 0 output
├── data-model.md                  # Phase 1 output
├── quickstart.md                  # Phase 1 output
├── contracts/                     # Phase 1 output
│   ├── ui-observability.md        # DOM/accessibility + state contract
│   ├── engine-worker.md           # Worker + UCI message contract
│   └── game-orchestration.md      # Turn/thinking lifecycle contract
├── checklists/
│   └── requirements.md            # Spec quality checklist (existing)
└── tasks.md                       # Phase 2 output (/speckit.tasks - not created here)
```

### Source Code (repository root)

```text
public/
└── engine/                        # Git-ignored; filled by scripts/copy-engine.mjs
    ├── stockfish-19-lite-single.js
    └── stockfish-19-lite-single.wasm

scripts/
└── copy-engine.mjs                # Copies only the lite-single pair from node_modules

src/
├── main.tsx                       # React entry
├── App.tsx                        # Top-level composition + startup test hook
├── components/
│   ├── Board.tsx                  # role="grid" of squares; selection/destination clicks
│   ├── Square.tsx                 # Accessible square button; piece rendering
│   ├── DifficultySelector.tsx     # Easy/Medium/Hard radiogroup
│   ├── StartControls.tsx          # Start and validation message
│   ├── GameStatus.tsx             # Turn/thinking/check/result; observable data-* state
│   ├── MoveHistory.tsx            # Ordered, side-attributed move list
│   └── PromotionDialog.tsx        # Queen/Rook/Bishop/Knight chooser
├── game/
│   ├── types.ts                   # Shared domain types
│   ├── chessGame.ts               # chess.js wrapper (authoritative operations)
│   └── useChessGame.ts            # Orchestrator hook (turn + thinking lifecycle)
├── engine/
│   ├── difficulty.ts              # Difficulty -> fixed depth mapping
│   ├── stockfishClient.ts         # Typed UCI client over the Worker
│   └── uci.ts                     # UCI string parsing helpers
├── test/
│   └── startupOptions.ts          # ?fen=/?difficulty= parsing (test affordance)
└── styles.css

tests/
├── e2e/
│   ├── start-game.spec.ts
│   ├── legal-illegal-moves.spec.ts
│   ├── computer-turn.spec.ts      # thinking state, input blocking, legal reply
│   ├── history-status.spec.ts
│   ├── restart.spec.ts
│   ├── game-end.spec.ts           # check, checkmate (both sides), stalemate
│   ├── special-moves.spec.ts      # promotion, castling, en passant
│   └── mobile.spec.ts
├── fixtures/
│   ├── positions.ts               # FENs for complex scenarios
│   └── engine-moves.ts            # Generated expected moves per difficulty
└── helpers/
    └── game.ts                    # Shared Playwright helpers (move, wait, observe)

playwright.config.ts
vite.config.ts
package.json
```

**Structure Decision**: Single frontend project. Responsibilities are separated by
directory: `components/` (presentation), `game/` (rules + orchestration),
`engine/` (Stockfish/Worker boundary), `test/` (startup test affordance), and
`tests/` (Playwright). This mirrors the required separation of
presentation / chess state / opponent integration / worker / orchestration /
Playwright tests, while staying proportional to a prototype (no layers, no
services framework).

## Complexity Tracking

> No Constitution Check violations. This section is intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |

## Phase Plan

- **Phase 0 (research.md)**: engine package, worker protocol, difficulty tiers,
  chess.js behavior, thinking-state observability, deterministic test positions,
  tooling, mobile layout. Complete.
- **Phase 1 (this document + data-model.md + contracts/ + quickstart.md)**: domain
  model, DOM/worker/orchestration contracts, and a runnable validation guide.
- **Phase 2 (`/speckit.tasks`)**: task breakdown derived from the spec acceptance
  scenarios and this plan.
