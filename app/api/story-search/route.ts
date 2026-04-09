import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { RawStory, ContentCategory } from "@/lib/content/types";

const GUARDIAN_BASE_URL = "https://content.guardianapis.com/search";

// ─── OpenAI lazy client (query correction only) ───────────────────────────────

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

// ─── Stop words ───────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "can", "could", "you", "tell", "me", "about", "by", "please",
  "the", "a", "an", "something", "anything", "related", "to",
  "what", "whats", "what's", "show", "find", "search", "for",
  "its", "it", "and", "or", "of", "in", "on", "at", "is", "are",
  "was", "has", "more", "news", "update", "updates", "story",
  "article", "latest", "recent", "new", "some", "any",
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function inferCategory(query: string): ContentCategory {
  const q = query.toLowerCase();

  if (
    q.includes("celeb") || q.includes("celebrity") ||
    q.includes("music") || q.includes("movie") || q.includes("film") ||
    q.includes("tv") || q.includes("show") || q.includes("actor") ||
    q.includes("artist") || q.includes("singer") || q.includes("tour") ||
    q.includes("album") || q.includes("song") || q.includes("concert") ||
    q.includes("pop") || q.includes("sabrina") || q.includes("carpenter") ||
    q.includes("taylor") || q.includes("swift") || q.includes("chappell") ||
    q.includes("roan") || q.includes("beyonce") || q.includes("billie") ||
    q.includes("eilish") || q.includes("fka") || q.includes("twigs") ||
    q.includes("drake") || q.includes("doja") || q.includes("ariana") ||
    q.includes("grande") || q.includes("travis") || q.includes("scott") ||
    q.includes("ghost") || q.includes("ghosts")
  ) {
    return "pop_culture";
  }

  if (
    q.includes("market") || q.includes("stock") || q.includes("finance") ||
    q.includes("economy") || q.includes("business") || q.includes("earnings") ||
    q.includes("revenue") || q.includes("nasdaq") || q.includes("s&p") ||
    q.includes("crypto") || q.includes("bitcoin") || q.includes("invest")
  ) {
    return "finance";
  }

  if (
    q.includes("tech") || q.includes("technology") || q.includes("ai") ||
    q.includes("startup") || q.includes("software") || q.includes("nvidia") ||
    q.includes("apple") || q.includes("google") || q.includes("openai") ||
    q.includes("honkai") || q.includes("game") || q.includes("gaming") ||
    q.includes("playstation") || q.includes("xbox") || q.includes("nintendo") ||
    q.includes("steam") || q.includes("twitch")
  ) {
    return "tech";
  }

  if (
    q.includes("world") || q.includes("global") || q.includes("international") ||
    q.includes("war") || q.includes("election") || q.includes("diplomacy") ||
    q.includes("ukraine") || q.includes("russia") || q.includes("china") ||
    q.includes("europe") || q.includes("middle east")
  ) {
    return "world";
  }

  return "general";
}

/**
 * Strips punctuation and stop words. Returns meaningful content tokens.
 * Min token length: 2 chars (allows short names like "AI", "UK").
 */
function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t))
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
 * AND-join up to 4 tokens for a strict Guardian query.
 * Single-token queries are passed as-is (no AND needed).
 */
function buildAndQuery(tokens: string[], fallback: string): string {
  if (tokens.length === 0) return fallback;
  if (tokens.length === 1) return tokens[0];
  return tokens.slice(0, 4).join(" AND ");
}

/**
 * OR-join tokens for a broader Guardian query.
 * Guardian treats space-separated terms as OR by default.
 */
function buildOrQuery(tokens: string[], fallback: string): string {
  if (tokens.length === 0) return fallback;
  return tokens.slice(0, 4).join(" ");
}

/**
 * Relevance score. Headline matches: 4×. Summary matches: 2×.
 * Coverage bonus applies to all query lengths (including 1-token).
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

  // Exact normalized phrase in headline
  const normalized = normalizeQuery(query);
  if (normalized && headlineLc.includes(normalized)) {
    score += 8;
  }

  // Coverage bonus — applies for ALL query lengths (was previously ≥2 only,
  // which caused single-token entity searches to never reach MIN_SCORE)
  const matchedTokens = tokens.filter((t) => haystack.includes(t)).length;
  score += matchedTokens * 2;

  return score;
}

/**
 * Gate: true when enough tokens appear in the article.
 *
 * Strict mode (broad=false):
 *   1 token  → 1 match required
 *   2 tokens → 2 matches required (both must appear)
 *   3 tokens → 2 matches required
 *   4+ tokens → 3 matches required
 *
 * Broad mode (broad=true, OR-fallback phase only):
 *   1 token  → 1 match (unchanged — single token searches need this)
 *   2 tokens → 2 matches (kept strict — prevents "stick market" OR-phase
 *              from matching any article that mentions "market")
 *   3+ tokens → 2 matches (relaxed from strict)
 *
 * Keeping 2-token broad threshold = strict threshold is intentional:
 * it ensures the OR-fallback only adds value through Guardian's broader
 * initial ranking, not by lowering our client-side quality gate.
 */
function hasStrongMatch(
  query: string,
  headline: string,
  summary: string,
  broad = false
): boolean {
  const tokens = tokenizeQuery(query);
  const haystack = `${headline} ${summary}`.toLowerCase();

  if (tokens.length === 0) return false;

  const matched = tokens.filter((t) => haystack.includes(t)).length;

  if (broad) {
    if (tokens.length === 1) return matched >= 1;
    if (tokens.length === 2) return matched >= 2; // same as strict — prevents false positives
    return matched >= 2; // 3+ tokens: relaxed from 3 to 2
  }

  if (tokens.length === 1) return matched >= 1;
  if (tokens.length === 2) return matched >= 2;
  if (tokens.length === 3) return matched >= 2;
  return matched >= 3; // 4+ tokens
}

/**
 * Per-token-count minimum score thresholds.
 * Single-token entity queries score lower by nature (no coverage bonus layering),
 * so a lower threshold is required to surface valid results.
 */
function minScoreForQuery(query: string, broad = false): number {
  if (broad) return 4; // relaxed for OR-fallback and corrected-query passes
  const tokens = tokenizeQuery(query);
  return tokens.length <= 1 ? 4 : 6;
}

// ─── Guardian fetch helper ────────────────────────────────────────────────────

interface GuardianResult {
  stories: Array<RawStory & { _score: number }>;
  rawCount: number;
}

async function fetchFromGuardian(
  apiKey: string,
  guardianQuery: string,
  rawQuery: string,
  broad: boolean
): Promise<GuardianResult> {
  const url = new URL(GUARDIAN_BASE_URL);
  url.searchParams.set("api-key", apiKey);
  url.searchParams.set("q", guardianQuery);
  url.searchParams.set("page-size", "10");
  url.searchParams.set("show-fields", "headline,trailText,byline,thumbnail");
  url.searchParams.set("order-by", "relevance");

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  url.searchParams.set("from-date", thirtyDaysAgo.toISOString().slice(0, 10));

  const res = await fetch(url.toString(), {
    next: { revalidate: 300 },
  });

  if (!res.ok) throw new Error(`Guardian HTTP ${res.status}`);

  const data = await res.json();
  const results = Array.isArray(data?.response?.results) ? data.response.results : [];

  const minScore = minScoreForQuery(rawQuery, broad);
  const mapped: Array<RawStory & { _score: number }> = [];

  for (let index = 0; index < results.length; index++) {
    const item = results[index];

    const headline =
      item?.fields?.headline?.trim() || item?.webTitle?.trim() || "";
    const summary =
      stripHtml(item?.fields?.trailText ?? "") || headline;
    const articleUrl = item?.webUrl;

    if (!headline || !articleUrl) continue;
    if (!hasStrongMatch(rawQuery, headline, summary, broad)) continue;

    const score = computeRelevance(rawQuery, headline, summary);
    if (score < minScore) continue;

    mapped.push({
      id: `guardian-search-${item.id ?? index}`,
      category: inferCategory(rawQuery),
      headline,
      summary,
      source: { name: "The Guardian", url: articleUrl },
      chipLabel: headline.slice(0, 35),
      priority: 80,
      _score: score,
    });
  }

  mapped.sort((a, b) => b._score - a._score);

  return { stories: mapped, rawCount: results.length };
}

// ─── OpenAI query correction ──────────────────────────────────────────────────

/**
 * Uses gpt-4o-mini to fix likely typos in a search query.
 * Only called when both AND and OR Guardian queries return zero strong matches.
 * Returns null if the key is unavailable, the call fails, or the
 * correction is identical to the original.
 */
async function correctQueryWithAI(rawQuery: string): Promise<string | null> {
  const client = getOpenAIClient();
  if (!client) return null;

  // 3-second timeout so a slow call never stalls the search response
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await client.chat.completions.create(
      {
        model: process.env.OPENAI_ACTION_MODEL?.trim() || "gpt-4o-mini",
        max_tokens: 30,
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "You fix misspelled or garbled search queries for a news app. " +
              "Return ONLY the corrected query — no explanation, no punctuation changes. " +
              "Keep it 1–5 words. If it looks correct already, return it unchanged.",
          },
          { role: "user", content: rawQuery },
        ],
      },
      { signal: controller.signal }
    );

    const corrected = response.choices?.[0]?.message?.content?.trim() ?? "";

    if (!corrected || corrected.toLowerCase() === rawQuery.toLowerCase()) {
      return null;
    }

    return corrected;
  } catch (err) {
    console.warn("[Chirpie/story-search] AI correction failed:", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const apiKey = process.env.GUARDIAN_API_KEY?.trim();
  const rawQuery = req.nextUrl.searchParams.get("q")?.trim();

  if (!rawQuery) {
    return NextResponse.json({ error: "Missing query parameter q" }, { status: 400 });
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: "GUARDIAN_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const tokens = tokenizeQuery(rawQuery);
  const normalizedFallback = normalizeQuery(rawQuery) || rawQuery;

  // ── Phase 1: strict AND-query (original) ──────────────────────────────────
  //    Best precision: requires ALL significant tokens to appear in Guardian results.
  const andQuery = buildAndQuery(tokens, normalizedFallback);

  console.info(
    `[Chirpie/story-search] Phase1 AND "${andQuery}" (raw: "${rawQuery}")`
  );

  try {
    const phase1 = await fetchFromGuardian(apiKey, andQuery, rawQuery, false);

    console.info(
      `[Chirpie/story-search] Phase1 → ${phase1.rawCount} Guardian results, ` +
      `${phase1.stories.length} strong matches`
    );

    if (phase1.stories.length > 0) {
      const stories: RawStory[] = phase1.stories
        .slice(0, 5)
        .map(({ _score, ...s }) => s);
      return NextResponse.json({ query: andQuery, stories });
    }

    // ── Phase 2: AI query correction → AND strict on corrected ────────────
    //    Runs BEFORE OR-broad so that typo-corrected queries like
    //    "stick market" → "stock market" get a clean strict retry rather
    //    than letting OR-broad surface coincidental "market" matches.
    console.info(
      `[Chirpie/story-search] Phase2 — AND returned 0, attempting AI correction for "${rawQuery}"`
    );

    const corrected = await correctQueryWithAI(rawQuery);
    const activeQuery = corrected ?? rawQuery;
    const activeTokens = corrected ? tokenizeQuery(corrected) : tokens;

    if (corrected) {
      console.info(
        `[Chirpie/story-search] AI corrected "${rawQuery}" → "${corrected}"`
      );

      const correctedAndQuery = buildAndQuery(
        activeTokens,
        normalizeQuery(corrected) || corrected
      );

      const phase2 = await fetchFromGuardian(
        apiKey,
        correctedAndQuery,
        corrected,
        false
      );

      console.info(
        `[Chirpie/story-search] Phase2 AND "${correctedAndQuery}" → ${phase2.stories.length} matches`
      );

      if (phase2.stories.length > 0) {
        const stories: RawStory[] = phase2.stories
          .slice(0, 5)
          .map(({ _score, ...s }) => s);
        return NextResponse.json({
          query: correctedAndQuery,
          correctedQuery: corrected,
          stories,
          retried: true,
        });
      }
    }

    // ── Phase 3: broad OR-query (last resort) ─────────────────────────────
    //    Uses the corrected query when available (so OR-broad on "stock market"
    //    not "stick market"), keeping our client-side 2-token threshold strict
    //    to avoid coincidental single-token matches.
    //    Only attempted for multi-token queries (single-token OR == AND).
    if (activeTokens.length > 1) {
      const orQuery = buildOrQuery(activeTokens, activeQuery);

      console.info(`[Chirpie/story-search] Phase3 OR "${orQuery}" (broad)`);

      const phase3 = await fetchFromGuardian(apiKey, orQuery, activeQuery, true);

      console.info(
        `[Chirpie/story-search] Phase3 → ${phase3.rawCount} Guardian results, ` +
        `${phase3.stories.length} broad matches`
      );

      if (phase3.stories.length > 0) {
        const stories: RawStory[] = phase3.stories
          .slice(0, 5)
          .map(({ _score, ...s }) => s);
        return NextResponse.json({
          query: orQuery,
          ...(corrected ? { correctedQuery: corrected } : {}),
          stories,
          retried: true,
        });
      }
    }

    // All phases exhausted
    console.info(`[Chirpie/story-search] All phases exhausted for "${rawQuery}"`);
    return NextResponse.json({ query: andQuery, stories: [] });
  } catch (err) {
    console.error("[Chirpie/story-search] search failed:", err);
    return NextResponse.json({ error: "Guardian search failed" }, { status: 500 });
  }
}
