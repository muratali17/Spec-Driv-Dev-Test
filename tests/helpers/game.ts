import { expect, type Locator, type Page } from "@playwright/test";
import type { Difficulty } from "../../src/game/types";

declare global {
  interface Window {
    __thinkingRecord?: { start: number | null; duration: number | null };
  }
}

export interface StartOptions {
  fen?: string;
  difficulty?: Difficulty;
}

export function appUrl(options: StartOptions = {}): string {
  const params = new URLSearchParams();
  if (options.fen) params.set("fen", options.fen);
  if (options.difficulty) params.set("difficulty", options.difficulty);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export async function gotoApp(page: Page, options: StartOptions = {}): Promise<void> {
  await page.goto(appUrl(options));
}

export function gameStatus(page: Page): Locator {
  return page.getByTestId("game-status");
}

export async function readState(page: Page): Promise<Record<string, string | null>> {
  return gameStatus(page).evaluate((element) => {
    const data = { ...(element as HTMLElement).dataset } as Record<string, string | undefined>;
    const normalized: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(data)) normalized[key] = value ?? null;
    return normalized;
  });
}

export async function selectDifficulty(page: Page, difficulty: Difficulty): Promise<void> {
  await page.getByTestId(`difficulty-${difficulty}`).click();
}

export async function startGame(page: Page): Promise<void> {
  await page.getByTestId("start-game").click();
}

export function square(page: Page, squareName: string): Locator {
  return page.locator(`[data-square="${squareName}"]`);
}

export async function clickSquare(page: Page, squareName: string): Promise<void> {
  await square(page, squareName).click();
}

export async function makeMove(page: Page, from: string, to: string): Promise<void> {
  await clickSquare(page, from);
  await clickSquare(page, to);
}

export async function startMove(page: Page, from: string, to: string): Promise<void> {
  await clickSquare(page, from);
  await clickSquare(page, to);
}

export async function selectSquare(page: Page, squareName: string): Promise<void> {
  await clickSquare(page, squareName);
}

/** Wait until the computer has finished its turn (or the game ended). */
export async function waitForComputerTurnToFinish(page: Page): Promise<void> {
  await expect(gameStatus(page)).toHaveAttribute("data-thinking", "false", { timeout: 15_000 });
  await expect(gameStatus(page)).toHaveAttribute("data-turn", "white", { timeout: 15_000 });
}

/** Install a MutationObserver that records the data-thinking true -> false interval. */
export async function installThinkingObserver(page: Page): Promise<void> {
  await page.evaluate(() => {
    const element = document.querySelector('[data-testid="game-status"]');
    window.__thinkingRecord = { start: null, duration: null };
    if (!element) return;
    const observer = new MutationObserver(() => {
      const record = window.__thinkingRecord;
      if (!record) return;
      const thinking = element.getAttribute("data-thinking");
      if (thinking === "true" && record.start === null) {
        record.start = performance.now();
      } else if (thinking === "false" && record.start !== null && record.duration === null) {
        record.duration = performance.now() - record.start;
      }
    });
    observer.observe(element, { attributes: true, attributeFilter: ["data-thinking"] });
  });
}

export async function waitForThinkingDuration(page: Page): Promise<number> {
  await page.waitForFunction(() => window.__thinkingRecord?.duration != null, null, {
    timeout: 15_000,
  });
  const duration = await page.evaluate(() => window.__thinkingRecord?.duration ?? null);
  expect(duration).not.toBeNull();
  return duration as number;
}

export function moveHistoryItems(page: Page): Locator {
  return page.getByTestId("move-history").getByRole("listitem");
}

export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}
