/**
 * lib/content/normalize-story.ts
 *
 * Bridges the content layer (RawStory) to the AI transform layer (TransformInput)
 * and to the UI type system (Category).
 *
 * This is the only file that should know about both worlds — keep cross-layer
 * imports confined here.
 */

import type { RawStory, ContentCategory } from "./types";
import type { TransformInput } from "@/lib/ai/schemas/chirpie-transform";
import type { Category } from "@/lib/types";

// ─── Category mapping ─────────────────────────────────────────────────────────

/** Maps content-layer categories (snake_case) to UI-layer categories (kebab-case). */
const CONTENT_TO_UI: Record<ContentCategory, Category> = {
  general: "general",
  pop_culture: "pop-culture",
  finance: "finance",
  tech: "technology",
  world: "world",
};

/** Maps UI-layer categories (kebab-case) to content-layer categories (snake_case). */
const UI_TO_CONTENT: Partial<Record<Category, ContentCategory>> = {
  general: "general",
  "pop-culture": "pop_culture",
  finance: "finance",
  technology: "tech",
  world: "world",
  // "sports" is not in the content layer yet — omitted intentionally
};

export function contentCategoryToUICategory(cat: ContentCategory): Category {
  return CONTENT_TO_UI[cat];
}

export function uiCategoryToContentCategory(cat: Category): ContentCategory | null {
  return UI_TO_CONTENT[cat] ?? null;
}

// ─── RawStory → TransformInput ────────────────────────────────────────────────

/**
 * Converts a RawStory into a TransformInput ready to send to /api/transform.
 *
 * @param story           The raw story from any content source
 * @param tonePreference  The user's preferred tone (defaults to "casual")
 */
export function normalizeToTransformInput(
  story: RawStory,
  tonePreference: TransformInput["tone_preference"] = "casual"
): TransformInput {
  return {
    headline: story.headline,
    summary: story.summary,
    source: story.source,
    tone_preference: tonePreference,
  };
}
