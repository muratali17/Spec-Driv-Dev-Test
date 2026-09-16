import { expect, test } from "@playwright/test";
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

test.describe("US2 - Legal and illegal moves", () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page, { difficulty: "easy" });
    await startGame(page);
    await expect(gameStatus(page)).toHaveAttribute("data-turn", "white");
  });

  test("a legal move applies and passes the turn to the computer", async ({ page }) => {
    await makeMove(page, "e2", "e4");

    await expect(square(page, "e4")).toHaveAttribute("data-side", "white");
    await expect(square(page, "e4")).toHaveAttribute("data-piece", "p");
    await expect(square(page, "e2")).toHaveAttribute("data-piece", "");
    await expect(gameStatus(page)).toHaveAttribute("data-turn", "black");

    await waitForComputerTurnToFinish(page);
    await expect(moveHistoryItems(page)).toHaveCount(2);
  });

  test("an illegal destination leaves the board unchanged with feedback", async ({ page }) => {
    await clickSquare(page, "e2");
    await clickSquare(page, "e5");

    await expect(gameStatus(page)).toHaveAttribute("data-turn", "white");
    await expect(square(page, "e2")).toHaveAttribute("data-piece", "p");
    await expect(square(page, "e5")).toHaveAttribute("data-piece", "");
    await expect(page.getByTestId("message")).toBeVisible();
  });

  test("black pieces cannot be selected", async ({ page }) => {
    await clickSquare(page, "e7");

    await expect(square(page, "e7")).toHaveAttribute("aria-selected", "false");
    await expect(gameStatus(page)).toHaveAttribute("data-legal-targets", "");
  });

  test("selecting another own piece reselects it", async ({ page }) => {
    await clickSquare(page, "b1");
    await expect(square(page, "b1")).toHaveAttribute("aria-selected", "true");

    await clickSquare(page, "g1");
    await expect(square(page, "g1")).toHaveAttribute("aria-selected", "true");
    await expect(square(page, "b1")).toHaveAttribute("aria-selected", "false");
  });

  test("clicking the selected square again cancels the selection", async ({ page }) => {
    await clickSquare(page, "e2");
    await expect(square(page, "e2")).toHaveAttribute("aria-selected", "true");

    await clickSquare(page, "e2");
    await expect(square(page, "e2")).toHaveAttribute("aria-selected", "false");
    await expect(gameStatus(page)).toHaveAttribute("data-legal-targets", "");
  });

  test("attempting to move onto an own piece leaves the board unchanged", async ({ page }) => {
    await clickSquare(page, "a1");
    await clickSquare(page, "a2");

    await expect(square(page, "a1")).toHaveAttribute("data-piece", "r");
    await expect(square(page, "a2")).toHaveAttribute("data-side", "white");
    await expect(gameStatus(page)).toHaveAttribute("data-turn", "white");
    await expect(moveHistoryItems(page)).toHaveCount(0);
  });
});
