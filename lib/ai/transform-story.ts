/**
 * transform-story.ts
 *
 * The core AI transformation layer for Chirpie.
 *
 * Flow:
 *   1. Run gravity-check on headline + summary
 *   2. Build user message (raw input + is_high_gravity flag)
 *   3. Call Claude with CHIRPIE_TRANSFORM_SYSTEM_PROMPT
 *   4. Parse + validate output with Zod
 *   5. If validation fails → one repair attempt
 *   6. If repair fails → throw typed error
 *
 * Fallback:
 *   If OPENAI_API_KEY is absent, return a deterministic mock output so the
 *   app can be developed and demoed locally without AI credentials.
 */

import Anthropic from "@anthropic-ai/sdk";
import { ZodError } from "zod";
import {
  TransformOutputSchema,
  type TransformInput,
  type TransformOutput,
} from "./schemas/chirpie-transform";
import { gravityCheck } from "./gravity-check";
import { CHIRPIE_TRANSFORM_SYSTEM_PROMPT } from "./prompts/chirpie-transform-system";

// ─── Model config ─────────────────────────────────────────────────────────────

const MODEL = "claude-3-5-sonnet-20241022";
const MAX_TOKENS = 1024;

// ─── Mock fallback ────────────────────────────────────────────────────────────
// Used when OPENAI_API_KEY is not set. Returns deterministic, tone-flavored
// output so every existing route and page continues to work in dev.

const MOCK_OPENERS: Record<TransformInput["tone_preference"], string> = {
  gen_z:
    "here's what's actually going on with this one —",
  professional:
    "Here is a brief summary of the key details and their significance.",
  casual:
    "Here's what's happening and why it's worth knowing —",
};

function buildMockOutput(input: TransformInput): TransformOutput {
  const isHighGravity = gravityCheck(input.headline, input.summary).isHighGravity;

  const opener = isHighGravity
    ? "Here is a measured summary of what's known so far."
    : MOCK_OPENERS[input.tone_preference];

  // Derive key points from the summary — split on sentence boundaries
  const sentences = input.summary
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  const fallbackPoint = "See the original source for more detail.";
  const key_points: [string, string, string] = [
    sentences[0] ?? input.summary.slice(0, 120),
    sentences[1] ?? fallbackPoint,
    sentences[2] ?? fallbackPoint,
  ];

  return {
    headline: input.headline,
    chat_opening: `${opener} — ${input.summary}`,
    why_it_matters: `This story covers: ${input.summary.slice(0, 160)}`,
    key_points,
    follow_up_prompts: [
      "Why does this matter?",
      "What's the background?",
      "What happens next?",
    ],
  };
}

// ─── Claude call ──────────────────────────────────────────────────────────────

async function callClaude(
  client: Anthropic,
  userMessage: string
): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: CHIRPIE_TRANSFORM_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const block = response.content[0];
  if (block.type !== "text") {
    throw new Error(
      `[Chirpie] Unexpected Claude response type: ${block.type}`
    );
  }

  return block.text.trim();
}

// ─── Parse + validate ─────────────────────────────────────────────────────────

type ParseResult =
  | { success: true; data: TransformOutput }
  | { success: false; error: string };

function tryParse(raw: string): ParseResult {
  try {
    // Strip markdown code fences in case Claude wraps the JSON despite instructions
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed: unknown = JSON.parse(cleaned);
    const validated = TransformOutputSchema.parse(parsed);
    return { success: true, data: validated };
  } catch (err) {
    if (err instanceof ZodError) {
      return {
        success: false,
        error: `Zod validation: ${err.errors.map((e) => e.message).join(", ")}`,
      };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── Public transform function ────────────────────────────────────────────────

export async function transformStory(
  rawInput: TransformInput
): Promise<TransformOutput & { _source: "ai" | "mock" }> {
  // Do NOT re-parse here — route.ts already ran TransformInputSchema.parse()
  // before calling this function. A second unguarded parse would turn any
  // edge-case ZodError into a 500 instead of the 400 it deserves.
  const input = rawInput;

  // Trim guards against whitespace-padded or placeholder env var values
  // (e.g. OPENAI_API_KEY=" " or OPENAI_API_KEY=your-key-here would
  // otherwise pass the !apiKey check and blow up on the real API call).
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    console.warn(
      "[Chirpie] OPENAI_API_KEY not configured — returning deterministic mock output"
    );
    return { ...buildMockOutput(input), _source: "mock" };
  }

  // Run gravity check before calling Claude
  const gravity = gravityCheck(input.headline, input.summary);

  if (gravity.isHighGravity) {
    console.info(
      `[Chirpie] High-gravity story detected. Matched signals: ${gravity.matchedSignals.join(", ")}`
    );
  }

  // Build user message — inject is_high_gravity so the system prompt can act on it
  const userMessage = JSON.stringify({
    headline: input.headline,
    summary: input.summary,
    source: input.source,
    tone_preference: input.tone_preference,
    is_high_gravity: gravity.isHighGravity,
  });

  const client = new Anthropic({ apiKey });

  // ── Attempt 1 ──────────────────────────────────────────────────────────────
  const rawOutput = await callClaude(client, userMessage);
  const firstResult = tryParse(rawOutput);

  if (firstResult.success) {
    return { ...firstResult.data, _source: "ai" };
  }

  // ── Repair attempt ─────────────────────────────────────────────────────────
  console.warn(
    `[Chirpie] First parse failed (${firstResult.error}). Requesting repair…`
  );

  const repairMessage = [
    "The JSON you returned was invalid or did not match the required schema.",
    "Return ONLY the corrected JSON object. Requirements:",
    "- key_points must be an array of exactly 3 strings",
    "- follow_up_prompts must be an array of exactly 3 strings",
    "- no markdown fences, no text outside the JSON",
    "",
    "Original (broken) response:",
    rawOutput,
  ].join("\n");

  const repairedOutput = await callClaude(client, repairMessage);
  const repairResult = tryParse(repairedOutput);

  if (repairResult.success) {
    return { ...repairResult.data, _source: "ai" };
  }

  // Both attempts failed — return a story-grounded mock rather than throwing a 500
  console.error(
    `[Chirpie] Transform failed after repair attempt (${repairResult.error}). Returning grounded mock.`
  );
  return { ...buildMockOutput(input), _source: "mock" };
}
