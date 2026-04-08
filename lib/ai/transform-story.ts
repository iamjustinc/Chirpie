/**
 * transform-story.ts
 *
 * The core AI transformation layer for Chirpie.
 *
 * Flow:
 *   1. Run gravity-check on headline + summary
 *   2. Build user message (raw input + is_high_gravity flag)
 *   3. Call OpenAI with CHIRPIE_TRANSFORM_SYSTEM_PROMPT
 *   4. Parse + validate output with Zod
 *   5. If validation fails → one repair attempt
 *   6. If repair fails → return grounded mock output
 *
 * Fallback:
 *   If OPENAI_API_KEY is absent, return a deterministic mock output so the
 *   app can be developed and demoed locally without AI credentials.
 */

import OpenAI from "openai";
import { ZodError } from "zod";
import {
  TransformOutputSchema,
  type TransformInput,
  type TransformOutput,
} from "./schemas/chirpie-transform";
import { gravityCheck } from "./gravity-check";
import { CHIRPIE_TRANSFORM_SYSTEM_PROMPT } from "./prompts/chirpie-transform-system";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ─── Model config ─────────────────────────────────────────────────────────────

const MODEL = "gpt-5-mini";
const MAX_OUTPUT_TOKENS = 900;

// ─── Mock fallback ────────────────────────────────────────────────────────────

const MOCK_OPENERS: Record<TransformInput["tone_preference"], string> = {
  gen_z: "here's what's actually going on with this one —",
  professional: "Here is a brief summary of the key details and their significance.",
  casual: "Here's what's happening and why it's worth knowing —",
};

function buildMockOutput(input: TransformInput): TransformOutput {
  const isHighGravity = gravityCheck(input.headline, input.summary).isHighGravity;

  const opener = isHighGravity
    ? "Here is a measured summary of what's known so far."
    : MOCK_OPENERS[input.tone_preference];

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
    chat_opening: `${opener} ${input.summary}`,
    why_it_matters: `This matters because ${input.summary.slice(0, 160)}`,
    key_points,
    follow_up_prompts: [
      "Why does this matter?",
      "What's the background?",
      "What happens next?",
    ],
  };
}

// ─── OpenAI call ──────────────────────────────────────────────────────────────

async function callOpenAI(userMessage: string): Promise<string> {
  const response = await client.responses.create({
    model: MODEL,
    max_output_tokens: MAX_OUTPUT_TOKENS,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: CHIRPIE_TRANSFORM_SYSTEM_PROMPT,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: userMessage,
          },
        ],
      },
    ],
  });

  const text = response.output_text?.trim();

  if (!text) {
    throw new Error("[Chirpie] OpenAI returned empty transform output");
  }

  return text;
}

// ─── Parse + validate ─────────────────────────────────────────────────────────

type ParseResult =
  | { success: true; data: TransformOutput }
  | { success: false; error: string };

function tryParse(raw: string): ParseResult {
  try {
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
        error: `Zod validation: ${err.issues.map((e) => e.message).join(", ")}`,
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
  const input = rawInput;
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  console.log("[Chirpie][transform-story] config", {
    provider: "openai",
    hasKey: Boolean(apiKey),
  });

  if (!apiKey) {
    console.warn(
      "[Chirpie] OPENAI_API_KEY not configured — returning deterministic mock output"
    );
    return { ...buildMockOutput(input), _source: "mock" };
  }

  const gravity = gravityCheck(input.headline, input.summary);

  if (gravity.isHighGravity) {
    console.info(
      `[Chirpie] High-gravity story detected. Matched signals: ${gravity.matchedSignals.join(", ")}`
    );
  }

  const userMessage = JSON.stringify({
    headline: input.headline,
    summary: input.summary,
    source: input.source,
    tone_preference: input.tone_preference,
    is_high_gravity: gravity.isHighGravity,
  });

  try {
    console.log("[Chirpie][transform-story] calling OpenAI");

    const rawOutput = await callOpenAI(userMessage);
    const firstResult = tryParse(rawOutput);

    if (firstResult.success) {
      console.log("[Chirpie][transform-story] success", {
        mode: "ai",
      });
      return { ...firstResult.data, _source: "ai" };
    }

    console.warn(
      `[Chirpie] First parse failed (${firstResult.error}). Requesting repair…`
    );

    const repairMessage = [
      "The JSON you returned was invalid or did not match the required schema.",
      "Return ONLY the corrected JSON object. Requirements:",
      "- headline must be a string",
      "- chat_opening must be a string",
      "- why_it_matters must be a string",
      "- key_points must be an array of exactly 3 strings",
      "- follow_up_prompts must be an array of exactly 3 strings",
      "- no markdown fences, no text outside the JSON",
      "",
      "Original (broken) response:",
      rawOutput,
    ].join("\n");

    const repairedOutput = await callOpenAI(repairMessage);
    const repairResult = tryParse(repairedOutput);

    if (repairResult.success) {
      console.log("[Chirpie][transform-story] repaired-success", {
        mode: "ai",
      });
      return { ...repairResult.data, _source: "ai" };
    }

    console.error(
      `[Chirpie] Transform failed after repair attempt (${repairResult.error}). Returning grounded mock.`
    );
    return { ...buildMockOutput(input), _source: "mock" };
  } catch (err) {
    console.error("[Chirpie] transform-story AI error:", err);
    return { ...buildMockOutput(input), _source: "mock" };
  }
}