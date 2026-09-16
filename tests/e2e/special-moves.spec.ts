import { expect, test } from "@playwright/test";
import {
  CASTLING_BLOCKED_FEN,
  CASTLING_FEN,
  EN_PASSANT_FEN,
  EN_PASSANT_UNAVAILABLE_FEN,
  PROMOTION_FEN,
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

test.describe("US5 - Special moves", () => {
  test("promotion asks for a piece and blocks the turn until chosen", async ({ page }) => {
    await gotoApp(page, { fen: PROMOTION_FEN, difficulty: "easy" });
    await startGame(page);

    await makeMove(page, "d7", "d8");

    await expect(page.getByTestId("promotion-dialog")).toBeVisible();
    await expect(gameStatus(page)).toHaveAttribute("data-turn", "white");
    await expect(square(page, "d7")).toHaveAttribute("data-piece", "p");
    await expect(square(page, "d8")).toHaveAttribute("data-piece", "");

    await page.getByTestId("promote-q").click();

    await expect(page.getByTestId("promotion-dialog")).toBeHidden();
    await expect(square(page, "d8")).toHaveAttribute("data-side", "white");
    await expect(square(page, "d8")).toHaveAttribute("data-piece", "q");

    const firstMove = moveHistoryItems(page).nth(0);
    await expect(firstMove).toHaveAttribute("data-side", "white");
    await expect(firstMove).toHaveAttribute("data-promotion", "q");
    await expect(firstMove).toHaveAttribute("data-special", "promotion");

    await waitForComputerTurnToFinish(page);
  });

  test("castling moves both the king and the rook", async ({ page }) => {
    await gotoApp(page, { fen: CASTLING_FEN, difficulty: "easy" });
    await startGame(page);

    await makeMove(page, "e1", "g1");

    await expect(square(page, "g1")).toHaveAttribute("data-side", "white");
    await expect(square(page, "g1")).toHaveAttribute("data-piece", "k");
    await expect(square(page, "f1")).toHaveAttribute("data-side", "white");
    await expect(square(page, "f1")).toHaveAttribute("data-piece", "r");
    await expect(square(page, "e1")).toHaveAttribute("data-piece", "");
    await expect(square(page, "h1")).toHaveAttribute("data-piece", "");

    await expect(moveHistoryItems(page).nth(0)).toHaveAttribute("data-special", "castle");

    await waitForComputerTurnToFinish(page);
  });

  test("en passant removes the captured pawn", async ({ page }) => {
    await gotoApp(page, { fen: EN_PASSANT_FEN, difficulty: "easy" });
    await startGame(page);

    await makeMove(page, "e5", "d6");

    await expect(square(page, "d6")).toHaveAttribute("data-side", "white");
    await expect(square(page, "d6")).toHaveAttribute("data-piece", "p");
    await expect(square(page, "d5")).toHaveAttribute("data-piece", "");

    await expect(moveHistoryItems(page).nth(0)).toHaveAttribute("data-special", "en-passant");

    await waitForComputerTurnToFinish(page);
  });

  test("illegal castling is rejected like any illegal move", async ({ page }) => {
    await gotoApp(page, { fen: CASTLING_BLOCKED_FEN, difficulty: "easy" });
    await startGame(page);

    await clickSquare(page, "e1");
    await clickSquare(page, "g1");

    await expect(square(page, "e1")).toHaveAttribute("data-piece", "k");
    await expect(square(page, "h1")).toHaveAttribute("data-piece", "r");
    await expect(page.getByTestId("message")).toBeVisible();
    await expect(moveHistoryItems(page)).toHaveCount(0);
    await expect(gameStatus(page)).toHaveAttribute("data-turn", "white");
  });

  test("illegal en passant is rejected like any illegal move", async ({ page }) => {
    await gotoApp(page, { fen: EN_PASSANT_UNAVAILABLE_FEN, difficulty: "easy" });
    await startGame(page);

    await clickSquare(page, "e5");
    await clickSquare(page, "d6");

    await expect(square(page, "e5")).toHaveAttribute("data-piece", "p");
    await expect(square(page, "d5")).toHaveAttribute("data-side", "black");
    await expect(page.getByTestId("message")).toBeVisible();
    await expect(moveHistoryItems(page)).toHaveCount(0);
  });
});
