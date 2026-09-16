import { expect, test } from "@playwright/test";
import {
  CHECK_IN_PROGRESS_FEN,
  COMPUTER_MATE_IN_1_FEN,
  HUMAN_MATE_IN_1_FEN,
  INSUFFICIENT_MATERIAL_FEN,
  STALEMATE_FEN,
} from "../fixtures/positions";
import {
  clickSquare,
  gameStatus,
  gotoApp,
  makeMove,
  moveHistoryItems,
  square,
  startGame,
  waitForComputerTurnToFinish,
} from "../helpers/game";

test.describe("US3 - Check, checkmate, stalemate", () => {
  test("displays check and identifies the side in check", async ({ page }) => {
    await gotoApp(page, { fen: CHECK_IN_PROGRESS_FEN, difficulty: "easy" });
    await startGame(page);

    await expect(gameStatus(page)).toHaveAttribute("data-check", "true");
    await expect(gameStatus(page)).toHaveAttribute("data-phase", "playing");
    await expect(page.getByTestId("status-text")).toContainText("check");
    await expect(page.getByTestId("status-text")).toContainText("White");
  });

  test("human checkmate ends the game with white as winner", async ({ page }) => {
    await gotoApp(page, { fen: HUMAN_MATE_IN_1_FEN, difficulty: "easy" });
    await startGame(page);

    await makeMove(page, "a1", "a8");

    await expect(gameStatus(page)).toHaveAttribute("data-result", "checkmate");
    await expect(gameStatus(page)).toHaveAttribute("data-winner", "white");
    await expect(gameStatus(page)).toHaveAttribute("data-phase", "ended");
    await expect(page.getByTestId("status-text")).toContainText("Checkmate");
  });

  test("computer checkmate ends the game with black as winner", async ({ page }) => {
    await gotoApp(page, { fen: COMPUTER_MATE_IN_1_FEN, difficulty: "easy" });
    await startGame(page);

    await expect(gameStatus(page)).toHaveAttribute("data-result", "checkmate", {
      timeout: 15_000,
    });
    await expect(gameStatus(page)).toHaveAttribute("data-winner", "black");
    await expect(gameStatus(page)).toHaveAttribute("data-phase", "ended");
  });

  test("stalemate ends the game as a draw", async ({ page }) => {
    await gotoApp(page, { fen: STALEMATE_FEN, difficulty: "easy" });
    await startGame(page);

    await expect(gameStatus(page)).toHaveAttribute("data-result", "stalemate");
    await expect(gameStatus(page)).toHaveAttribute("data-winner", "none");
    await expect(gameStatus(page)).toHaveAttribute("data-phase", "ended");
    await expect(page.getByTestId("status-text")).toContainText("Stalemate");
  });

  test("no move is accepted after the game has ended", async ({ page }) => {
    await gotoApp(page, { fen: HUMAN_MATE_IN_1_FEN, difficulty: "easy" });
    await startGame(page);
    await makeMove(page, "a1", "a8");
    await expect(gameStatus(page)).toHaveAttribute("data-result", "checkmate");

    const historyBefore = await moveHistoryItems(page).count();

    await clickSquare(page, "g1");
    await clickSquare(page, "f1");

    await expect(moveHistoryItems(page)).toHaveCount(historyBefore);
    await expect(gameStatus(page)).toHaveAttribute("data-phase", "ended");
    await expect(square(page, "g1")).toHaveAttribute("data-piece", "k");
  });

  test("an out-of-scope draw keeps the game playing", async ({ page }) => {
    await gotoApp(page, { fen: INSUFFICIENT_MATERIAL_FEN, difficulty: "easy" });
    await startGame(page);

    await expect(gameStatus(page)).toHaveAttribute("data-phase", "playing");
    await expect(gameStatus(page)).toHaveAttribute("data-result", "none");

    await makeMove(page, "e2", "e3");
    await waitForComputerTurnToFinish(page);

    await expect(gameStatus(page)).toHaveAttribute("data-result", "none");
    await expect(gameStatus(page)).toHaveAttribute("data-phase", "playing");
  });
});
