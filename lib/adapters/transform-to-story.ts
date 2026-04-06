/**
 * transform-to-story.ts
 *
 * Maps a validated TransformOutput (from /api/transform) + the originating
 * RawDemoFixture into a fully-typed Story object the existing digest UI accepts.
 *
 * Also exports buildLiveDemoDigest() which wraps an array of live Stories into
 * the Digest shape that ConversationThread expects.
 */

import type { TransformOutput, TonePreference } from "@/lib/ai/schemas/chirpie-transform";
import type { Story, StorySource, Digest, DigestItem, Tone } from "@/lib/types";
import type { RawDemoFixture } from "@/lib/demo/raw-story-fixtures";

// ─── Tone mapping ─────────────────────────────────────────────────────────────
// API uses underscore ("gen_z"), lib/types.ts Tone uses hyphen ("gen-z")

const TONE_MAP: Record<TonePreference, Tone> = {
  gen_z: "gen-z",
  professional: "professional",
  casual: "casual",
};

// ─── Source type heuristic ────────────────────────────────────────────────────

function inferSourceType(url: string): StorySource["sourceType"] {
  const host = url.toLowerCase();
  if (
    host.includes("wsj") ||
    host.includes("nytimes") ||
    host.includes("washingtonpost") ||
    host.includes("theguardian") ||
    host.includes("ft.com")
  ) {
    return "newspaper";
  }
  if (
    host.includes("reuters") ||
    host.includes("apnews") ||
    host.includes("bloomberg")
  ) {
    return "wire";
  }
  if (
    host.includes("pitchfork") ||
    host.includes("rollingstone") ||
    host.includes("wired") ||
    host.includes("theatlantic")
  ) {
    return "magazine";
  }
  if (host.includes("bbc") || host.includes("cnn") || host.includes("npr")) {
    return "broadcast";
  }
  // Default to blog for tech/niche outlets (The Verge, TechCrunch, etc.)
  return "blog";
}

// ─── Core adapter ─────────────────────────────────────────────────────────────

/**
 * Converts a validated AI output + its originating fixture into a Story.
 *
 * @param output   Validated TransformOutput from /api/transform
 * @param fixture  The RawDemoFixture used to produce this output (carries metadata)
 * @param id       Stable story id (e.g. "live-story-0")
 */
export function transformOutputToStory(
  output: TransformOutput,
  fixture: RawDemoFixture,
  id: string
): Story {
  const source: StorySource = {
    name: fixture.source.name,
    url: fixture.source.url,
    sourceType: inferSourceType(fixture.source.url),
    publishedAt: new Date().toISOString(),
  };

  return {
    id,
    headline: output.headline,
    category: fixture.category,
    chatOpening: output.chat_opening,
    whyItMatters: output.why_it_matters,
    keyPoints: output.key_points,
    followUpPrompts: output.follow_up_prompts,
    sources: [source],
    tone: TONE_MAP[fixture.tone_preference],
    publishedAt: new Date().toISOString(),
    importanceScore: 80,
    saved: false,
  };
}

// ─── Digest builder ───────────────────────────────────────────────────────────

/**
 * Wraps an array of live Stories into the Digest shape ConversationThread needs.
 */
export function buildLiveDemoDigest(stories: Story[]): Digest {
  const now = new Date().toISOString();

  const items: DigestItem[] = stories.map((story, index) => ({
    id: `live-item-${index}`,
    story,
    transformedText: story.chatOpening,
    position: index + 1,
  }));

  return {
    id: "live-demo-digest",
    userId: "demo-user",
    generatedAt: now,
    frequency: "daily",
    themeId: "classic-chat",
    greeting: "here's your live AI digest ✨",
    intro:
      "These stories were transformed in real time by Claude. Tap any bubble to dig deeper.",
    items,
  };
}
