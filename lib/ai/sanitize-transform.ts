/**
 * lib/ai/sanitize-transform.ts
 *
 * Client-side safety net for AI transform output.
 *
 * Protects the UI from empty strings, missing fields, wrong array lengths, or
 * partially-formed AI responses. The server-side Zod validation in route.ts is
 * the primary gate — this sanitizer is a defensive second layer for the client
 * fetch path and for timeout fallbacks.
 *
 * Usage:
 *   const safe = sanitizeTransformOutput(rawApiResponse, sourceStory);
 *   // safe is always a fully-valid TransformOutput shape
 */

import type { TransformOutput } from "./schemas/chirpie-transform";
import type { RawStory } from "@/lib/content/types";

// ─── Default follow-up sets ───────────────────────────────────────────────────

const HIGH_GRAVITY_FOLLOW_UPS = [
  "What led to this?",
  "Who is affected?",
  "What has been the response?",
];

const DEFAULT_FOLLOW_UPS = [
  "Why does this matter?",
  "What's the background?",
  "What happens next?",
];

/**
 * Splits a summary string into up to 3 usable sentences for key_points.
 * Falls back to generic-but-accurate phrases only when the summary is too short.
 */
function deriveKeyPoints(summary?: string): [string, string, string] {
  if (!summary) {
    return [
      "Story details are loading.",
      "More context is available from the source.",
      "Check the original article for full coverage.",
    ];
  }

  // Split on sentence boundaries — keep non-empty, trimmed strings
  const sentences = summary
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  const [a, b, c] = sentences;
  const fallback = "See the source article for additional detail.";
  return [
    a ?? summary.slice(0, 120),
    b ?? fallback,
    c ?? fallback,
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Guarantees an array of exactly 3 non-empty strings.
 * Uses items from `arr` first (validated), then fills with `fallbacks`.
 */
function ensureThreeStrings(arr: unknown[], fallbacks: string[]): [string, string, string] {
  const valid = arr
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((s) => s.trim())
    .slice(0, 3);

  while (valid.length < 3) {
    valid.push(fallbacks[valid.length] ?? "More context coming soon.");
  }

  return valid as [string, string, string];
}

function safeString(val: unknown, fallback: string): string {
  return typeof val === "string" && val.trim().length > 0 ? val.trim() : fallback;
}

// ─── Public sanitizer ─────────────────────────────────────────────────────────

/**
 * Accepts any value (including null, undefined, malformed JSON) and returns a
 * fully-valid TransformOutput. Missing or invalid fields are replaced with safe
 * defaults derived from the raw source story when available.
 *
 * @param raw     The raw value returned from the API (or {} for timeout fallback)
 * @param source  Optional RawStory used to derive contextual fallback copy
 */
export function sanitizeTransformOutput(
  raw: unknown,
  source?: RawStory
): TransformOutput {
  const obj =
    typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};

  const isHighGravity = source?.isHighGravity ?? false;
  const followUpFallbacks = isHighGravity ? HIGH_GRAVITY_FOLLOW_UPS : DEFAULT_FOLLOW_UPS;

  // Headline — prefer AI output, fall back to raw source headline
  const headline = safeString(
    obj.headline,
    source?.headline ?? "Story unavailable"
  );

  // Chat opening — prefer AI, fall back to source summary (which is always informative)
  const chatOpening = safeString(
    obj.chat_opening,
    source?.summary ??
      "We couldn't load the full story right now. Check the source link for details."
  );

  // Why it matters — prefer AI, fall back to source summary if available
  const whyItMatters = safeString(
    obj.why_it_matters,
    source?.summary
      ? `This story is about: ${source.summary.slice(0, 160)}.`
      : isHighGravity
        ? "This story has significant real-world implications that warrant attention."
        : "This story has real-world implications worth understanding in context."
  );

  // Derive story-grounded key points from the source summary
  const derivedKeyPoints = deriveKeyPoints(source?.summary);

  return {
    headline,
    chat_opening: chatOpening,
    why_it_matters: whyItMatters,
    key_points: ensureThreeStrings(
      Array.isArray(obj.key_points) ? obj.key_points : [],
      derivedKeyPoints
    ),
    follow_up_prompts: ensureThreeStrings(
      Array.isArray(obj.follow_up_prompts) ? obj.follow_up_prompts : [],
      followUpFallbacks
    ),
  };
}
