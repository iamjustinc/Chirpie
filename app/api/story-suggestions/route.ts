/**
 * GET /api/story-suggestions
 *
 * Returns a ranked list of story chips for the guided opening chat.
 *
 * Strategy:
 *   1. Try NewsAPI (when NEWS_API_KEY is set) — one story per category
 *   2. Fill any uncovered categories from local curated stories
 *   3. Always return 4–5 diverse suggestions (one per category max)
 *
 * Response shape:
 *   [{ id, label, category, rawStory }]
 *
 * The NEWS_API_KEY is never exposed to the client. All mapping to UI
 * category names happens here before the response is sent.
 *
 * Cached by Next.js for 30 minutes (inherited from fetchNewsAPIStories).
 */

import { NextResponse } from "next/server";
import type { ContentCategory, RawStory } from "@/lib/content/types";
import { fetchNewsAPIStories } from "@/lib/content/sources/newsapi-adapter";
import { CURATED_STORIES } from "@/lib/content/sources/local-curated";
import { contentCategoryToUICategory } from "@/lib/content/normalize-story";

// Categories we want to offer as specific story suggestions (ordered by interest weight)
const TARGET_CATEGORIES: ContentCategory[] = [
  "pop_culture",
  "finance",
  "tech",
  "general",
  "world",
];

// Maximum total suggestions to return
const MAX_SUGGESTIONS = 5;

export interface StorySuggestion {
  id: string;
  /** Short label for the chip (≤ 35 chars) */
  label: string;
  /** UI-layer category (kebab-case), for chip styling */
  category: string;
  /** The full raw story — used by the client to drive the transform pipeline */
  rawStory: RawStory;
}

export async function GET() {
  // ── 1. Attempt live stories from NewsAPI ────────────────────────────────────
  let liveStories: RawStory[] = [];
  try {
    liveStories = await fetchNewsAPIStories(TARGET_CATEGORIES, 1);
  } catch (err) {
    console.warn("[Chirpie/story-suggestions] NewsAPI fetch failed:", err);
  }

  const suggestions: StorySuggestion[] = [];
  const usedCategories = new Set<ContentCategory>();

  // Live stories: one per category, best headline first
  for (const story of liveStories) {
    if (usedCategories.has(story.category)) continue;
    usedCategories.add(story.category);
    suggestions.push({
      id: story.id,
      label: story.chipLabel ?? story.headline.slice(0, 33),
      category: contentCategoryToUICategory(story.category),
      rawStory: story,
    });
  }

  // ── 2. Fill remaining slots from local curated stories ──────────────────────
  // Sort curated by priority (highest first) before filling gaps
  const sortedCurated = [...CURATED_STORIES].sort(
    (a, b) => (b.priority ?? 50) - (a.priority ?? 50)
  );

  for (const story of sortedCurated) {
    if (suggestions.length >= MAX_SUGGESTIONS) break;
    if (usedCategories.has(story.category)) continue; // don't duplicate categories
    usedCategories.add(story.category);
    suggestions.push({
      id: story.id,
      label: story.chipLabel ?? story.headline.slice(0, 33),
      category: contentCategoryToUICategory(story.category),
      rawStory: story,
    });
  }

  console.info(
    `[Chirpie/story-suggestions] ${suggestions.length} suggestions (${liveStories.length} live, ${suggestions.length - liveStories.filter(s => !usedCategories.has(s.category)).length} curated)`
  );

  return NextResponse.json(suggestions);
}
