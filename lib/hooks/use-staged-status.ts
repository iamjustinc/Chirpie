"use client";

/**
 * lib/hooks/use-staged-status.ts
 *
 * Cycles through a list of status strings at a fixed interval while `active`
 * is true. Resets to the first stage when `active` goes false.
 *
 * Used by ConversationThread to give the typing indicator a sense of progress
 * without fake token-by-token streaming.
 */

import { useState, useEffect } from "react";

export const TRANSFORM_STATUS_STAGES = [
  "chirpie is skimming sources",
  "pulling together the gist",
  "almost there…",
] as const;

export function useStagedStatus(
  active: boolean,
  stages: readonly string[] = TRANSFORM_STATUS_STAGES,
  intervalMs = 2800
): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setIndex((prev) => Math.min(prev + 1, stages.length - 1));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [active, stages.length, intervalMs]);

  return stages[Math.min(index, stages.length - 1)];
}
