/**
 * get-live-demo-digest.ts
 *
 * Client-side fetch orchestrator for the live AI demo.
 *
 * Calls POST /api/transform in parallel for all RAW_DEMO_FIXTURES, maps the
 * validated outputs to Story objects, and returns a fully-typed Digest ready
 * for ConversationThread.
 *
 * Throws on ANY failure — the demo page catches this and falls back to mockDigest.
 */

import type { TransformOutput } from "@/lib/ai/schemas/chirpie-transform";
import { RAW_DEMO_FIXTURES, toTransformInput } from "@/lib/demo/raw-story-fixtures";
import {
  transformOutputToStory,
  buildLiveDemoDigest,
} from "@/lib/adapters/transform-to-story";
import type { Digest } from "@/lib/types";

// ─── Single story fetch ───────────────────────────────────────────────────────

async function fetchTransformedStory(
  fixture: (typeof RAW_DEMO_FIXTURES)[number],
  index: number
) {
  const response = await fetch("/api/transform", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toTransformInput(fixture)),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "(unreadable)");
    throw new Error(
      `[Chirpie Demo] /api/transform failed for fixture "${fixture.label}" ` +
        `(${response.status}): ${errorBody}`
    );
  }

  const output: TransformOutput = await response.json();

  return transformOutputToStory(output, fixture, `live-story-${index}`);
}

// ─── Public orchestrator ──────────────────────────────────────────────────────

/**
 * Transforms all demo fixtures in parallel and returns a live Digest.
 * Throws if any single transform fails — caller should catch and fallback.
 */
export async function getLiveDemoDigest(): Promise<Digest> {
  const stories = await Promise.all(
    RAW_DEMO_FIXTURES.map((fixture, index) =>
      fetchTransformedStory(fixture, index)
    )
  );

  return buildLiveDemoDigest(stories);
}
