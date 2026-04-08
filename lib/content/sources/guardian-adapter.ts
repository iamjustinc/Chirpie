/**
 * lib/content/sources/guardian-adapter.ts
 *
 * ContentSourceAdapter for The Guardian Content API.
 *
 * Requires:  GUARDIAN_API_KEY environment variable (server-side only)
 * Free tier: 500 requests/day. Register at https://open-platform.theguardian.com/access
 *
 * When GUARDIAN_API_KEY is absent or any request fails, this adapter returns []
 * and the caller falls back to local curated stories.
 *
 * Responses are cached server-side for 30 minutes (next.revalidate: 1800) to stay
 * well within free-tier limits across repeated page loads.
 *
 * Launch categories supported (Part 3 scope):
 *   general     → Guardian section "world"
 *   pop_culture → Guardian section "culture"
 *   finance     → Guardian section "business"
 *   tech        → Guardian section "technology"
 *
 * "world" ContentCategory maps to Guardian "world" section too — same as "general"
 * but kept distinct so curated fallback for "world" still works.
 */

import type { ContentCategory, RawStory } from "../types";

const GUARDIAN_BASE = "https://content.guardianapis.com/search";

/**
 * Maps Chirpie ContentCategory → Guardian section id.
 * Categories omitted here are not queried from Guardian; they fall back to curated.
 */
const GUARDIAN_SECTION: Partial<Record<ContentCategory, string>> = {
  general:     "world",
  pop_culture: "culture",
  finance:     "business",
  tech:        "technology",
};

// ─── Guardian API response shapes (minimal — only fields we consume) ──────────

interface GuardianFields {
  trailText?: string;
  headline?:  string;
}

interface GuardianResult {
  id:                  string;
  webTitle:            string;
  webUrl:              string;
  sectionId:           string;
  sectionName:         string;
  webPublicationDate:  string;
  fields?:             GuardianFields;
}

interface GuardianResponse {
  response: {
    status:  string;
    results: GuardianResult[];
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Generate a short chip label from a Guardian webTitle (≤ 35 chars).
 * webTitle is already shorter than a full headline, so this rarely needs truncation.
 */
function toChipLabel(title: string): string {
  if (title.length <= 35) return title;
  const words = title.split(" ");
  let label = "";
  for (const word of words) {
    const candidate = label ? `${label} ${word}` : word;
    if (candidate.length > 33) break;
    label = candidate;
  }
  return label || title.slice(0, 33);
}

/**
 * Build the summary text from Guardian fields.
 * Prefers fields.trailText (the editorial standfirst), falls back to webTitle.
 */
function buildSummary(result: GuardianResult): string {
  return result.fields?.trailText
    ? result.fields.trailText.replace(/<[^>]+>/g, "").trim() // strip any HTML tags
    : result.fields?.headline ?? result.webTitle;
}

// ─── Per-category fetch ───────────────────────────────────────────────────────

/**
 * Fetch top stories from The Guardian for one content category.
 * Returns [] on any failure — never throws.
 */
async function fetchGuardianSection(
  apiKey: string,
  category: ContentCategory,
  pageSize: number
): Promise<RawStory[]> {
  const section = GUARDIAN_SECTION[category];
  if (!section) return []; // category not supported in this launch scope

  const params = new URLSearchParams({
    section,
    "show-fields": "trailText,headline",
    "order-by":    "newest",
    "page-size":   String(pageSize),
    "api-key":     apiKey,
  });

  const url = `${GUARDIAN_BASE}?${params}`;

  try {
    const res = await fetch(url, {
      // 30-minute server-side cache — stays well within Guardian's free tier
      next: { revalidate: 1800 },
    });

    if (!res.ok) {
      console.warn(`[Chirpie/Guardian] HTTP ${res.status} for category "${category}" (section: ${section})`);
      return [];
    }

    const data: GuardianResponse = await res.json();

    if (data.response.status !== "ok" || !Array.isArray(data.response.results)) {
      console.warn(`[Chirpie/Guardian] Unexpected status "${data.response.status}" for category "${category}"`);
      return [];
    }

    const results = data.response.results.filter(
      (r) => r.webTitle && r.webUrl
    );

    if (!results.length) {
      console.info(`[Chirpie/Guardian] No usable results for category "${category}" (section: ${section})`);
      return [];
    }

    return results.slice(0, pageSize).map((result, i): RawStory => {
      const headline = result.fields?.headline ?? result.webTitle;
      const summary  = buildSummary(result);

      return {
        id:       `guardian-${category}-${i}`,
        category,
        headline,
        summary,
        source: {
          name: "The Guardian",
          url:  result.webUrl,
        },
        // First article per category gets highest priority; taper off slightly
        priority:  90 - i * 8,
        chipLabel: toChipLabel(result.webTitle),
      };
    });
  } catch (err) {
    console.warn(`[Chirpie/Guardian] Fetch error for category "${category}":`, err);
    return [];
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch stories from The Guardian across the given categories.
 * Returns [] immediately when GUARDIAN_API_KEY is not configured.
 *
 * @param categories  Which content categories to query
 * @param perCategory How many articles to fetch per category (default 2)
 */
export async function fetchGuardianStories(
  categories: ContentCategory[],
  perCategory = 2
): Promise<RawStory[]> {
  const apiKey = process.env.GUARDIAN_API_KEY?.trim();

  if (!apiKey) {
    // No key configured — caller will use local curated stories
    console.info("[Chirpie/Guardian] GUARDIAN_API_KEY not set — skipping live fetch");
    return [];
  }

  // Fetch all supported categories in parallel; individual failures return []
  const results = await Promise.all(
    categories.map((cat) => fetchGuardianSection(apiKey, cat, perCategory))
  );

  const stories = results.flat();
  console.info(`[Chirpie/Guardian] Fetched ${stories.length} stories across ${categories.length} categories`);
  return stories;
}
