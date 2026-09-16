import { expect, test } from "@playwright/test";
import type { Difficulty } from "../../src/game/types";
import { TIER_DEPTH } from "../../src/engine/difficulty";
import { ENGINE_MOVES } from "../fixtures/engine-moves";
import { STANDARD_START_FEN } from "../fixtures/positions";
import {
  clickSquare,
  gameStatus,
  gotoApp,
  installThinkingObserver,
  makeMove,
  moveHistoryItems,
  square,
  startGame,
  waitForComputerTurnToFinish,
  waitForThinkingDuration,
} from "../helpers/game";

const TIERS: Difficulty[] = ["easy", "medium", "hard"];

test.describe("US2 - Computer turn", () => {
  test("shows a visible thinking indicator for at least 250 ms", async ({ page }) => {
    await gotoApp(page, { difficulty: "easy" });
    await startGame(page);
    await installThinkingObserver(page);

    await makeMove(page, "e2", "e4");

    await expect(gameStatus(page)).toHaveAttribute("data-thinking", "true");
    await expect(page.getByTestId("thinking-indicator")).toBeVisible();
    await expect(gameStatus(page)).toHaveAttribute("aria-busy", "true");

    const duration = await waitForThinkingDuration(page);
    expect(duration).toBeGreaterThanOrEqual(250);

    await expect(gameStatus(page)).toHaveAttribute("data-thinking", "false");
    await expect(page.getByTestId("thinking-indicator")).toBeHidden();
    await expect(gameStatus(page)).toHaveAttribute("aria-busy", "false");
  });

  test("blocks player input while thinking and replies exactly once", async ({ page }) => {
    await gotoApp(page, { difficulty: "easy" });
    await startGame(page);

    await makeMove(page, "e2", "e4");
    await expect(gameStatus(page)).toHaveAttribute("data-thinking", "true");

    await clickSquare(page, "d2");
    await expect(square(page, "d2")).toHaveAttribute("aria-selected", "false");

    await waitForComputerTurnToFinish(page);

    const items = moveHistoryItems(page);
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toHaveAttribute("data-side", "white");
    await expect(items.nth(1)).toHaveAttribute("data-side", "black");
  });

  for (const fixture of ENGINE_MOVES) {
    for (const difficulty of TIERS) {
      test(`engine reply for ${fixture.id} at ${difficulty} matches the fixture`, async ({
        page,
      }) => {
        await gotoApp(page, { fen: fixture.fen, difficulty });
        await startGame(page);

        await expect(gameStatus(page)).toHaveAttribute(
          "data-engine-depth",
          String(TIER_DEPTH[difficulty]),
        );

        const item = page.getByTestId("move-1");
        await expect(item).toBeAttached({ timeout: 15_000 });
        await expect(item).toHaveAttribute("data-side", "black");

        const from = await item.getAttribute("data-from");
        const to = await item.getAttribute("data-to");
        const promotion = await item.getAttribute("data-promotion");
        expect(`${from}${to}${promotion ?? ""}`).toBe(fixture.moves[difficulty]);
      });
    }
  }

  test("difficulty does not change the set of legal moves (FR-008)", async ({ page }) => {
    const observed: Record<string, { depth: string | null; targets: string | null }> = {};

    for (const difficulty of TIERS) {
      await gotoApp(page, { fen: STANDARD_START_FEN, difficulty });
      await startGame(page);
      await clickSquare(page, "e2");
      observed[difficulty] = {
        depth: await gameStatus(page).getAttribute("data-engine-depth"),
        targets: await gameStatus(page).getAttribute("data-legal-targets"),
      };
    }

    expect(observed.easy.targets).toBe("e3,e4");
    expect(observed.medium.targets).toBe(observed.easy.targets);
    expect(observed.hard.targets).toBe(observed.easy.targets);
    expect(observed.easy.depth).toBe("1");
    expect(observed.medium.depth).toBe("4");
    expect(observed.hard.depth).toBe("12");
  });

  test("engine failure is browser-observable and non-disruptive (FR-040)", async ({ page }) => {
    await page.route("**/engine/**", (route) => route.abort());
    await gotoApp(page, { difficulty: "easy" });
    await startGame(page);

    await makeMove(page, "e2", "e4");

    await expect(gameStatus(page)).toHaveAttribute("data-engine-error", "true", {
      timeout: 15_000,
    });
    await expect(page.getByTestId("engine-error")).toBeVisible();
    await expect(gameStatus(page)).toHaveAttribute("data-thinking", "false");
    await expect(page.getByTestId("restart-game")).toBeEnabled();
  });

  test("normal thinking/reply behavior is unchanged when the engine loads", async ({ page }) => {
    await gotoApp(page, { difficulty: "easy" });
    await startGame(page);
    await makeMove(page, "e2", "e4");
    await waitForComputerTurnToFinish(page);
    await expect(gameStatus(page)).toHaveAttribute("data-engine-error", "false");
    await expect(moveHistoryItems(page)).toHaveCount(2);
  });
});
