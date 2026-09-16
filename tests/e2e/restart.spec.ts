import { expect, test } from "@playwright/test";
import { HUMAN_MATE_IN_1_FEN, PROMOTION_FEN } from "../fixtures/positions";
import {
  gameStatus,
  gotoApp,
  makeMove,
  moveHistoryItems,
  selectDifficulty,
  square,
  startGame,
  waitForComputerTurnToFinish,
} from "../helpers/game";

test.describe("US4 - Restart", () => {
  test("resets an active game to setup with the standard position", async ({ page }) => {
    await gotoApp(page, { fen: PROMOTION_FEN, difficulty: "easy" });
    await startGame(page);
    await makeMove(page, "d7", "d8");
    await page.getByTestId("promote-q").click();
    await waitForComputerTurnToFinish(page);
    await expect(moveHistoryItems(page)).toHaveCount(2);

    await page.getByTestId("restart-game").click();

    await expect(gameStatus(page)).toHaveAttribute("data-phase", "setup");
    await expect(gameStatus(page)).toHaveAttribute("data-difficulty", "none");
    await expect(moveHistoryItems(page)).toHaveCount(0);
    await expect(square(page, "e2")).toHaveAttribute("data-side", "white");
    await expect(square(page, "d7")).toHaveAttribute("data-side", "black");
    await expect(square(page, "d7")).toHaveAttribute("data-piece", "p");
  });

  test("resets a completed game", async ({ page }) => {
    await gotoApp(page, { fen: HUMAN_MATE_IN_1_FEN, difficulty: "easy" });
    await startGame(page);
    await makeMove(page, "a1", "a8");
    await expect(gameStatus(page)).toHaveAttribute("data-phase", "ended");

    await page.getByTestId("restart-game").click();

    await expect(gameStatus(page)).toHaveAttribute("data-phase", "setup");
    await expect(gameStatus(page)).toHaveAttribute("data-result", "none");
    await expect(moveHistoryItems(page)).toHaveCount(0);
    await expect(square(page, "a1")).toHaveAttribute("data-piece", "r");
  });

  test("restarting while thinking abandons the pending computer move", async ({ page }) => {
    await gotoApp(page, { difficulty: "easy" });
    await startGame(page);
    await makeMove(page, "e2", "e4");
    await expect(gameStatus(page)).toHaveAttribute("data-thinking", "true");

    await page.getByTestId("restart-game").click();

    await expect(gameStatus(page)).toHaveAttribute("data-phase", "setup");
    await expect(gameStatus(page)).toHaveAttribute("data-thinking", "false");

    await page.waitForTimeout(1500);

    await expect(gameStatus(page)).toHaveAttribute("data-phase", "setup");
    await expect(gameStatus(page)).toHaveAttribute("data-thinking", "false");
    await expect(moveHistoryItems(page)).toHaveCount(0);
    await expect(square(page, "e2")).toHaveAttribute("data-piece", "p");
    await expect(square(page, "e4")).toHaveAttribute("data-piece", "");
  });

  test("start is blocked until a new difficulty is selected after restart", async ({ page }) => {
    await gotoApp(page, { difficulty: "medium" });
    await startGame(page);
    await page.getByTestId("restart-game").click();

    await expect(gameStatus(page)).toHaveAttribute("data-difficulty", "none");

    await startGame(page);
    await expect(gameStatus(page)).toHaveAttribute("data-phase", "setup");
    await expect(page.getByTestId("message")).toBeVisible();

    await selectDifficulty(page, "hard");
    await startGame(page);
    await expect(gameStatus(page)).toHaveAttribute("data-phase", "playing");
    await expect(gameStatus(page)).toHaveAttribute("data-difficulty", "hard");
  });
});
