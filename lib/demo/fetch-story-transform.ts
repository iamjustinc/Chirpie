/**
 * lib/demo/fetch-story-transform.ts
 *
 * Fetches a single story transform from /api/transform with:
 *   - 10-second timeout (returns sanitized fallback, not an error)
 *   - Client-side sanitizer applied to all responses (guards against malformed AI output)
 *   - Typed result that tells the caller whether the timeout fired
 *
 * This is the primary fetch primitive for the paced demo flow.
 * getLiveDemoDigest uses a parallel variant for the legacy full-digest path.
 */

import type { RawStory } from "@/lib/content/types";
import type { TonePreference } from "@/lib/ai/schemas/chirpie-transform";
import type { Story } from "@/lib/types";
import { normalizeToTransformInput } from "@/lib/content/normalize-story";
import { sanitizeTransformOutput } from "@/lib/ai/sanitize-transform";
import { transformOutputToStory } from "@/lib/adapters/transform-to-story";

const TIMEOUT_MS = 10_000;

export interface FetchStoryResult {
  story: Story;
  /** True when the request hit the 10s timeout — caller can show a soft notice. */
  timedOut: boolean;
  /** True when Claude actually processed this story (not a mock/fallback). */
  isAIGenerated: boolean;
}

/**
 * Fetches and transforms a single raw story via /api/transform.
 * Never rejects — always resolves with a usable Story, even on timeout or error.
 *
 * @param rawStory  Source story from the content layer
 * @param apiTone   API tone preference (derived from user prefs)
 * @param storyId   Stable ID for the resulting Story object
 */
export async function fetchStoryTransform(
  rawStory: RawStory,
  apiTone: TonePreference,
  storyId: string
): Promise<FetchStoryResult> {
  const input = normalizeToTransformInput(rawStory, apiTone);

  let rawOutput: unknown = {};
  let timedOut = false;
  let isAIGenerated = false;

  try {
    const fetchPromise = fetch("/api/transform", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    // Race the fetch against a 10-second timeout
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("chirpie_timeout")), TIMEOUT_MS)
    );

    const response = await Promise.race([fetchPromise, timeoutPromise]);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    rawOutput = await response.json();
    // Check if the server used real Claude (not a mock/fallback path)
    isAIGenerated = (rawOutput as Record<string, unknown>)._source === "ai";
  } catch (err) {
    if (err instanceof Error && err.message === "chirpie_timeout") {
      timedOut = true;
      console.warn("[Chirpie] fetchStoryTransform: 10s timeout — using sanitized fallback.");
    } else {
      console.error("[Chirpie] fetchStoryTransform error:", err);
    }
    // rawOutput stays {} — sanitizer will produce a usable fallback from rawStory
  }

  // Always sanitize — protects against both error paths and partial AI responses
  const sanitized = sanitizeTransformOutput(rawOutput, rawStory);
  const story = transformOutputToStory(sanitized, rawStory, apiTone, storyId);

  // ── Truth signal for dev observability ────────────────────────────────────
  const provider = rawStory.id.startsWith("guardian-") ? "guardian" : "curated";
  const transform = timedOut
    ? "timeout-fallback"
    : isAIGenerated
    ? "ai"
    : "sanitizer-fallback";
  console.info(
    `[Chirpie] fetchStoryTransform: provider=${provider}, transform=${transform}, story="${rawStory.headline.slice(0, 60)}"`
  );

  return { story, timedOut, isAIGenerated };
}
