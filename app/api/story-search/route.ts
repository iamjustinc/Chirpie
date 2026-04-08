import { NextRequest, NextResponse } from "next/server";
import type { RawStory, ContentCategory } from "@/lib/content/types";

const GUARDIAN_BASE_URL = "https://content.guardianapis.com/search";

const STOP_WORDS = new Set([
  "can",
  "could",
  "you",
  "tell",
  "me",
  "about",
  "by",
  "please",
  "the",
  "a",
  "an",
  "something",
  "anything",
  "related",
  "to",
  "what",
  "whats",
  "what's",
  "show",
  "find",
  "search",
  "for",
  "its",
  "it",
  "and",
  "or",
  "of",
  "in",
  "on",
  "at",
  "is",
  "are",
  "was",
  "has",
]);

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function inferCategory(query: string): ContentCategory {
  const q = query.toLowerCase();

  if (
    q.includes("celeb") ||
    q.includes("celebrity") ||
    q.includes("music") ||
    q.includes("movie") ||
    q.includes("film") ||
    q.includes("tv") ||
    q.includes("show") ||
    q.includes("actor") ||
    q.includes("artist") ||
    q.includes("singer") ||
    q.includes("tour") ||
    q.includes("album") ||
    q.includes("song") ||
    q.includes("vinyl") ||
    q.includes("concert") ||
    q.includes("pop") ||
    q.includes("sabrina") ||
    q.includes("carpenter") ||
    q.includes("taylor") ||
    q.includes("swift")
  ) {
    return "pop_culture";
  }

  if (
    q.includes("market") ||
    q.includes("stocks") ||
    q.includes("finance") ||
    q.includes("economy") ||
    q.includes("business") ||
    q.includes("earnings") ||
    q.includes("revenue") ||
    q.includes("nasdaq") ||
    q.includes("s&p")
  ) {
    return "finance";
  }

  if (
    q.includes("tech") ||
    q.includes("technology") ||
    q.includes("ai") ||
    q.includes("startup") ||
    q.includes("software") ||
    q.includes("nvidia") ||
    q.includes("apple") ||
    q.includes("google") ||
    q.includes("openai")
  ) {
    return "tech";
  }

  if (
    q.includes("world") ||
    q.includes("global") ||
    q.includes("international") ||
    q.includes("war") ||
    q.includes("election") ||
    q.includes("diplomacy")
  ) {
    return "world";
  }

  return "general";
}

/**
 * Strips punctuation and stop words; returns space-joined meaningful tokens.
 */
function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t))
    .join(" ")
    .trim();
}

function tokenizeQuery(query: string): string[] {
  return normalizeQuery(query)
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Build the Guardian `q` parameter.
 *
 * For multi-token queries we AND the terms together so Guardian returns only
 * articles that contain ALL significant words, dramatically cutting down on
 * weak one-word matches. For very long queries (5+ tokens) we use the top 4
 * to avoid being too restrictive.
 */
function buildGuardianQuery(tokens: string[], fallback: string): string {
  if (tokens.length === 0) return fallback;
  if (tokens.length === 1) return tokens[0];

  // Use up to 4 tokens joined with AND — Guardian boolean syntax
  const andTokens = tokens.slice(0, 4);
  return andTokens.join(" AND ");
}

/**
 * Relevance score: headline matches are weighted 4×, summary 2×.
 * A bonus is added when multiple tokens match (proportional coverage).
 */
function computeRelevance(query: string, headline: string, summary: string): number {
  const tokens = tokenizeQuery(query);
  const headlineLc = headline.toLowerCase();
  const summaryLc = summary.toLowerCase();
  const haystack = `${headlineLc} ${summaryLc}`;

  let score = 0;

  for (const token of tokens) {
    if (headlineLc.includes(token)) {
      score += 4;
    } else if (summaryLc.includes(token)) {
      score += 2;
    }
  }

  // Bonus: exact normalized phrase in headline
  const normalized = normalizeQuery(query);
  if (normalized && headlineLc.includes(normalized)) {
    score += 8;
  }

  // Bonus: proportional token coverage
  if (tokens.length >= 2) {
    const matchedTokens = tokens.filter((t) => haystack.includes(t)).length;
    score += matchedTokens * 2;
  }

  return score;
}

/**
 * Gate: returns true only when enough tokens are present in the article.
 *
 * Thresholds by query length (stricter for longer queries to avoid
 * coincidental partial matches on 4-word entity searches):
 *   1 token  → 1 match required
 *   2 tokens → 2 matches required (both must appear)
 *   3 tokens → 2 matches required
 *   4 tokens → 3 matches required
 *   5+ tokens → 3 matches required
 */
function hasStrongMatch(query: string, headline: string, summary: string): boolean {
  const tokens = tokenizeQuery(query);
  const haystack = `${headline} ${summary}`.toLowerCase();

  if (tokens.length === 0) return false;

  const matched = tokens.filter((t) => haystack.includes(t)).length;

  if (tokens.length === 1) return matched >= 1;
  if (tokens.length === 2) return matched >= 2;
  if (tokens.length === 3) return matched >= 2;
  // 4+ tokens: require 3 to match to avoid coincidental 2-token hits
  return matched >= 3;
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.GUARDIAN_API_KEY?.trim();
  const rawQuery = req.nextUrl.searchParams.get("q")?.trim();

  if (!rawQuery) {
    return NextResponse.json(
      { error: "Missing query parameter q" },
      { status: 400 }
    );
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: "GUARDIAN_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const tokens = tokenizeQuery(rawQuery);
  const normalizedFallback = normalizeQuery(rawQuery) || rawQuery;
  const guardianQuery = buildGuardianQuery(tokens, normalizedFallback);

  const url = new URL(GUARDIAN_BASE_URL);
  url.searchParams.set("api-key", apiKey);
  url.searchParams.set("q", guardianQuery);
  url.searchParams.set("page-size", "10");
  url.searchParams.set("show-fields", "headline,trailText,byline,thumbnail");
  url.searchParams.set("order-by", "relevance");

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  url.searchParams.set("from-date", thirtyDaysAgo.toISOString().slice(0, 10));

  try {
    console.info(
      `[Chirpie/story-search] Guardian query "${guardianQuery}" (from raw: "${rawQuery}")`
    );

    const res = await fetch(url.toString(), {
      next: { revalidate: 300 }, // 5-minute cache for search results (fresher than topic feeds)
    });

    if (!res.ok) {
      throw new Error(`Guardian HTTP ${res.status}`);
    }

    const data = await res.json();
    const results = Array.isArray(data?.response?.results)
      ? data.response.results
      : [];

    const mapped: Array<RawStory & { _score: number }> = [];

    for (let index = 0; index < results.length; index++) {
      const item = results[index];

      const headline =
        item?.fields?.headline?.trim() ||
        item?.webTitle?.trim() ||
        "";

      const summary =
        stripHtml(item?.fields?.trailText ?? "") ||
        headline;

      const articleUrl = item?.webUrl;

      if (!headline || !articleUrl) continue;

      // Client-side strong-match gate (catches AND-query edge cases)
      if (!hasStrongMatch(rawQuery, headline, summary)) continue;

      const score = computeRelevance(rawQuery, headline, summary);

      mapped.push({
        id: `guardian-search-${item.id ?? index}`,
        category: inferCategory(rawQuery),
        headline,
        summary,
        source: {
          name: "The Guardian",
          url: articleUrl,
        },
        chipLabel: headline.slice(0, 35),
        priority: 80,
        _score: score,
      });
    }

    mapped.sort((a, b) => b._score - a._score);

    // Minimum score of 6: requires at least one headline match (4) + coverage bonus (2),
    // or three summary matches (6), filtering out coincidental 1-token summary hits.
    const MIN_SCORE = 6;
    const stories: RawStory[] = mapped
      .filter((story) => story._score >= MIN_SCORE)
      .slice(0, 5)
      .map(({ _score, ...story }) => story);

    console.info(
      `[Chirpie/story-search] "${guardianQuery}" → ${results.length} results from Guardian, ${stories.length} strong matches after filtering`
    );

    return NextResponse.json({ query: guardianQuery, stories });
  } catch (err) {
    console.error("[Chirpie/story-search] search failed:", err);
    return NextResponse.json(
      { error: "Guardian search failed" },
      { status: 500 }
    );
  }
}
