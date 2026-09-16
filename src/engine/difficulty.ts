import type { EngineTier } from "../game/types";

/**
 * Fixed search depths per difficulty. `Skill Level` is intentionally not used
 * because it randomizes the engine output (research R3).
 */
export const TIER_DEPTH: EngineTier = {
  easy: 1,
  medium: 4,
  hard: 12,
};
