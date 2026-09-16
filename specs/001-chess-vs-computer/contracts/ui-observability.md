# Contract: UI Observability and Accessibility

**Feature**: `001-chess-vs-computer`

This contract defines the browser-observable surface that both human users and
Playwright (Test and MCP) rely on. Selectors are semantic first; `data-*`
attributes are added only where a stable machine-readable state or identifier is
needed. Keyboard board operation is explicitly out of scope (FR-039); pointer/click
is the only required input.

## Selection strategy for tests

1. Prefer `getByRole(...)` with an accessible name.
2. Use `getByTestId(...)` / `[data-square="..."]` only for repeated elements
   (squares, list items) or machine-readable state.

Configuration: `testIdAttribute: "data-testid"` in `playwright.config.ts`.

---

## 1. Status region (source of machine-readable state)

A single element carries the whole observable game state.

```html
<section
  role="status"
  aria-live="polite"
  aria-label="Game status"
  aria-busy="false"
  data-testid="game-status"
  data-phase="playing"          <!-- setup | playing | ended -->
  data-turn="white"             <!-- white | black -->
  data-thinking="false"         <!-- true | false -->
  data-check="false"            <!-- true | false -->
  data-result="none"            <!-- none | checkmate | stalemate -->
  data-winner="none"            <!-- none | white | black -->
  data-difficulty="medium"      <!-- none | easy | medium | hard -->
  data-engine-depth="4">        <!-- none | 1 | 4 | 12 -->
  <p data-testid="status-text">White to move</p>
</section>
```

Required guarantees:

- `data-thinking` flips to `"true"` when thinking begins and only returns to
  `"false"` after the computer's move has been applied (FR-016).
- `data-difficulty` and `data-engine-depth` expose the active, fixed tier
  (FR-007, SC-006).
- `data-result`/`data-winner` are authoritative for terminal conditions
  (FR-030, FR-031). `data-result` is one of `none`, `checkmate`, or `stalemate`
  only; it is never set for out-of-scope draws (threefold repetition, fifty-move
  rule, insufficient material), which keep the game in `playing`.
- `data-turn` mirrors `chess.turn()` (FR-028).

## 2. Thinking indicator

- Rendered and **visible** only while `data-thinking="true"`.
- Stable identifier: `data-testid="thinking-indicator"`.
- Contains visible text: `Computer is thinking…`.
- Visible for at least 250 ms on every computer turn.
- While thinking, the status region sets `aria-busy="true"`.

Test observation of duration: attach a `MutationObserver` to
`[data-testid="game-status"]` on the `data-thinking` attribute and assert the
`true → false` interval is `>= 250 ms`.

## 3. Difficulty controls

```html
<div role="radiogroup" aria-label="Difficulty">
  <button role="radio" aria-checked="true"  data-testid="difficulty-easy">Easy</button>
  <button role="radio" aria-checked="false" data-testid="difficulty-medium">Medium</button>
  <button role="radio" aria-checked="false" data-testid="difficulty-hard">Hard</button>
</div>
```

- Exactly three options with accessible names `Easy`, `Medium`, `Hard` (FR-004).
- No option is selected on load (spec Assumptions).
- Disabled or hidden while a game is active/ended; changing requires restart
  (FR-006).

## 4. Start control

```html
<button data-testid="start-game">Start Game</button>
```

- Starting with no difficulty selected does **not** start a game and shows
  feedback (FR-005). Feedback element: `data-testid="message"`.

## 5. Restart control

```html
<button data-testid="restart-game">Restart Game</button>
```

- Available in every phase, including while thinking (FR-033).
- After restart: `data-phase="setup"`, empty history, `data-difficulty="none"`,
  board in the standard start position (FR-034, FR-035).

## 6. Board

```html
<div role="grid" aria-label="Chess board">
  <div role="row">
    <div role="gridcell">
      <button
        data-square="e2"
        aria-label="e2, white pawn"
        aria-selected="false"
        data-side="white"
        data-piece="p"></button>
    </div>
    <!-- ... 64 squares, ranks 8 -> 1, files a -> h ... -->
  </div>
  <!-- ... 8 rows ... -->
</div>
```

- White pieces are oriented at the bottom (FR-003).
- Square i18n-free accessible name format: `"<square>, <side> <piece>"` or
  `"<square>, empty"`.
- Selection is exposed via `aria-selected="true"` on the square button and is
  visually distinguishable (FR-010).
- Empty squares are still buttons (a legal destination may be empty), so
  `aria-label` ends with `", empty"` when no piece is present.
- Clicking a square dispatches the same intent as a tap (pointer events).
- While `data-thinking="true"`, while `data-turn="black"`, or while
  `data-phase="ended"`, clicking has no effect (FR-017, FR-027, FR-013).
- Illegal destinations leave the DOM state unchanged and show a non-disruptive
  message (FR-012).

## 7. Move history

```html
<ol role="list" aria-label="Move history" data-testid="move-history">
  <li role="listitem" data-side="white" data-ply="1" data-testid="move-1">e4</li>
  <li role="listitem" data-side="black" data-ply="1" data-testid="move-2">e5</li>
</ol>
```

- Preserves order and distinguishes the side that made each move (FR-032).
- Cleared on restart (FR-034). May be hidden or empty in `setup`.

## 8. Promotion dialog

```html
<div role="dialog" aria-modal="true" aria-label="Choose promotion piece" data-testid="promotion-dialog">
  <button data-testid="promote-q">Queen</button>
  <button data-testid="promote-r">Rook</button>
  <button data-testid="promote-b">Bishop</button>
  <button data-testid="promote-n">Knight</button>
</div>
```

- Appears when a human pawn reaches the last rank (FR-024).
- While open, no other move is accepted and the turn does not advance.
- Choosing a piece completes the move through chess.js.

## 9. Message / feedback

```html
<p role="status" data-testid="message">That move is not allowed.</p>
```

- Non-disruptive; present for illegal moves and for start-without-difficulty.
- Must not cover or disable the board.

---

## Responsive requirements (FR-036, FR-037, SC-011)

- No horizontal scrolling at widths from 480 px down to 320 px.
- Board, status, history, and all controls remain visible and reachable at those
  widths.
- Verification: assert `document.documentElement.scrollWidth <= window.innerWidth`
  at 320/375/480 px, and complete a legal move at each width.
