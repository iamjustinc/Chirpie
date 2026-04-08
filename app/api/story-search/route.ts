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
  url.searchParams.set("page-size", "5");
  url.searchParams.set("show-fields", "headline,trailText,byline,thumbnail");
  url.searchParams.set("order-by", "newest");

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

    const stories: RawStory[] = [];

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

      const story: RawStory = {
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
      };

      stories.push(story);
    }

    console.info(
      `[Chirpie/story-search] "${query}" returned ${stories.length} mapped stories`
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