/**
 * lib/content/types.ts
 *
 * Shared types for the content ingestion / story-source layer.
 * This layer is intentionally separate from UI types so it can later support
 * external feed adapters without touching any component code.
 */

/**
 * Category vocabulary for the content layer.
 * Uses underscores (snake_case) intentionally — different from the UI's
 * Category type (which uses hyphens) to keep layers cleanly separated.
 */
export type ContentCategory =
  | "general"
  | "pop_culture"
  | "finance"
  | "tech"
  | "world";

/**
 * Normalized raw story shape — the common currency of the content layer.
 * Every source adapter (local curated, future RSS, future API) must produce this shape.
 */
export interface RawStory {
  id: string;
  category: ContentCategory;
  headline: string;
  summary: string;
  source: {
    name: string;
    url: string;
  };
  /** Higher priority stories surface first (0–100). Defaults to 50 if omitted. */
  priority?: number;
  /** Pre-flagged high-gravity stories skip the gravity-check heuristic. */
  isHighGravity?: boolean;
  /**
   * Short label used on suggestion chips (≤ 35 chars).
   * Computed automatically from the headline if omitted.
   */
  chipLabel?: string;
}

/**
 * Source adapter interface — implement this to add a new content source.
 * Keeps the ingestion boundary clean and swappable.
 */
export interface ContentSourceAdapter {
  name: string;
  fetchStories(options?: { category?: ContentCategory; limit?: number }): Promise<RawStory[]>;
}
