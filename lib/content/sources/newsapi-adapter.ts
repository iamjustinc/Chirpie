/**
 * lib/content/sources/newsapi-adapter.ts
 *
 * ContentSourceAdapter for NewsAPI.org — the single real news source for Chirpie.
 *
 * Requires:  NEWS_API_KEY environment variable (server-side only, never exposed to client)
 * Free tier: 100 requests/day, developer use. Register at https://newsapi.org
 *
 * When NEWS_API_KEY is absent or the request fails, this adapter returns []
 * and the caller falls back to the local curated story pool.
 *
 * Response is cached server-side for 30 minutes (next.revalidate) to stay well
 * within free-tier limits even under repeated page loads.
 */

import type { ContentCategory, RawStory } from "../types";

const NEWS_API_BASE = "https://newsapi.org/v2";

/**
 * Maps Chirpie's ContentCategory to NewsAPI's `category` query parameter.
 * "world" has no direct NewsAPI equivalent — we fall back to "general" but
 * bias toward non-US sources to get a global feel.
 */
const NEWSAPI_CATEGORY: Record<ContentCategory, string> = {
  general: "general",
  pop_culture: "entertainment",
  finance: "business",
  tech: "technology",
  world: "general",
};

/**
 * Strip trailing " - Publication Name" patterns that NewsAPI appends to many titles.
 * e.g. "Fed holds rates steady - Reuters" → "Fed holds rates steady"
 */
function stripSourceSuffix(title: string): string {
  return title.replace(/\s[–\-]\s[^–\-]{1,50}$/, "").trim();
}

/**
 * Generate a short chip label from a full headline (≤ 35 chars).
 * Strips source suffixes, then truncates cleanly at a word boundary.
 */
function toChipLabel(headline: string): string {
  const clean = stripSourceSuffix(headline);
  if (clean.length <= 35) return clean;
  const words = clean.split(" ");
  let label = "";
  for (const word of words) {
    const candidate = label ? `${label} ${word}` : word;
    if (candidate.length > 33) break;
    label = candidate;
  }
  return label || clean.slice(0, 33);
}

// ─── NewsAPI article shape (minimal — only fields we use) ─────────────────────

interface NewsAPIArticle {
  title: string;
  description: string | null;
  url: string;
  source: { name: string | null };
  publishedAt: string;
}

interface NewsAPIResponse {
  status: string;
  articles: NewsAPIArticle[];
}

/**
 * Fetch top headlines from NewsAPI for one content category.
 * Returns an empty array on any failure — never throws.
 */
async function fetchCategoryHeadlines(
  apiKey: string,
  category: ContentCategory,
  pageSize: number
): Promise<RawStory[]> {
  const newsapiCategory = NEWSAPI_CATEGORY[category];
  const url = `${NEWS_API_BASE}/top-headlines?category=${newsapiCategory}&language=en&pageSize=${pageSize}&apiKey=${apiKey}`;

  try {
    const res = await fetch(url, {
      // Server-side cache — Next.js will reuse this response for 30 minutes
      // keeping NewsAPI request count far below the free-tier limit.
      next: { revalidate: 1800 },
    });

    if (!res.ok) {
      console.warn(`[Chirpie/NewsAPI] HTTP ${res.status} for category "${category}"`);
      return [];
    }

    const data: NewsAPIResponse = await res.json();

    if (data.status !== "ok" || !Array.isArray(data.articles)) {
      console.warn(`[Chirpie/NewsAPI] Unexpected response for category "${category}":`, data.status);
      return [];
    }

    return data.articles
      .filter(
        (a) =>
          a.title &&
          a.description &&
          a.url &&
          !a.title.includes("[Removed]") // NewsAPI uses this for deleted articles
      )
      .slice(0, pageSize)
      .map((article, i): RawStory => {
        const cleanHeadline = stripSourceSuffix(article.title);
        return {
          id: `newsapi-${category}-${i}`,
          category,
          headline: cleanHeadline,
          summary: article.description ?? cleanHeadline,
          source: {
            name: article.source.name ?? "NewsAPI",
            url: article.url,
          },
          // First article in each category gets highest priority; taper off
          priority: 90 - i * 8,
          chipLabel: toChipLabel(article.title),
        };
      });
  } catch (err) {
    console.warn(`[Chirpie/NewsAPI] Fetch error for category "${category}":`, err);
    return [];
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch top headlines from NewsAPI across the given categories.
 * Returns [] immediately when NEWS_API_KEY is not configured.
 *
 * @param categories  Which content categories to query
 * @param perCategory How many articles to fetch per category (default 2)
 */
export async function fetchNewsAPIStories(
  categories: ContentCategory[],
  perCategory = 2
): Promise<RawStory[]> {
  const apiKey = process.env.NEWS_API_KEY?.trim();

  if (!apiKey) {
    // No key configured — caller will use local curated stories
    return [];
  }

  // Fetch all categories in parallel; individual failures return []
  const results = await Promise.all(
    categories.map((cat) => fetchCategoryHeadlines(apiKey, cat, perCategory))
  );

  return results.flat();
}
