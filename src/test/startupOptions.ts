import type { Difficulty } from "../game/types";

export interface StartupOptions {
  fen: string | null;
  difficulty: Difficulty | null;
}

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

/**
 * Test/automation affordance (research R6): reads an optional `?fen=` seed and a
 * `?difficulty=` preselect from the URL. Adds no UI and does not change the
 * normal user-facing start path.
 */
export function parseStartupOptions(
  search: string = typeof window === "undefined" ? "" : window.location.search,
): StartupOptions {
  const params = new URLSearchParams(search);

  const rawFen = params.get("fen");
  const fen = rawFen && rawFen.trim().length > 0 ? rawFen : null;

  const rawDifficulty = params.get("difficulty");
  const difficulty =
    rawDifficulty && (DIFFICULTIES as string[]).includes(rawDifficulty)
      ? (rawDifficulty as Difficulty)
      : null;

  return { fen, difficulty };
}
