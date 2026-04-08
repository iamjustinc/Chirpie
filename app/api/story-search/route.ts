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
    q.includes("business")
  ) {
    return "finance";
  }

  if (
    q.includes("tech") ||
    q.includes("technology") ||
    q.includes("ai") ||
    q.includes("startup") ||
    q.includes("software")
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

  const normalized = normalizeQuery(query);

  if (normalized && headlineLc.includes(normalized)) {
    score += 8;
  }

  if (tokens.length >= 2) {
    const matchedTokens = tokens.filter((t) => haystack.includes(t)).length;
    score += matchedTokens * 2;
  }

  return score;
}

function hasStrongMatch(query: string, headline: string, summary: string): boolean {
  const tokens = tokenizeQuery(query);
  const haystack = `${headline} ${summary}`.toLowerCase();

  if (tokens.length === 0) return false;

  const matched = tokens.filter((t) => haystack.includes(t)).length;

  if (tokens.length === 1) return matched >= 1;
  if (tokens.length === 2) return matched >= 2;
  if (tokens.length >= 3) return matched >= 2;

  return false;
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

  const query = normalizeQuery(rawQuery) || rawQuery;

  const url = new URL(GUARDIAN_BASE_URL);
  url.searchParams.set("api-key", apiKey);
  url.searchParams.set("q", query);
  url.searchParams.set("page-size", "10");
  url.searchParams.set("show-fields", "headline,trailText,byline,thumbnail");
  url.searchParams.set("order-by", "relevance");

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  url.searchParams.set("from-date", thirtyDaysAgo.toISOString().slice(0, 10));

  try {
    console.info(`[Chirpie/story-search] Searching Guardian for "${query}"`);

    const res = await fetch(url.toString(), {
      next: { revalidate: 1800 },
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
      if (!hasStrongMatch(query, headline, summary)) continue;

      const score = computeRelevance(query, headline, summary);

      mapped.push({
        id: `guardian-search-${item.id ?? index}`,
        category: inferCategory(query),
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

    const stories: RawStory[] = mapped
      .filter((story) => story._score >= 4)
      .slice(0, 5)
      .map(({ _score, ...story }) => story);

    console.info(
      `[Chirpie/story-search] "${query}" returned ${stories.length} strong matches`
    );

    return NextResponse.json({ query, stories });
  } catch (err) {
    console.error("[Chirpie/story-search] search failed:", err);
    return NextResponse.json(
      { error: "Guardian search failed" },
      { status: 500 }
    );
  }
}