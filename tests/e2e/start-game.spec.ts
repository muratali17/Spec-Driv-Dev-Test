import { expect, test } from "@playwright/test";
import {
  gameStatus,
  gotoApp,
  selectDifficulty,
  square,
  startGame,
} from "../helpers/game";

test.describe("US1 - Start a new game at a chosen difficulty", () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page);
  });

  test("shows exactly three difficulty options and no game running", async ({ page }) => {
    const radios = page.getByRole("radio");
    await expect(radios).toHaveCount(3);
    await expect(page.getByRole("radio", { name: "Easy" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Medium" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Hard" })).toBeVisible();

    for (const name of ["Easy", "Medium", "Hard"]) {
      await expect(page.getByRole("radio", { name })).toHaveAttribute("aria-checked", "false");
    }

    await expect(gameStatus(page)).toHaveAttribute("data-phase", "setup");
    await expect(gameStatus(page)).toHaveAttribute("data-difficulty", "none");
  });

  test("does not start without a difficulty and shows feedback", async ({ page }) => {
    await startGame(page);

    await expect(gameStatus(page)).toHaveAttribute("data-phase", "setup");
    await expect(page.getByTestId("message")).toBeVisible();
    await expect(page.getByTestId("message")).not.toHaveText("");
  });

  test("starts the standard position at each difficulty with the correct depth", async ({
    page,
  }) => {
    const tiers: Array<[string, string]> = [
      ["easy", "1"],
      ["medium", "4"],
      ["hard", "12"],
    ];

    for (const [difficulty, depth] of tiers) {
      await selectDifficulty(page, difficulty as "easy" | "medium" | "hard");
      await startGame(page);

      await expect(gameStatus(page)).toHaveAttribute("data-phase", "playing");
      await expect(gameStatus(page)).toHaveAttribute("data-turn", "white");
      await expect(gameStatus(page)).toHaveAttribute("data-difficulty", difficulty);
      await expect(gameStatus(page)).toHaveAttribute("data-engine-depth", depth);

      await expect(square(page, "e2")).toHaveAttribute("data-side", "white");
      await expect(square(page, "e2")).toHaveAttribute("data-piece", "p");
      await expect(square(page, "e7")).toHaveAttribute("data-side", "black");
      await expect(square(page, "e4")).toHaveAttribute("data-piece", "");

      await page.getByTestId("restart-game").click();
      await expect(gameStatus(page)).toHaveAttribute("data-phase", "setup");
    }
  });

  test("locks and displays the difficulty while playing", async ({ page }) => {
    await selectDifficulty(page, "medium");
    await startGame(page);

    await expect(gameStatus(page)).toHaveAttribute("data-difficulty", "medium");
    await expect(page.getByRole("radio", { name: "Medium" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    for (const name of ["Easy", "Medium", "Hard"]) {
      await expect(page.getByRole("radio", { name })).toBeDisabled();
    }
  });
});
