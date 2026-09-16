import { expect, test } from "@playwright/test";
import {
  clickSquare,
  gameStatus,
  gotoApp,
  makeMove,
  moveHistoryItems,
  startGame,
  waitForComputerTurnToFinish,
} from "../helpers/game";

test.describe("US2/US3 - History and status", () => {
  test("records each move once, in order, with the correct side", async ({ page }) => {
    await gotoApp(page, { difficulty: "easy" });
    await startGame(page);

    await makeMove(page, "e2", "e4");
    await waitForComputerTurnToFinish(page);

    await clickSquare(page, "d2");
    await clickSquare(page, "d4");
    await expect(page.getByTestId("message")).toBeHidden();
    await waitForComputerTurnToFinish(page);

    const items = moveHistoryItems(page);
    await expect(items).toHaveCount(4);

    const expectedSides = ["white", "black", "white", "black"];
    for (let index = 0; index < expectedSides.length; index += 1) {
      await expect(items.nth(index)).toHaveAttribute("data-side", expectedSides[index]);
      await expect(items.nth(index)).toHaveAttribute("data-ply", String(index + 1));
    }

    await expect(items.nth(0)).toContainText("e4");
    await expect(items.nth(2)).toContainText("d4");
  });

  test("status reflects the turn and the thinking state", async ({ page }) => {
    await gotoApp(page, { difficulty: "easy" });
    await startGame(page);

    await expect(gameStatus(page)).toHaveAttribute("data-turn", "white");
    await expect(gameStatus(page)).toHaveAttribute("data-thinking", "false");

    await makeMove(page, "e2", "e4");
    await expect(gameStatus(page)).toHaveAttribute("data-turn", "black");
    await expect(gameStatus(page)).toHaveAttribute("data-thinking", "true");

    await waitForComputerTurnToFinish(page);
    await expect(gameStatus(page)).toHaveAttribute("data-turn", "white");
    await expect(gameStatus(page)).toHaveAttribute("data-thinking", "false");
  });
});
