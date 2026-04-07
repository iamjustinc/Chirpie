/**
 * lib/content/get-demo-stories.ts
 *
 * Query functions for the demo content layer.
 *
 * These are the public API for the content layer — pages and components should
 * import from here, not from sources/local-curated.ts directly. This keeps the
 * source adapter swappable without touching call sites.
 */

import type { RawStory, ContentCategory } from "./types";
import { CURATED_STORIES } from "./sources/local-curated";
import { uiCategoryToContentCategory } from "./normalize-story";
import type { Category } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sortByPriority(stories: readonly RawStory[]): RawStory[] {
  return [...stories].sort((a, b) => (b.priority ?? 50) - (a.priority ?? 50));
}

// ─── Public query functions ───────────────────────────────────────────────────

/**
 * Returns all stories for a given ContentCategory, sorted by priority.
 */
export function getDemoStoriesForCategory(
  category: ContentCategory,
  limit = 3
): RawStory[] {
  return sortByPriority(CURATED_STORIES.filter((s) => s.category === category)).slice(
    0,
    limit
  );
}

/**
 * Returns the single highest-priority story for a ContentCategory.
 * Returns null if no stories exist for that category.
 */
export function getLeadStoryForCategory(category: ContentCategory): RawStory | null {
  return getDemoStoriesForCategory(category, 1)[0] ?? null;
}

/**
 * Returns stories filtered and ordered by the user's interest categories.
 * Prefers stories from earlier interests (first interest = highest priority lane).
 * Falls back to all stories if interests don't map to any content category.
 */
export function getDemoStoriesForUserInterests(
  interests: Category[],
  limit = 5
): RawStory[] {
  // Map UI categories → content categories, preserving interest order
  const contentCategories = interests
    .map((i) => uiCategoryToContentCategory(i))
    .filter((c): c is ContentCategory => c !== null);

  if (contentCategories.length === 0) {
    return sortByPriority(CURATED_STORIES).slice(0, limit);
  }

  // Pull stories in interest order — first interest gets most coverage
  const seen = new Set<string>();
  const result: RawStory[] = [];

  for (const cat of contentCategories) {
    const stories = getDemoStoriesForCategory(cat, 2);
    for (const story of stories) {
      if (!seen.has(story.id) && result.length < limit) {
        seen.add(story.id);
        result.push(story);
      }
    }
    if (result.length >= limit) break;
  }

  return result;
}

/**
 * All available content categories (derived from actual story data).
 * Useful for building category switcher UIs — only shows categories with content.
 */
export function getAvailableContentCategories(): ContentCategory[] {
  const cats = new Set<ContentCategory>(CURATED_STORIES.map((s) => s.category));
  // Return in a sensible default display order
  const order: ContentCategory[] = ["general", "pop_culture", "finance", "tech", "world"];
  return order.filter((c) => cats.has(c));
}
