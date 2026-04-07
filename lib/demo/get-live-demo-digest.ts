/**
 * get-live-demo-digest.ts
 *
 * Legacy parallel-fetch orchestrator — transforms multiple stories at once
 * and returns a full Digest. Kept for backward compatibility.
 *
 * The primary demo path now uses fetchStoryTransform (single-story, paced)
 * but this remains available for any full-digest use cases.
 */

import { getDemoStoriesForCategory } from "@/lib/content/get-demo-stories";
import { normalizeToTransformInput } from "@/lib/content/normalize-story";
import { sanitizeTransformOutput } from "@/lib/ai/sanitize-transform";
import { transformOutputToStory, buildLiveDemoDigest } from "@/lib/adapters/transform-to-story";
import type { Digest } from "@/lib/types";
import type { RawStory } from "@/lib/content/types";

// ─── Single story fetch (with sanitizer, no timeout — use fetchStoryTransform for timeout) ─

async function fetchTransformedStory(rawStory: RawStory, index: number) {
  const input = normalizeToTransformInput(rawStory, "gen_z");

  const response = await fetch("/api/transform", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "(unreadable)");
    throw new Error(
      `[Chirpie Demo] /api/transform failed for "${rawStory.headline}" ` +
        `(${response.status}): ${errorBody}`
    );
  }

  const rawOutput: unknown = await response.json();
  const sanitized = sanitizeTransformOutput(rawOutput, rawStory);
  return transformOutputToStory(sanitized, rawStory, "gen_z", `live-story-${index}`);
}

// ─── Public orchestrator ──────────────────────────────────────────────────────

/**
 * Transforms one story per major category in parallel and returns a full Digest.
 * Throws if any single transform fails — caller should catch and fallback.
 */
export async function getLiveDemoDigest(): Promise<Digest> {
  // Pull one lead story per category
  const categories = ["pop_culture", "finance", "tech"] as const;
  const rawStories = categories
    .map((cat) => getDemoStoriesForCategory(cat, 1)[0])
    .filter((s): s is RawStory => s != null);

  const stories = await Promise.all(
    rawStories.map((story, index) => fetchTransformedStory(story, index))
  );

  return buildLiveDemoDigest(stories);
}
