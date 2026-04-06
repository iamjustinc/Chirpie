/**
 * raw-story-fixtures.ts
 *
 * Three raw demo fixtures used by the live AI demo path on /demo.
 * Each fixture extends TransformInput with UI metadata (category, label)
 * so the adapter layer can construct a fully-typed Story after the AI call.
 *
 * All three use tone_preference "gen_z" so the live demo shows off the most
 * expressive tone profile. Gravity-check will still override to Neutral/
 * Respectful if the content warrants it (it won't for these fixtures).
 */

import type { TransformInput } from "@/lib/ai/schemas/chirpie-transform";
import type { Category } from "@/lib/types";

// ─── Extended fixture type ────────────────────────────────────────────────────

export interface RawDemoFixture extends TransformInput {
  /** Used to populate Story.category in the adapter */
  category: Category;
  /** Short human-readable label shown in any debug or loading UI */
  label: string;
}

/** Strip fixture-only metadata and return a plain TransformInput */
export function toTransformInput(fixture: RawDemoFixture): TransformInput {
  const { category: _category, label: _label, ...input } = fixture;
  return input;
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

export const RAW_DEMO_FIXTURES: readonly RawDemoFixture[] = [
  {
    label: "Pop Culture",
    category: "pop-culture",
    headline: "Charli XCX Announces Surprise Collab Album Dropping Midnight Tonight",
    summary:
      "Pop artist Charli XCX has announced via social media that a surprise collaborative album with an unnamed A-list partner will be available for streaming starting at midnight. The project, reportedly recorded in secret over six weeks, consists of 10 tracks and marks her first full-length collab LP. Fans have been reacting wildly across TikTok and X since the announcement went live 20 minutes ago.",
    source: {
      name: "Pitchfork",
      url: "https://pitchfork.com",
    },
    tone_preference: "gen_z",
  },
  {
    label: "Finance",
    category: "finance",
    headline: "Fed Holds Rates Steady as Inflation Ticks Up for Second Straight Month",
    summary:
      "The Federal Reserve voted unanimously to hold the federal funds rate at its current level following its latest policy meeting, citing persistent inflation that rose 0.3% in March for the second consecutive month. Chair Jerome Powell signaled that rate cuts expected earlier in the year are now unlikely before Q4, a stance that sent stock futures lower in after-hours trading. Economists are divided on whether the Fed is threading the needle or falling behind the curve.",
    source: {
      name: "The Wall Street Journal",
      url: "https://wsj.com",
    },
    tone_preference: "gen_z",
  },
  {
    label: "Technology",
    category: "technology",
    headline: "OpenAI Releases GPT-5 with Real-Time Vision and Voice in a Single Model",
    summary:
      "OpenAI has officially launched GPT-5, its most capable model to date, which for the first time natively combines text, real-time voice conversation, and live video understanding in a single unified model. The rollout begins today for ChatGPT Plus subscribers. Early benchmarks suggest GPT-5 significantly outperforms its predecessor on reasoning, coding, and multimodal tasks. The announcement comes one week after Google's Gemini Ultra 2 launch, intensifying the AI model race.",
    source: {
      name: "The Verge",
      url: "https://theverge.com",
    },
    tone_preference: "gen_z",
  },
] as const;
