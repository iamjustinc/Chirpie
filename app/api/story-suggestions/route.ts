/**
 * GET /api/story-suggestions
 *
 * Returns a ranked list of story chips for the guided opening chat.
 *
 * Source priority:
 *   1. The Guardian (when GUARDIAN_API_KEY is set) — up to 3 per category, one picked randomly
 *   2. Local curated stories — fills any remaining slots
 *
 * NewsAPI is not used. Guardian is the only live source.
 *
 * The API key is never exposed to the client. All mapping to UI category
 * names happens here before the response is sent.
 *
 * Cached by Next.js for 30 minutes (inherited from the Guardian adapter).
 */

import { NextResponse } from "next/server";
import type { ContentCategory, RawStory } from "@/lib/content/types";
import { fetchGuardianStories } from "@/lib/content/sources/guardian-adapter";
import { CURATED_STORIES } from "@/lib/content/sources/local-curated";
import { contentCategoryToUICategory } from "@/lib/content/normalize-story";

// Launch categories supported by the Guardian adapter
const GUARDIAN_CATEGORIES: ContentCategory[] = ["general", "pop_culture", "finance", "tech"];

const MAX_SUGGESTIONS = 5;

/** Pick one item at random from an array. Returns undefined for empty arrays. */
function pickRandom<T>(arr: T[]): T | undefined {
  if (!arr.length) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

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

  // ── 1. The Guardian ──────────────────────────────────────────────────────────
  // Fetch 3 per category so we have a pool to randomize from — prevents the
  // same story appearing on every page load within the 30-min cache window.
  let guardianStories: RawStory[] = [];
  try {
    console.info("[Chirpie/story-suggestions] Fetching Guardian stories…");
    guardianStories = await fetchGuardianStories(GUARDIAN_CATEGORIES, 3);
    console.info(`[Chirpie/story-suggestions] Guardian returned ${guardianStories.length} stories`);
  } catch (err) {
    console.warn("[Chirpie/story-suggestions] Guardian fetch failed:", err);
  }

  // Group by category, pick one randomly from each pool
  const guardianByCategory: Partial<Record<ContentCategory, RawStory[]>> = {};
  for (const story of guardianStories) {
    guardianByCategory[story.category] = [
      ...(guardianByCategory[story.category] ?? []),
      story,
    ];
  }

  for (const cat of Object.keys(guardianByCategory) as ContentCategory[]) {
    if (usedCategories.has(cat)) continue;
    const pool = guardianByCategory[cat] ?? [];
    const story = pickRandom(pool);
    if (!story) continue;
    usedCategories.add(cat);
    suggestions.push({
      id:       story.id,
      label:    story.chipLabel ?? story.headline.slice(0, 33),
      category: contentCategoryToUICategory(story.category),
      rawStory: story,
    });
  }

  // ── 2. Curated fallback — fills any slots Guardian didn't cover ──────────────
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

  const liveCount = suggestions.filter((s) => s.rawStory.id.startsWith("guardian-")).length;
  const curatedCount = suggestions.length - liveCount;
  const coveredCategories = Array.from(usedCategories).join(", ");
  console.info(
    `[Chirpie/story-suggestions] ${suggestions.length} total — ${liveCount} Guardian, ${curatedCount} curated (categories: ${coveredCategories})`
  );

  return NextResponse.json(suggestions);
}
