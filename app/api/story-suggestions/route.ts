/**
 * GET /api/story-suggestions
 *
 * Returns a ranked list of story chips for the guided opening chat.
 *
 * Source priority:
 *   1. The Guardian (when GUARDIAN_API_KEY is set) — one story per category
 *   2. NewsAPI (when NEWS_API_KEY is set, as secondary) — fills uncovered categories
 *   3. Local curated stories — fills any remaining slots
 *
 * The API keys are never exposed to the client. All mapping to UI category
 * names happens here before the response is sent.
 *
 * Cached by Next.js for 30 minutes (inherited from Guardian/NewsAPI adapters).
 */

import { NextResponse } from "next/server";
import type { ContentCategory, RawStory } from "@/lib/content/types";
import { fetchGuardianStories } from "@/lib/content/sources/guardian-adapter";
import { fetchNewsAPIStories } from "@/lib/content/sources/newsapi-adapter";
import { CURATED_STORIES } from "@/lib/content/sources/local-curated";
import { contentCategoryToUICategory } from "@/lib/content/normalize-story";

// Launch categories for Guardian (Part 3 scope: General, Pop Culture, Finance, Tech)
const GUARDIAN_CATEGORIES: ContentCategory[] = ["general", "pop_culture", "finance", "tech"];

// All categories (including world) for fallback sources
const ALL_CATEGORIES: ContentCategory[] = ["pop_culture", "finance", "tech", "general", "world"];

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
  const suggestions: StorySuggestion[] = [];
  const usedCategories = new Set<ContentCategory>();

  // ── 1. Try The Guardian first ────────────────────────────────────────────────
  let guardianStories: RawStory[] = [];
  try {
    guardianStories = await fetchGuardianStories(GUARDIAN_CATEGORIES, 1);
  } catch (err) {
    console.warn("[Chirpie/story-suggestions] Guardian fetch failed:", err);
  }

  for (const story of guardianStories) {
    if (usedCategories.has(story.category)) continue;
    usedCategories.add(story.category);
    suggestions.push({
      id:       story.id,
      label:    story.chipLabel ?? story.headline.slice(0, 33),
      category: contentCategoryToUICategory(story.category),
      rawStory: story,
    });
  }

  // ── 2. Fill uncovered categories from NewsAPI (secondary) ───────────────────
  if (suggestions.length < MAX_SUGGESTIONS) {
    let newsAPIStories: RawStory[] = [];
    try {
      const missing = ALL_CATEGORIES.filter((c) => !usedCategories.has(c));
      if (missing.length > 0) {
        newsAPIStories = await fetchNewsAPIStories(missing, 1);
      }
    } catch (err) {
      console.warn("[Chirpie/story-suggestions] NewsAPI fetch failed:", err);
    }

    for (const story of newsAPIStories) {
      if (suggestions.length >= MAX_SUGGESTIONS) break;
      if (usedCategories.has(story.category)) continue;
      usedCategories.add(story.category);
      suggestions.push({
        id:       story.id,
        label:    story.chipLabel ?? story.headline.slice(0, 33),
        category: contentCategoryToUICategory(story.category),
        rawStory: story,
      });
    }
  }

  // ── 3. Fill remaining slots from local curated stories ──────────────────────
  const sortedCurated = [...CURATED_STORIES].sort(
    (a, b) => (b.priority ?? 50) - (a.priority ?? 50)
  );

  for (const story of sortedCurated) {
    if (suggestions.length >= MAX_SUGGESTIONS) break;
    if (usedCategories.has(story.category)) continue;
    usedCategories.add(story.category);
    suggestions.push({
      id:       story.id,
      label:    story.chipLabel ?? story.headline.slice(0, 33),
      category: contentCategoryToUICategory(story.category),
      rawStory: story,
    });
  }

  const liveCount = guardianStories.length;
  const curatedCount = suggestions.length - liveCount;
  console.info(
    `[Chirpie/story-suggestions] ${suggestions.length} suggestions returned — ${liveCount} live (Guardian), ${curatedCount} curated fallback`
  );

  return NextResponse.json(suggestions);
}
