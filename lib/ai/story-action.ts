/**
 * lib/ai/story-action.ts
 *
 * Lightweight AI for per-story actions: one-line recap, why it matters, hear more.
 *
 * Intentionally separate from the main transform pipeline — outputs are much
 * smaller (1–4 sentences) and the system prompt is action-specific.
 *
 * Falls back to derivations from existing story fields when:
 *   - ANTHROPIC_API_KEY is absent
 *   - The API call fails or times out
 */

import Anthropic from "@anthropic-ai/sdk";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StoryActionType = "one_line_recap" | "why_it_matters" | "hear_more";

export interface StoryActionInput {
  action: StoryActionType;
  headline: string;
  chatOpening: string;
  whyItMatters: string;
  keyPoints: string[];
  tonePreference: "gen_z" | "professional" | "casual";
  isHighGravity?: boolean;
  sourceUrl?: string;
}

export interface StoryActionOutput {
  text: string;
  sourceUrl?: string;
}

// ─── Model config ─────────────────────────────────────────────────────────────

const MODEL = "claude-3-5-haiku-20241022";
const MAX_TOKENS = 200; // Actions are short — cap tightly

// ─── Fallback derivation ──────────────────────────────────────────────────────
// Used when AI is unavailable. Derives from existing transformed story fields.

function buildFallback(input: StoryActionInput): StoryActionOutput {
  switch (input.action) {
    case "one_line_recap": {
      // First sentence of the chatOpening is usually a great summary
      const sentence = input.chatOpening.split(/(?<=[.!?])\s/)[0]?.trim();
      return { text: sentence ? sentence : input.headline };
    }
    case "why_it_matters":
      return { text: input.whyItMatters };
    case "hear_more":
      return {
        text: [input.chatOpening, input.keyPoints[0]].filter(Boolean).join(" "),
        sourceUrl: input.sourceUrl,
      };
  }
}

// ─── System prompt per action ─────────────────────────────────────────────────

function buildSystemPrompt(action: StoryActionType, isHighGravity: boolean): string {
  const toneRule = isHighGravity
    ? "Use neutral, factual, respectful tone. No emoji. No slang."
    : "Match the tone_preference provided: gen_z = lowercase + casual slang + 1-2 emoji max; professional = formal, no emoji; casual = warm, conversational.";

  const actionRule: Record<StoryActionType, string> = {
    one_line_recap:
      "Write exactly ONE sentence, 12–18 words, capturing the single most important fact. No preamble. No context. Just the core fact.",
    why_it_matters:
      "Write 1–2 sentences explaining why this story matters to everyday people. Be concrete and specific, not abstract. Focus on real-world impact.",
    hear_more:
      "Write 3–4 sentences of additional context. Explain one piece of background that helps the reader understand this story better. Stay conversational and clear.",
  };

  return [
    "You are Chirpie's story explanation engine.",
    toneRule,
    actionRule[action],
    "Return ONLY the plain text response. No markdown. No bullet points. No headers. No JSON. No quotes around your response.",
  ].join("\n\n");
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function runStoryAction(
  input: StoryActionInput
): Promise<StoryActionOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

  if (!apiKey) {
    return buildFallback(input);
  }

  const userMessage = [
    `Headline: ${input.headline}`,
    `Story opening: ${input.chatOpening}`,
    `Why it matters: ${input.whyItMatters}`,
    `Key points: ${input.keyPoints.slice(0, 2).join("; ")}`,
    `Tone: ${input.tonePreference}`,
  ].join("\n");

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(input.action, input.isHighGravity ?? false),
      messages: [{ role: "user", content: userMessage }],
    });

    const block = response.content[0];
    if (block.type !== "text" || !block.text.trim()) {
      return buildFallback(input);
    }

    const text = block.text.trim();
    return {
      text,
      sourceUrl: input.action === "hear_more" ? input.sourceUrl : undefined,
    };
  } catch (err) {
    console.error("[Chirpie] story-action AI error:", err);
    return buildFallback(input);
  }
}
