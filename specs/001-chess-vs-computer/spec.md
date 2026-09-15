# Feature Specification: Browser Chess vs Computer

**Feature Branch**: `001-chess-vs-computer`

**Created**: 2026-09-15

**Status**: Draft

**Input**: User description: "Create a browser-based single-player chess prototype where a human player plays against a computer-controlled opponent. The player controls white, the computer controls black. The player selects Easy, Medium, or Hard before starting; difficulty is locked once the game starts. Standard chess rules apply. All important user-facing behavior must be observable and testable through browser interactions, with acceptance scenarios covering starting a game, legal/illegal moves, computer responses, thinking state, move history, restart, check, checkmate, stalemate, no-moves-after-end, promotion, castling, en passant, and mobile viewports."

## Clarifications

### Session 2026-09-15

- Q: What should guarantee that a browser test can observe the computer's "thinking" indicator before the computer's move is applied? → A: Expose a deterministic DOM state flag set when thinking begins and cleared after the move is applied, AND enforce a short minimum visible duration.
- Q: How should the observable difference in opponent strength between Easy, Medium, and Hard be demonstrated so a browser test can verify it? → A: Give each difficulty a fixed, documented behavior tier exposed as a browser-observable value, and assert on a curated set of positions that each tier produces its expected move.
- Q: What level of accessibility is required for core interactions in this prototype? → A: Expose accessible roles/labels for all controls and observable state; pointer/click is the only required input method, and full keyboard board operability is out of scope.
- Q: What viewport width must the mobile-sized viewport acceptance testing cover? → A: Any width ≤ 480 px, guaranteed usable down to 320 px.
- Q: What should the required move-input interaction be for selecting a piece and choosing its destination? → A: Click/tap to select, then click/tap the destination; drag-and-drop is not required.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start a New Game at a Chosen Difficulty (Priority: P1)

A person opens the application and wants to begin a game against the computer. Before any play can happen, they must choose one of three difficulty levels and start a new game. The board then appears in the standard starting position with the human as white.

**Why this priority**: Without a started game at a chosen difficulty, no other behavior can be exercised. This is the entry point for every other scenario.

**Independent Test**: Load the application, confirm no game is active, select each difficulty option, start a game, and confirm the board is in the standard starting position with the human to move. Delivers the minimum viable entry into gameplay.

**Acceptance Scenarios**:

1. **Given** the application is loaded and no game has started, **When** the player views the start controls, **Then** three difficulty options labeled Easy, Medium, and Hard are available and the game has not started.
2. **Given** no difficulty has been selected, **When** the player attempts to start a game, **Then** the game does not start and the player is informed that a difficulty must be selected first.
3. **Given** a difficulty is selected, **When** the player starts the game, **Then** a new game begins from the standard chess starting position, the human controls the white pieces, the computer controls the black pieces, and it is the human's turn.
4. **Given** a game is in progress, **When** the player looks for difficulty controls, **Then** the difficulty cannot be changed without restarting the game, and the currently selected difficulty is displayed.

---

### User Story 2 - Play Legal Moves and Receive a Computer Response (Priority: P1)

While a game is active, the human player selects one of their white pieces and a legal destination square. After a legal move, the computer automatically makes a legal reply as black and then it is the human's turn again. The interface shows that the computer is thinking and does not accept player input during that time. All moves are recorded in a history.

**Why this priority**: This is the core gameplay loop. Without it the application is not a playable chess game.

**Independent Test**: Start a game, make a single legal white move, observe the computer-thinking indicator, wait for the computer's reply, and confirm both moves appear in the move history and it is the human's turn again.

**Acceptance Scenarios**:

1. **Given** a game is active and it is the human's turn, **When** the player selects a white piece and a legal destination square, **Then** the piece moves to the destination, the origin square becomes empty, and the turn passes to the computer.
2. **Given** it is the human's turn, **When** the player selects a white piece and a destination that is not a legal move for that piece, **Then** the board is unchanged, it remains the human's turn, and the player receives non-disruptive feedback that the move was not allowed.
3. **Given** the player has completed a legal move, **When** the turn passes to the computer, **Then** the computer automatically makes exactly one legal move as black.
4. **Given** the computer is deciding on its move, **When** the player observes the interface, **Then** a visible indicator communicates that the computer is thinking.
5. **Given** the computer is thinking, **When** the player attempts to select or move a white piece, **Then** no move is made, the board is unchanged, and the human remains unable to act until the computer's move is complete.
6. **Given** the player and the computer have each completed at least one move, **When** the player views the move history, **Then** the player's move and the computer's move are listed in the order they occurred and are distinguishable by which side made them.
7. **Given** it is the human's turn, **When** the player selects one of their pieces, **Then** the selected piece is visually distinguishable from unselected pieces.

---

### User Story 3 - Understand Game Status and End-of-Game Conditions (Priority: P1)

At all times the player can see the current game status. When a king is in check, checkmated, or a player has no legal moves without being in check, the interface clearly communicates the condition, and the game ends when appropriate.

**Why this priority**: Correct rules outcomes and clear status are essential for the game to be meaningful and for outcomes to be verifiable.

**Independent Test**: Drive the game into a check position, a checkmate position, and a stalemate position, and confirm the status display updates accordingly and prevents further moves once the game has ended.

**Acceptance Scenarios**:

1. **Given** an active game, **When** a move places the opponent's king under attack, **Then** the interface visibly indicates that the king is in check and displays which side is in check.
2. **Given** a position in which the computer (black) is checkmated, **When** the checkmating move is completed, **Then** the interface indicates checkmate, announces the human player as the winner, and the game ends.
3. **Given** a position in which the human (white) is checkmated, **When** the checkmating computer move is completed, **Then** the interface indicates checkmate, announces the computer as the winner, and the game ends.
4. **Given** a position in which it is a side's turn, that side is not in check, and it has no legal move, **When** the turn resolves, **Then** the interface indicates stalemate and announces a draw, and the game ends.
5. **Given** the game has ended by checkmate or stalemate, **When** the player attempts to make any move, **Then** the board is unchanged and no additional moves are accepted.
6. **Given** an active game at any moment, **When** the player views the status area, **Then** the current status is displayed, including whose turn it is, whether the computer is thinking, and any check, checkmate, stalemate, or result condition.

---

### User Story 4 - Restart the Game (Priority: P2)

At any time, whether a game is in progress or has ended, the player can restart to immediately begin fresh with a new difficulty selection.

**Why this priority**: Restart is important for repeated evaluation and testing, but the game is still usable without it in a single session.

**Independent Test**: Make several moves, restart mid-game, and confirm the board, history, and status are reset and difficulty selection is available again. Repeat while the computer is thinking.

**Acceptance Scenarios**:

1. **Given** a game is in progress, **When** the player restarts, **Then** the board returns to the standard starting position, the move history is cleared, the game status is cleared, and difficulty selection becomes available again.
2. **Given** a completed game, **When** the player restarts, **Then** the same reset occurs and the player can select a new difficulty and start a new game.
3. **Given** the computer is thinking, **When** the player restarts, **Then** the pending computer move is abandoned, no further computer move is applied, and the game is reset as described above.
4. **Given** the player has restarted but not yet selected a difficulty, **When** the player attempts to start, **Then** the game does not start until a difficulty is selected.

---

### User Story 5 - Perform Special Chess Moves (Priority: P2)

The player can perform the special chess moves that standard rules allow: pawn promotion, castling, and en passant capture.

**Why this priority**: These moves are required for standard-rules compliance and for the special-rule acceptance scenarios, but they occur less often than ordinary moves.

**Independent Test**: Set up positions that allow promotion, castling, and en passant, perform each move through browser interactions, and confirm the resulting board state and move history are correct.

**Acceptance Scenarios**:

1. **Given** a white pawn reaches the last rank, **When** the player completes that move, **Then** the player is asked to choose the promoted piece from queen, rook, bishop, or knight, and after choosing, the chosen piece occupies the destination square and the move is recorded.
2. **Given** the player's king and a rook are eligible to castle and the path is clear and legal, **When** the player chooses the castling move, **Then** the king and rook both move to their castled squares and the move is recorded.
3. **Given** an opposing black pawn has just advanced two squares and now sits beside a white pawn, **When** the player performs the en passant capture on the next move, **Then** the captured black pawn is removed from the board and the white pawn occupies the en passant destination square.
4. **Given** a player attempts a castling or en passant move that is not legal in the current position, **When** the player attempts it, **Then** the board is unchanged and the move is rejected as with any illegal move.

---

### User Story 6 - Play on a Mobile-Sized Viewport (Priority: P3)

The player can use the full application on a phone-sized browser viewport, including starting a game, moving pieces, and reading status and move history.

**Why this priority**: Mobile usability is required, but the core game can be evaluated on desktop first.

**Independent Test**: Load the application at a mobile-sized viewport, start a game, complete a legal move, observe the computer response, and read the status and history without horizontal scrolling or clipping.

**Acceptance Scenarios**:

1. **Given** the application is opened at a mobile-sized viewport, **When** the player views the interface, **Then** the board, status area, move history, and controls are fully visible and reachable without horizontal scrolling.
2. **Given** the application is at a mobile-sized viewport, **When** the player selects a white piece and a legal destination, **Then** the move is applied and the computer responds exactly as on a desktop viewport.
3. **Given** the application is at a mobile-sized viewport, **When** the player views status and move history, **Then** both remain readable and current.

---

### Edge Cases

- The player attempts to select a black (computer) piece: nothing is selected and no move is initiated.
- The player selects one of their own pieces and then selects another of their own pieces: the selection changes to the newly selected piece.
- The player selects a piece and then selects the same square again: the selection is cancelled.
- The player attempts to move onto a square occupied by their own piece: the move is rejected and the board is unchanged.
- The player attempts to castle through, out of, or into check, or with a blocked path: the castling move is rejected.
- A promotion move is in progress but no promotion piece has been chosen: the turn does not advance and no other move can be made until the choice is completed.
- The player restarts while the computer is thinking or after the game has ended: the reset is clean and no stale computer move is applied.
- The player triggers restart repeatedly and rapidly: the board always ends in the standard starting position with no pending moves.
- The computer has no legal moves: the outcome is correctly reported as checkmate when the computer's king is in check and stalemate when it is not.
- The viewport is resized or rotated during a game: the interface remains usable and the board state is preserved.
- The player attempts to move after the game has ended: the board is unchanged and no move is accepted.
- The player attempts an illegal move while it is the computer's turn (including while the computer is thinking): nothing happens and the board is unchanged.

## Requirements *(mandatory)*

### Functional Requirements

**Players and Setup**

- **FR-001**: The application MUST be a single-player chess game in which the human player always controls the white pieces and the computer opponent always controls the black pieces.
- **FR-002**: A new game MUST begin from the standard chess starting position with the human to move.
- **FR-003**: The board MUST be presented so that the human's white pieces are oriented toward the player.

**Difficulty**

- **FR-004**: The application MUST offer exactly three difficulty levels labeled Easy, Medium, and Hard.
- **FR-005**: A difficulty level MUST be selected before a game can start; the application MUST NOT start a game without a selected difficulty.
- **FR-006**: Once a game has started, the selected difficulty MUST NOT be changeable unless the player restarts and starts a new game.
- **FR-007**: The three difficulty levels MUST produce meaningfully different opponent strength that is observable by the player. Each difficulty MUST have a fixed, documented behavior tier (for example, a defined search depth or randomness level) that is exposed as a browser-observable value and verified against expected moves on a curated set of positions.
- **FR-008**: Changing difficulty MUST NOT alter the rules or the set of legal moves available in a position.

**Turns and Move Interaction**

- **FR-009**: The human player MUST be able to select a white piece and choose a legal destination square using click/tap browser interactions: clicking or tapping a piece selects it, and clicking or tapping a legal destination square completes the move. Drag-and-drop is NOT required.
- **FR-010**: The interface MUST make the currently selected piece visually distinguishable from unselected pieces.
- **FR-011**: The application MUST accept only legal moves.
- **FR-012**: When the player attempts an illegal move, the board state MUST remain unchanged, the turn MUST NOT advance, and the player MUST receive non-disruptive feedback that the move was not allowed.
- **FR-013**: The player MUST NOT be able to select or move the computer's black pieces.
- **FR-014**: After each legal human move, the computer MUST automatically make exactly one legal move as black, unless the game has ended.
- **FR-015**: The computer's move MUST be a legal move for the current position and MUST follow the same rules as the human player's moves.
- **FR-016**: While the computer is deciding or applying its move, the interface MUST display a visible indicator that the computer is thinking. The thinking state MUST be exposed as a deterministic, browser-observable state flag that is set when thinking begins and cleared only after the computer's move is applied, and the visible indicator MUST remain shown for a minimum duration of at least 250 ms on every computer turn.
- **FR-017**: While the computer is thinking, player interaction with the board MUST be prevented or ignored, and the board state MUST NOT change as a result of player actions.
- **FR-018**: After the computer completes its move, the turn MUST return to the human player unless the game has ended.

**Chess Rules**

- **FR-019**: The application MUST enforce legal movement for every piece type.
- **FR-020**: The application MUST enforce captures according to the rules for each piece.
- **FR-021**: The application MUST enforce check restrictions, including that a player may not make a move that leaves or places their own king in check.
- **FR-022**: The application MUST support castling, including the restrictions on when castling is legal.
- **FR-023**: The application MUST support en passant capture.
- **FR-024**: The application MUST support pawn promotion and MUST let the promoting player choose queen, rook, bishop, or knight.
- **FR-025**: The application MUST detect checkmate and end the game with the appropriate winner.
- **FR-026**: The application MUST detect stalemate and end the game as a draw.
- **FR-027**: Once the game has ended, the application MUST NOT accept any further moves.

**Status and History**

- **FR-028**: The interface MUST display the current game status at all times, including whose turn it is, whether the computer is thinking, and any check, checkmate, stalemate, or result condition.
- **FR-029**: The interface MUST visibly communicate when a king is in check.
- **FR-030**: The interface MUST visibly communicate checkmate and identify the winner.
- **FR-031**: The interface MUST visibly communicate stalemate as a draw.
- **FR-032**: The interface MUST display a move history that includes both the human player's moves and the computer's moves in the order they occurred, distinguishable by which side made each move.

**Restart**

- **FR-033**: The player MUST be able to restart the game at any time, including during an active game, while the computer is thinking, and after the game has ended.
- **FR-034**: Restarting MUST return the board to the standard starting position, clear the move history, clear the game status, and make difficulty selection available again.
- **FR-035**: Restarting while the computer is thinking MUST abandon any pending computer move so that no stale move is applied after the reset.

**Viewport and Testability**

- **FR-036**: The interface MUST remain usable at desktop browser viewports and at any mobile-sized viewport width of 480 px or less, guaranteed down to a minimum width of 320 px, without horizontal scrolling or clipped controls.
- **FR-037**: All core interactions (starting a game, selecting difficulty, moving pieces, restarting, and reading status and history) MUST be available at a mobile-sized viewport.
- **FR-038**: Interactive elements and the state that tests depend on (such as turn, status condition, thinking indicator, and move history) MUST be observable through the browser so that behavior can be driven and verified by browser automation.
- **FR-039**: Interactive elements and observable game state MUST expose stable, accessible roles and labels. Pointer/click MUST be a sufficient input method for all core interactions; full keyboard operability of the board is NOT required for this prototype.

### Key Entities *(include if data involved)*

- **Game**: The overall session. Attributes include whether it has started, whether it is active or ended, whose turn it is, the selected difficulty, and the result when ended.
- **Human Player**: The person, always assigned the white pieces.
- **Computer Opponent**: The automated black side, whose strength depends on the selected difficulty level.
- **Difficulty Level**: One of Easy, Medium, or Hard; selected before starting and locked during a game.
- **Piece**: A chess piece with a color (white or black), a type (king, queen, rook, bishop, knight, pawn), and a current square.
- **Move**: A single turn action, including the moving side, the origin and destination squares, and whether it is a special move (capture, castling, en passant, or promotion).
- **Move History**: The ordered record of moves made by the human and the computer, attributed to the side that made each move.
- **Game Status**: The currently displayed condition, including turn ownership, the computer-thinking indicator, check, checkmate, stalemate, and the final result.
- **Board**: The collection of squares and the pieces occupying them at the current moment.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time player can select a difficulty and start a game in under 30 seconds from loading the application.
- **SC-002**: 100% of illegal move attempts leave the board state unchanged and do not advance the turn, across the illegal-move scenarios exercised by browser tests.
- **SC-003**: 100% of new games begin from the standard chess starting position with the human to move.
- **SC-004**: After every legal human move, the computer produces a legal reply automatically, and the browser-observable thinking state flag is set (with the visible indicator shown for at least 250 ms) before the reply is applied, in 100% of tested moves.
- **SC-005**: The player is unable to make a move while the computer is thinking in 100% of tested attempts, with the board unchanged.
- **SC-006**: Each difficulty level's documented behavior tier is exposed as a browser-observable value, and on a curated set of positions each difficulty produces its expected tier-appropriate move in 100% of tested positions.
- **SC-007**: Check, checkmate, and stalemate are correctly detected and displayed in 100% of the positions tested for those conditions.
- **SC-008**: No move is accepted after the game has ended in 100% of tested attempts.
- **SC-009**: Promotion, castling, and en passant each succeed in 100% of the legal positions tested and are correctly rejected when illegal.
- **SC-010**: Restarting from an active game, from a completed game, and while the computer is thinking all result in the standard starting position with empty history and cleared status in 100% of tested attempts.
- **SC-011**: At mobile viewport widths from 480 px down to 320 px, all acceptance scenarios that are tested on desktop remain executable and observable without horizontal scrolling.
- **SC-012**: All acceptance scenarios in this specification can be exercised and verified through browser interactions alone, without manual inspection of internals.
- **SC-013**: Interactive controls and observable state expose accessible roles and labels, and every core interaction is completable using pointer/click input alone, in 100% of tested scenarios.

## Assumptions

- The target user is a single person playing on one device in a modern graphical browser; no account, sign-in, or network connection is required.
- Game state exists only for the current session; refreshing or closing the page discards the game and starts over. No game history is persisted.
- The human always plays white and the computer always plays black; there is no option to choose sides.
- Difficulty must be chosen explicitly; no difficulty is preselected when the application loads.
- The three difficulty levels map to increasing opponent strength (Easy weakest, Hard strongest). The exact mechanism is a planning decision, but each level MUST have a fixed, documented behavior tier that is exposed as a browser-observable value and verifiable against expected moves on curated positions (see FR-007, SC-006).
- Only stalemate is treated as a draw for this prototype. Other draw conditions from tournament chess (threefold repetition, the fifty-move rule, and insufficient material) are out of scope.
- Promotion offers queen, rook, bishop, or knight; choosing a piece other than a queen is supported.
- The exact naming/notation used in the move history and the exact visual styling of the board, selection, status, and thinking indicator are not prescribed; only their observable presence and correctness is required.
- The computer's thinking indicator is guaranteed to be observable before the computer's move is applied: a deterministic browser-observable state flag is set when thinking begins and cleared only after the move is applied, and the visible indicator is shown for at least 250 ms. The underlying computation may still be brief.
- The computer is expected to respond within a few seconds at every difficulty level so the game remains playable.
- Features such as undo, move hints, takeback, resign, draw offers, timers, sound, chat, multiplayer, ratings, matchmaking, tournaments, opening databases, and advanced analysis are out of scope.
- Pointer/click is the only required input method for core interactions. Full keyboard operability of the board (navigation, selection, and move confirmation) is out of scope, but interactive elements and observable state must expose accessible roles and labels for automation and basic assistive technology.
- Mobile-sized viewport testing covers widths from 480 px down to a guaranteed minimum of 320 px; desktop testing uses a standard desktop-width viewport.
- Piece movement uses click/tap-to-select followed by click/tap-destination; drag-and-drop is not required.
