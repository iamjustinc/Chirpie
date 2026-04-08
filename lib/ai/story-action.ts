/**
 * lib/ai/story-action.ts
 *
 * Lightweight AI for per-story actions: one-line recap, why it matters, hear more.
 *
 * Intentionally separate from the main transform pipeline — outputs are much
 * smaller (1–4 sentences) and the system prompt is action-specific.
 *
 * Falls back to derivations from existing story fields when:
 *   - OPENAI is absent
 *   - The API call fails or times out
 */

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type StoryActionType =
  | "one_line_recap"
  | "why_it_matters"
  | "hear_more"
  | "follow_up";

export interface StoryActionInput {
  action: StoryActionType;
  headline: string;
  chatOpening: string;
  whyItMatters: string;
  keyPoints: string[];
  tonePreference: "gen_z" | "professional" | "casual";
  isHighGravity?: boolean;
  sourceUrl?: string;
  userQuestion?: string;
}

export interface StoryActionOutput {
  text: string;
  sourceUrl?: string;
}

// ─── Model config ─────────────────────────────────────────────────────────────

const MODEL = "gpt-5-mini";
const MAX_OUTPUT_TOKENS = 220;

// ─── Fallback derivation ──────────────────────────────────────────────────────

function buildFallback(input: StoryActionInput): StoryActionOutput {
  switch (input.action) {
    case "one_line_recap": {
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

    case "follow_up": {
      const q = (input.userQuestion ?? "").toLowerCase();

      if (q.includes("why") || q.includes("matter") || q.includes("important")) {
        return { text: input.whyItMatters };
      }

      if (
        q.includes("more") ||
        q.includes("background") ||
        q.includes("context") ||
        q.includes("backstory")
      ) {
        const pts = input.keyPoints.filter(Boolean);
        return {
          text: pts.length >= 2 ? `${pts[0]} ${pts[1]}` : input.chatOpening,
        };
      }

      if (q.includes("next") || q.includes("happen") || q.includes("now")) {
        return { text: input.keyPoints[2] ?? input.whyItMatters };
      }

      return { text: input.keyPoints[0] ?? input.whyItMatters };
    }
  }
}

// ─── System prompt per action ─────────────────────────────────────────────────

function buildSystemPrompt(
  action: StoryActionType,
  isHighGravity: boolean
): string {
  const toneRule = isHighGravity
    ? "Use neutral, factual, respectful tone. No emoji. No slang."
    : "Match the tone_preference provided: gen_z = lowercase + casual + 0-1 emoji max; professional = formal, no emoji; casual = warm and conversational.";

  const actionRule: Record<StoryActionType, string> = {
    one_line_recap:
      "Write exactly ONE sentence, 12–18 words, capturing the single most important fact. No preamble.",
    why_it_matters:
      "Write 1–2 sentences explaining why this story matters to everyday people. Be concrete and specific, not abstract.",
    hear_more:
      "Write 3–4 sentences of additional context. Explain one piece of background that helps the reader understand this story better.",
    follow_up:
      "Answer the user's specific follow-up question in 2–3 clear, grounded sentences using only the story context provided. Be direct and informative. No filler.",
  };

  return [
    "You are Chirpie's story explanation engine.",
    toneRule,
    actionRule[action],
    "Return ONLY plain text.",
  ].join("\n\n");
}

// ─── OpenAI helper ────────────────────────────────────────────────────────────

async function generateText(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await client.responses.create({
    model: MODEL,
    max_output_tokens: MAX_OUTPUT_TOKENS,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: systemPrompt,
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
    throw new Error("[Chirpie] OpenAI returned empty story action output");
  }

  return text;
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function runStoryAction(
  input: StoryActionInput
): Promise<StoryActionOutput> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  console.log("[Chirpie][story-action] config", {
    provider: "openai",
    hasKey: Boolean(apiKey),
    action: input.action,
  });

  if (!apiKey) {
    return buildFallback(input);
  }

  const userMessage = [
    `Headline: ${input.headline}`,
    `Story opening: ${input.chatOpening}`,
    `Why it matters: ${input.whyItMatters}`,
    `Key points: ${input.keyPoints.slice(0, 3).join("; ")}`,
    `Tone: ${input.tonePreference}`,
    ...(input.action === "follow_up" && input.userQuestion
      ? [`User question: ${input.userQuestion}`]
      : []),
  ].join("\n");

  try {
    console.log("[Chirpie][story-action] calling OpenAI", {
      action: input.action,
    });

    const text = await generateText(
      buildSystemPrompt(input.action, input.isHighGravity ?? false),
      userMessage
    );

    return {
      text,
      sourceUrl: input.action === "hear_more" ? input.sourceUrl : undefined,
    };
  } catch (err) {
    console.error("[Chirpie] story-action AI error:", err);
    return buildFallback(input);
  }
}