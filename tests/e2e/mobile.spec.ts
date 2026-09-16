import { expect, test } from "@playwright/test";
import {
  expectNoHorizontalScroll,
  gameStatus,
  gotoApp,
  makeMove,
  moveHistoryItems,
  startGame,
  waitForComputerTurnToFinish,
} from "../helpers/game";

const WIDTHS = [480, 375, 320];

for (const width of WIDTHS) {
  test(`is fully usable without horizontal scrolling at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 });
    await gotoApp(page, { difficulty: "easy" });

    await expect(page.getByTestId("game-status")).toBeVisible();
    await expectNoHorizontalScroll(page);

    await startGame(page);
    await expectNoHorizontalScroll(page);

    await makeMove(page, "e2", "e4");
    await waitForComputerTurnToFinish(page);

    await expect(gameStatus(page)).toHaveAttribute("data-turn", "white");
    await expect(moveHistoryItems(page)).toHaveCount(2);
    await expect(gameStatus(page)).toBeVisible();
    await expect(page.getByTestId("move-history")).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
}
