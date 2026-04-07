/**
 * transform-to-story.ts
 *
 * Maps a TransformOutput (from /api/transform) + a RawStory (from the content
 * layer) into a fully-typed Story the existing digest UI accepts.
 *
 * Also exports helper builders used by the demo page.
 */

import type { TransformOutput, TonePreference } from "@/lib/ai/schemas/chirpie-transform";
import type { Story, StorySource, Digest, DigestItem, Tone } from "@/lib/types";
import type { RawStory } from "@/lib/content/types";
import { contentCategoryToUICategory } from "@/lib/content/normalize-story";

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
  if (host.includes("reuters") || host.includes("apnews") || host.includes("bloomberg")) {
    return "wire";
  }
  if (
    host.includes("pitchfork") ||
    host.includes("rollingstone") ||
    host.includes("wired") ||
    host.includes("theatlantic") ||
    host.includes("billboard")
  ) {
    return "magazine";
  }
  if (host.includes("bbc") || host.includes("cnn") || host.includes("npr")) {
    return "broadcast";
  }
  return "blog";
}

// ─── Core adapter ─────────────────────────────────────────────────────────────

/**
 * Converts a (sanitized) TransformOutput + its originating RawStory into a Story.
 *
 * @param output    TransformOutput from /api/transform (should be pre-sanitized)
 * @param rawStory  The RawStory from the content layer (provides category, source)
 * @param apiTone   The tone_preference sent to the API
 * @param id        Stable story id (e.g. "live-story-finance")
 */
export function transformOutputToStory(
  output: TransformOutput,
  rawStory: RawStory,
  apiTone: TonePreference,
  id: string
): Story {
  const source: StorySource = {
    name: rawStory.source.name,
    url: rawStory.source.url,
    sourceType: inferSourceType(rawStory.source.url),
    publishedAt: new Date().toISOString(),
  };

  return {
    id,
    headline: output.headline,
    category: contentCategoryToUICategory(rawStory.category),
    chatOpening: output.chat_opening,
    whyItMatters: output.why_it_matters,
    keyPoints: output.key_points,
    followUpPrompts: output.follow_up_prompts,
    sources: [source],
    tone: TONE_MAP[apiTone],
    publishedAt: new Date().toISOString(),
    importanceScore: rawStory.priority ?? 75,
    saved: false,
  };
}

// ─── Single-story digest builder ──────────────────────────────────────────────

/**
 * Wraps a single Story into a minimal Digest for use in the paced demo flow.
 */
export function buildSingleStoryDigest(
  story: Story,
  id: string,
  greeting: string,
  intro: string
): Digest {
  const item: DigestItem = {
    id: `${id}-item-0`,
    story,
    transformedText: story.chatOpening,
    position: 0,
  };

  return {
    id,
    userId: "demo-user",
    generatedAt: new Date().toISOString(),
    frequency: "daily",
    themeId: "classic-chat",
    greeting,
    intro,
    items: [item],
  };
}

// ─── Multi-story digest builder (kept for backward compat) ────────────────────

/**
 * Wraps an array of live Stories into a Digest.
 * Still used by getLiveDemoDigest for the parallel-fetch path.
 */
export function buildLiveDemoDigest(
  stories: Story[],
  greeting = "here's your live AI digest ✨",
  intro = "These stories were transformed in real time by Claude. Tap any bubble to dig deeper."
): Digest {
  const items: DigestItem[] = stories.map((story, index) => ({
    id: `live-item-${index}`,
    story,
    transformedText: story.chatOpening,
    position: index,
  }));

  return {
    id: "live-demo-digest",
    userId: "demo-user",
    generatedAt: new Date().toISOString(),
    frequency: "daily",
    themeId: "classic-chat",
    greeting,
    intro,
    items,
  };
}
