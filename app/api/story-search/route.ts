import { NextRequest, NextResponse } from "next/server";
import type { RawStory, ContentCategory } from "@/lib/content/types";

const GUARDIAN_BASE_URL = "https://content.guardianapis.com/search";

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
    q.includes("pop")
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

function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
}

function computeRelevance(query: string, headline: string, summary: string): number {
  const tokens = tokenizeQuery(query);
  const haystack = `${headline} ${summary}`.toLowerCase();

  let score = 0;

  for (const token of tokens) {
    if (headline.toLowerCase().includes(token)) score += 3;
    else if (haystack.includes(token)) score += 1;
  }

  return score;
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.GUARDIAN_API_KEY?.trim();
  const query = req.nextUrl.searchParams.get("q")?.trim();

  if (!query) {
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
      .filter((story) => story._score > 0)
      .slice(0, 5)
      .map(({ _score, ...story }) => story);

    console.info(
      `[Chirpie/story-search] "${query}" returned ${stories.length} relevant stories`
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