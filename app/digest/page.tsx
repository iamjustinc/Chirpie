"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { ConversationThread } from "@/components/digest/ConversationThread";
import type { StoryChip } from "@/components/digest/ConversationThread";
import { loadUserPrefs, getToneGreeting, toneToApiTone } from "@/lib/user-prefs";
import { isStoryFollowUp, preNormalizeQuery } from "@/lib/query/normalize";
import { fetchStoryTransform } from "@/lib/demo/fetch-story-transform";
import { getLeadStoryForCategory } from "@/lib/content/get-demo-stories";
import { uiCategoryToContentCategory } from "@/lib/content/normalize-story";
import { getCategoryLabel } from "@/lib/utils";
import { CURATED_STORIES } from "@/lib/content/sources/local-curated";
import type { ContentCategory, RawStory } from "@/lib/content/types";
import type { Category, ThreadItem } from "@/lib/types";
import type { StorySuggestion } from "@/app/api/story-suggestions/route";

const CATEGORY_ICONS: Partial<Record<Category, string>> = {
  general: "📰",
  "pop-culture": "🎬",
  finance: "📊",
  sports: "⚽",
  technology: "💻",
  world: "🌍",
};

function buildCuratedChips(): { chips: StoryChip[]; map: Map<string, RawStory> } {
  const seen = new Set<ContentCategory>();
  const chips: StoryChip[] = [];
  const map = new Map<string, RawStory>();

  for (const s of CURATED_STORIES) {
    map.set(s.id, s);
    if (seen.has(s.category)) continue;
    seen.add(s.category);
    chips.push({ id: s.id, label: s.chipLabel ?? s.headline.slice(0, 33) });
    if (chips.length >= 5) break;
  }

  return { chips, map };
}

const { chips: INITIAL_CHIPS, map: INITIAL_MAP } = buildCuratedChips();

// ─── Monotonic ID counter ─────────────────────────────────────────────────────
// All ThreadItems must have unique, stable keys. Date.now() risks collisions
// when two items are appended within the same millisecond (common during async
// batching). A module-level counter guarantees uniqueness for the page lifetime.
let _itemSeq = 0;
function nid(prefix: string): string {
  return `${prefix}-${++_itemSeq}`;
}

// ─── Story deduplication ──────────────────────────────────────────────────────

/**
 * Collapses punctuation / case differences so that "Fed Raises Rates Again"
 * and "Fed raises rates again!" compare equal as seen headlines.
 */
function normalizeHeadlineForDedup(headline: string): string {
  return headline
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

interface SeenFingerprints {
  /** Lowercased source URLs of every story already shown in this session. */
  urls: Set<string>;
  /**
   * Normalized headlines of shown stories. Secondary signal — catches cases
   * where different URLs carry near-identical text (syndication, mirrors, etc).
   */
  headlines: Set<string>;
}

/**
 * Builds a dedup fingerprint set from the current thread. Only story items
 * are considered — user messages and assistant replies are ignored.
 *
 * URL is the primary key because it flows through the entire stack unchanged:
 *   RawStory.source.url → Story.sources[0].url (see transform-to-story.ts).
 * Headline is a secondary key for extra safety.
 */
function buildSeenFingerprints(items: ThreadItem[]): SeenFingerprints {
  const urls = new Set<string>();
  const headlines = new Set<string>();

  for (const item of items) {
    if (item.type !== "story") continue;
    const s = item.story;
    for (const src of s.sources) {
      if (src.url) urls.add(src.url.toLowerCase());
    }
    if (s.headline) headlines.add(normalizeHeadlineForDedup(s.headline));
  }

  return { urls, headlines };
}

/**
 * Returns true when a RawStory candidate has already been shown in this session.
 * Checks URL (primary) then normalized headline (secondary).
 */
function isRawStorySeen(rawStory: RawStory, seen: SeenFingerprints): boolean {
  const url = rawStory.source?.url?.toLowerCase();
  if (url && seen.urls.has(url)) return true;
  if (rawStory.headline) {
    if (seen.headlines.has(normalizeHeadlineForDedup(rawStory.headline))) return true;
  }
  return false;
}

// ─── Intent helpers ───────────────────────────────────────────────────────────

function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * Matches explicit category-redirect phrases — things the user types when they
 * clearly want to switch to a specific content category, not search for a
 * specific article. Kept intentionally narrow: "stock market" → finance,
 * "pop culture" → pop-culture, etc. Bare entity names (artist names, game
 * titles) should fall through to search so Guardian can find specific articles.
 */
function categoryMatchesQuery(query: string): Category | null {
  const q = normalizeText(query);

  // Explicit pop-culture redirect words
  if (
    q === "pop" ||
    q === "pop culture" ||
    q === "pop-culture" ||
    q === "entertainment" ||
    q === "celebrity" ||
    q === "celebs" ||
    q === "music news" ||
    q.startsWith("more pop") ||
    q.startsWith("more entertainment") ||
    q.startsWith("switch to pop") ||
    q.startsWith("that wasn't pop") ||
    q.startsWith("more celeb")
  ) {
    return "pop-culture";
  }

  // Explicit general-news redirect
  if (q === "general" || q === "news" || q === "general news" || q === "top news") {
    return "general";
  }

  // Finance redirect — category keywords only, not artist/entity names that
  // happen to contain these words
  if (
    q === "finance" ||
    q === "stock" ||
    q === "stocks" ||
    q === "market" ||
    q === "markets" ||
    q === "economy" ||
    q === "money" ||
    q.includes("stock market") ||
    q.includes("finance news") ||
    q.includes("more finance") ||
    q.includes("more on finance") ||
    q.includes("what about finance") ||
    q.includes("switch to finance")
  ) {
    return "finance";
  }

  // Sports redirect
  if (
    q === "sports" ||
    q === "sport" ||
    q.startsWith("more sports") ||
    q.startsWith("switch to sports")
  ) {
    return "sports";
  }

  // Tech redirect
  if (
    q === "tech" ||
    q === "technology" ||
    q.startsWith("more tech") ||
    q.startsWith("switch to tech")
  ) {
    return "technology";
  }

  // World redirect
  if (
    q === "world" ||
    q === "world news" ||
    q.startsWith("more world") ||
    q.startsWith("switch to world")
  ) {
    return "world";
  }

  return null;
}

/**
 * When Guardian returns zero results even after all retry phases, infer the
 * closest content category from the query so we can pivot to live feed stories
 * instead of returning a dead end. More liberal than categoryMatchesQuery —
 * this is a last-resort fallback, not a routing gate.
 */
function inferCategoryFromQuery(query: string): Category | null {
  const q = normalizeText(query);

  if (
    q.includes("pop") || q.includes("celeb") || q.includes("music") ||
    q.includes("actor") || q.includes("singer") || q.includes("artist") ||
    q.includes("tour") || q.includes("album") || q.includes("film") ||
    q.includes("movie") || q.includes("concert") || q.includes("ghost") ||
    q.includes("chappell") || q.includes("roan") || q.includes("sabrina") ||
    q.includes("carpenter") || q.includes("taylor") || q.includes("swift") ||
    q.includes("fka") || q.includes("twigs") || q.includes("beyonce") ||
    q.includes("billie") || q.includes("eilish") || q.includes("drake") ||
    q.includes("doja") || q.includes("ariana") || q.includes("travis")
  ) {
    return "pop-culture";
  }

  if (
    q.includes("stock") || q.includes("market") || q.includes("finance") ||
    q.includes("economy") || q.includes("earnings") || q.includes("nasdaq") ||
    q.includes("crypto") || q.includes("bitcoin") || q.includes("invest")
  ) {
    return "finance";
  }

  if (
    q.includes("tech") || q.includes("ai ") || q === "ai" ||
    q.includes("software") || q.includes("startup") ||
    q.includes("nvidia") || q.includes("apple") || q.includes("google") ||
    q.includes("honkai") || q.includes("gaming") || q.includes("game") ||
    q.includes("playstation") || q.includes("xbox") || q.includes("nintendo")
  ) {
    return "technology";
  }

  if (
    q.includes("sport") || q.includes("nba") || q.includes("nfl") ||
    q.includes("soccer") || q.includes("football") || q.includes("tennis") ||
    q.includes("player") || q.includes("team") || q.includes("match")
  ) {
    return "sports";
  }

  if (
    q.includes("world") || q.includes("global") || q.includes("war") ||
    q.includes("election") || q.includes("international") ||
    q.includes("ukraine") || q.includes("russia") || q.includes("china")
  ) {
    return "world";
  }

  return null;
}

function isNextStoryRequest(text: string): boolean {
  const q = normalizeText(text);

  // Exact navigation phrases with no category signal.
  // Category-qualified "another X update" phrases are intentionally excluded
  // here — they are handled in handleTypedComposerIntent step 2 with
  // category-constrained routing via handleNextStoryInCategory.
  return [
    "next",
    "next news",
    "new news",
    "another one",
    "another story",
    "next story",
    "more news",
    "more",
    "next please",
  ].includes(q);
}

/**
 * Extracts an explicit category from navigation phrases like
 * "another pop update", "another finance update", "more tech news".
 * Used in the "another X update" routing step to pick a category-constrained
 * next story rather than an unconstrained chip.
 * Returns null when no recognizable category keyword is present.
 */
function parseCategoryFromPhrase(text: string): Category | null {
  const q = normalizeText(text);

  if (q.includes("pop") || q.includes("entertainment") || q.includes("celeb")) {
    return "pop-culture";
  }
  if (
    q.includes("finance") || q.includes("financial") ||
    q.includes("market") || q.includes("stock") || q.includes("economy")
  ) {
    return "finance";
  }
  if (q.includes("tech") || q.includes("technology")) {
    return "technology";
  }
  if (q.includes("sport")) {
    return "sports";
  }
  if (q.includes("world") || q.includes("global")) {
    return "world";
  }
  if (q.includes("general") || q.includes("top news")) {
    return "general";
  }
  return null;
}

function extractTopicQuery(text: string, lastSearchTopic?: string | null): string {
  const raw = text.trim();

  const direct = raw
    .replace(/^tell me about\s+/i, "")
    .replace(/^can you tell me about\s+/i, "")
    .replace(/^could you tell me about\s+/i, "")
    .replace(/^what'?s happening with\s+/i, "")
    .replace(/^what is happening with\s+/i, "")
    .replace(/^news about\s+/i, "")
    .replace(/^news on\s+/i, "")
    .replace(/^more on\s+/i, "")
    .replace(/^more about\s+/i, "")
    .replace(/^show me\s+/i, "")
    .replace(/^search for\s+/i, "")
    .replace(/^find me\s+/i, "")
    .replace(/^what about\s+/i, "")
    .replace(/^how about\s+/i, "")
    .replace(/^anything on\s+/i, "")
    .replace(/^any news on\s+/i, "")
    .trim();

  if (direct !== raw && direct.length > 0) {
    return direct;
  }

  const relatedMatch =
    raw.match(/related to\s+(.+)$/i) ||
    raw.match(/anything about\s+(.+)$/i) ||
    raw.match(/something about\s+(.+)$/i);

  if (relatedMatch?.[1]) {
    const fragment = relatedMatch[1].trim();

    if (lastSearchTopic && /^(her|him|them|it)\b/i.test(fragment)) {
      return `${lastSearchTopic} ${fragment}`.trim();
    }

    return fragment;
  }

  // Bare query (no prefix stripped) — use as-is
  return raw;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DigestPage() {
  const [prefs] = useState(() => loadUserPrefs());
  const greeting = getToneGreeting(prefs.tone, prefs.name);
  const apiTone = toneToApiTone(prefs.tone);

  const interests = (prefs.interests ?? ["general", "pop-culture", "finance"]) as Category[];
  const topicOptions = interests.map((cat) => ({
    id: cat,
    label: getCategoryLabel(cat),
    icon: CATEGORY_ICONS[cat] ?? "📰",
  }));

  const [storyChips, setStoryChips] = useState<StoryChip[]>(INITIAL_CHIPS);
  const [storyMap, setStoryMap] = useState<Map<string, RawStory>>(INITIAL_MAP);
  const [liveByCategory, setLiveByCategory] = useState<Map<ContentCategory, RawStory>>(new Map());
  const [threadItems, setThreadItems] = useState<ThreadItem[]>([]);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [selectedChipId, setSelectedChipId] = useState<string | null>(null);
  const [lastSearchTopic, setLastSearchTopic] = useState<string | null>(null);

  const liveByCategoryRef = useRef(liveByCategory);
  liveByCategoryRef.current = liveByCategory;

  const threadItemsRef = useRef(threadItems);
  threadItemsRef.current = threadItems;

  useEffect(() => {
    fetch("/api/story-suggestions")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: StorySuggestion[] | null) => {
        if (!data?.length) return;

        setStoryChips(data.map(({ id, label }) => ({ id, label })));
        setStoryMap(new Map(data.map(({ id, rawStory }) => [id, rawStory])));

        const catMap = new Map<ContentCategory, RawStory>();
        for (const { rawStory } of data) {
          if (!catMap.has(rawStory.category)) {
            catMap.set(rawStory.category, rawStory);
          }
        }
        setLiveByCategory(catMap);
      })
      .catch(() => {
        // keep curated fallback
      });
  }, []);

  // Reactive seen-story fingerprint set derived from threadItems (state, not ref).
  // Used in nextSuggestionChip so the chip updates as new stories appear.
  // Handlers that run async use buildSeenFingerprints(threadItemsRef.current) directly.
  const seenStoryFingerprints = useMemo(
    () => buildSeenFingerprints(threadItems),
    [threadItems]
  );

  // Always return the first chip whose story has NOT yet been shown in this session.
  // Falls back to undefined (hides the chip) when all available stories are spent.
  const nextSuggestionChip = useMemo((): StoryChip | undefined => {
    if (!storyChips.length) return undefined;
    return storyChips.find((chip) => {
      const rawStory = storyMap.get(chip.id);
      if (!rawStory) return false;
      return !isRawStorySeen(rawStory, seenStoryFingerprints);
    });
  }, [storyChips, storyMap, seenStoryFingerprints]);

  // ── appendAssistantMessage: push a plain text bubble into the thread ──────────
  const appendAssistantMessage = useCallback((text: string) => {
    setThreadItems((prev) => [
      ...prev,
      {
        type: "assistant-message",
        id: nid("msg"),
        text,
      },
    ]);
  }, []);

  // ── handleFollowUpMessage: called by ConversationThread for follow-up pairs ───
  // Routes both the user bubble and the assistant reply into threadItems so they
  // appear in true chronological order alongside any stories fetched after them.
  const handleFollowUpMessage = useCallback(
    (role: "user" | "assistant", text: string) => {
      setThreadItems((prev) => [
        ...prev,
        {
          type: role === "user" ? "user-message" : "assistant-message",
          id: nid(`follow-${role}`),
          text,
        } as ThreadItem,
      ]);
    },
    []
  );

  const getLastStoryCategory = useCallback((): Category | null => {
    const lastStory = [...threadItemsRef.current].reverse().find((i) => i.type === "story");
    if (!lastStory || lastStory.type !== "story") return null;
    return lastStory.story.category;
  }, []);

  const handleTopicSelect = useCallback(
    async (category: Category, customUserText?: string) => {
      const label = getCategoryLabel(category).toLowerCase();
      const currentItems = threadItemsRef.current;
      const hasStories = currentItems.some((i) => i.type === "story");
      const userText =
        customUserText ?? (hasStories ? `let's switch to ${label}` : `let's talk about ${label}`);

      const userMsg: ThreadItem = {
        type: "user-message",
        id: nid("user"),
        text: userText,
      };

      setSelectedChipId(null);
      setThreadItems((prev) => [...prev, userMsg]);
      setIsThreadLoading(true);

      const contentCat = uiCategoryToContentCategory(category);
      const rawStory = contentCat
        ? liveByCategoryRef.current.get(contentCat) ?? getLeadStoryForCategory(contentCat)
        : null;

      if (!rawStory) {
        setIsThreadLoading(false);
        appendAssistantMessage(`nothing new on ${label} right now — try another topic.`);
        return;
      }

      // Dedup check: if this exact story (by URL or headline) was already shown,
      // surface a helpful message rather than repeating the same content.
      const seen = buildSeenFingerprints(currentItems);
      if (isRawStorySeen(rawStory, seen)) {
        setIsThreadLoading(false);
        appendAssistantMessage(
          `i already covered the latest ${label} story — ` +
          `ask about something specific or pick a different topic above.`
        );
        return;
      }

      try {
        const { story } = await fetchStoryTransform(
          rawStory,
          apiTone,
          nid(`topic-${category}`)
        );

        setThreadItems((prev) => [
          ...prev,
          {
            type: "story",
            id: nid("story"),
            story,
          },
        ]);
      } finally {
        setIsThreadLoading(false);
      }
    },
    [apiTone, appendAssistantMessage]
  );

  const handleStoryChipSelect = useCallback(
    async (id: string, customUserText?: string) => {
      const rawStory = storyMap.get(id);
      const chip = storyChips.find((c) => c.id === id);

      if (!rawStory || !chip) {
        appendAssistantMessage("i couldn't load that story right now.");
        return;
      }

      const userMsg: ThreadItem = {
        type: "user-message",
        id: nid("user"),
        text: customUserText ?? chip.label,
      };

      setSelectedChipId(id);
      setThreadItems((prev) => [...prev, userMsg]);
      setIsThreadLoading(true);

      try {
        const { story } = await fetchStoryTransform(
          rawStory,
          apiTone,
          nid(`story-${id}`)
        );

        setThreadItems((prev) => [
          ...prev,
          {
            type: "story",
            id: nid("story"),
            story,
          },
        ]);
      } finally {
        setIsThreadLoading(false);
      }
    },
    [storyMap, storyChips, apiTone, appendAssistantMessage]
  );

  const handleNextStory = useCallback(
    async (customUserText = "new news") => {
      const chip = nextSuggestionChip;

      if (!chip) {
        // nextSuggestionChip is undefined when all available chips have been shown.
        appendAssistantMessage(
          "i've covered all the stories i have queued right now — " +
          "try asking about a specific topic or person, or pick a category above."
        );
        return;
      }

      await handleStoryChipSelect(chip.id, customUserText);
    },
    [nextSuggestionChip, handleStoryChipSelect, appendAssistantMessage]
  );

  /**
   * Category-locked "next story" handler.
   *
   * Used when the user explicitly names a category in their request
   * (e.g. "another pop update", "another finance update"). Guarantees the
   * returned story stays inside the requested category by:
   *
   *   1. Finding the first unshown chip whose story belongs to that category.
   *   2. Falling back to handleTopicSelect (live feed for that category)
   *      if no unshown chip exists — always in-category, never drifts.
   *
   * This replaces the previous behaviour where these requests called
   * handleNextStory (unconstrained chip list), causing category drift.
   */
  const handleNextStoryInCategory = useCallback(
    async (category: Category, customUserText: string) => {
      const contentCat = uiCategoryToContentCategory(category);
      // Snapshot seen fingerprints from the ref so we always use the latest
      // thread state, even if React hasn't flushed the most recent setState yet.
      const seen = buildSeenFingerprints(threadItemsRef.current);

      // Find the first chip in this category whose story hasn't been shown yet.
      // Uses URL + headline fingerprints — NOT selectedChipId — so every story
      // already in the thread is correctly excluded, not just the most recent one.
      const categoryChip = storyChips.find((chip) => {
        if (!contentCat) return false;
        const rawStory = storyMap.get(chip.id);
        if (!rawStory || rawStory.category !== contentCat) return false;
        return !isRawStorySeen(rawStory, seen);
      });

      if (categoryChip) {
        console.log(
          `[Chirpie] next_story_in_category "${category}" → unseen chip "${categoryChip.id}"`
        );
        await handleStoryChipSelect(categoryChip.id, customUserText);
        return;
      }

      // No fresh chip for this category — try the live-feed story.
      // handleTopicSelect now also performs a seen-check and will surface a
      // helpful message rather than repeat if the live story is already shown.
      const liveFeedStory = contentCat
        ? liveByCategoryRef.current.get(contentCat) ?? getLeadStoryForCategory(contentCat)
        : null;

      if (liveFeedStory && !isRawStorySeen(liveFeedStory, seen)) {
        console.log(
          `[Chirpie] next_story_in_category "${category}" — no fresh chip, loading unseen live-feed story`
        );
        await handleTopicSelect(category, customUserText);
        return;
      }

      // All known stories in this category are already shown.
      const label = getCategoryLabel(category).toLowerCase();
      console.log(
        `[Chirpie] next_story_in_category "${category}" — all stories already shown`
      );
      appendAssistantMessage(
        `i've already covered everything i have on ${label} right now — ` +
        `try asking about a specific person or story, or switch to another topic.`
      );
    },
    [storyChips, storyMap, handleStoryChipSelect, handleTopicSelect, appendAssistantMessage]
  );

  const handleGuardianTopicSearch = useCallback(
    async (userText: string) => {
      const query = extractTopicQuery(userText, lastSearchTopic);

      if (!query) {
        appendAssistantMessage("try asking for a person, topic, or subject you want news about.");
        return;
      }

      const userMsg: ThreadItem = {
        type: "user-message",
        id: nid("user"),
        text: userText,
      };

      setThreadItems((prev) => [...prev, userMsg]);
      setIsThreadLoading(true);

      try {
        const res = await fetch(`/api/story-search?q=${encodeURIComponent(query)}`);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        const allStories = (data?.stories ?? []) as RawStory[];
        const correctedQuery: string | undefined = data?.correctedQuery;

        if (correctedQuery) {
          console.log(`[Chirpie][search] query corrected: "${query}" → "${correctedQuery}"`);
        }

        // Pick the first Guardian result that hasn't already been shown in this
        // session. Uses URL + headline fingerprints from the current thread.
        const seen = buildSeenFingerprints(threadItemsRef.current);
        const rawStory = allStories.find((s) => !isRawStorySeen(s, seen));

        if (allStories.length > 0 && !rawStory) {
          console.log(
            `[Chirpie][search] all ${allStories.length} Guardian results already shown for "${query}"`
          );
        }

        if (!rawStory) {
          // ── Actionable fallback: pivot to the nearest category ────────────
          // Rather than a dead-end "couldn't find" message, infer what category
          // the user likely wants and load a real story from the live feed.
          const pivotCategory = inferCategoryFromQuery(query);

          if (pivotCategory) {
            console.log(
              `[Chirpie][search] zero results for "${query}" — pivoting to category "${pivotCategory}"`
            );
            // Replace the user-message bubble with a category switch
            // (handleTopicSelect will push its own user-message, so remove ours first)
            setThreadItems((prev) => prev.filter((i) => i.id !== userMsg.id));
            setIsThreadLoading(false);
            await handleTopicSelect(pivotCategory, userText);
            return;
          }

          // No inferable category — give a helpful, directed response
          appendAssistantMessage(
            `searched for "${query}" but nothing solid came up — ` +
            `try switching topics above, or ask about a specific person or story.`
          );
          return;
        }

        setLastSearchTopic(correctedQuery ?? query);

        const { story } = await fetchStoryTransform(rawStory, apiTone, nid("search"));

        setThreadItems((prev) => [
          ...prev,
          {
            type: "story",
            id: nid("story"),
            story,
          },
        ]);
      } catch (err) {
        console.error("[Chirpie] topic search failed:", err);
        appendAssistantMessage(
          `something went wrong searching for "${query}" — try again or switch topics.`
        );
      } finally {
        setIsThreadLoading(false);
      }
    },
    [apiTone, appendAssistantMessage, lastSearchTopic, handleTopicSelect]
  );

  const handleTypedComposerIntent = useCallback(
    async (text: string): Promise<boolean> => {
      // Apply routing-level typo correction FIRST (e.g. "stick market" → "stock
      // market", "updatee" → "update") so all downstream checks operate on the
      // corrected form. The original text is preserved for the user-facing message.
      const correctedText = preNormalizeQuery(text);
      const normalized = normalizeText(correctedText);

      console.log(
        "[composer] raw:", JSON.stringify(text),
        correctedText !== text ? `→ pre-normalized: ${JSON.stringify(correctedText)}` : ""
      );

      // 1. Exact navigation shortcuts ("next", "more", "another one", etc.)
      //    Category-qualified phrases like "another pop update" are intentionally
      //    NOT in this list — they are handled in step 2 with category locking.
      if (isNextStoryRequest(normalized)) {
        console.log("[composer] route → next_story");
        await handleNextStory(correctedText);
        return true;
      }

      // 2. "another X update / story" — category-aware next story.
      //    Parse the explicit category from the phrase (e.g. "pop" in
      //    "another pop update"). If found, use handleNextStoryInCategory which
      //    guarantees the result stays inside that category (never drifts to
      //    general/world/etc). Falls back to lastCategory context if no category
      //    keyword is present in the phrase.
      const lastCategory = getLastStoryCategory();
      const isAnotherRequest =
        normalized.includes("another") &&
        (normalized.includes("update") || normalized.includes("story"));

      if (isAnotherRequest) {
        const phraseCategory = parseCategoryFromPhrase(normalized);
        const targetCategory = phraseCategory ?? lastCategory;

        if (targetCategory) {
          console.log("[composer] route → next_story_in_category", targetCategory);
          await handleNextStoryInCategory(targetCategory, correctedText);
        } else {
          // No category signal at all — fall back to unconstrained next story
          console.log("[composer] route → next_story (no category context)");
          await handleNextStory(correctedText);
        }
        return true;
      }

      // 3. Explicit category redirect — narrow phrases that clearly mean
      //    "switch me to this category" (e.g. "stock market", "pop culture",
      //    "more finance"). Bare entity names are intentionally NOT caught here.
      const matchedCategory = categoryMatchesQuery(normalized);
      if (matchedCategory) {
        const lastCat = getLastStoryCategory();
        if (lastCat === matchedCategory) {
          // Already on this category — find the next story inside it rather
          // than picking a random chip (which may be in a different category).
          console.log("[composer] route → next_story_in_category (same-cat dedup)", matchedCategory);
          await handleNextStoryInCategory(matchedCategory, correctedText);
        } else {
          console.log("[composer] route → topic_switch", matchedCategory);
          await handleTopicSelect(matchedCategory, correctedText);
        }
        return true;
      }

      // 4. Clear story follow-up — strictly about the CURRENT article.
      //    Allowlist in lib/query/normalize.ts. Anything that doesn't match
      //    falls through to Guardian search.
      if (isStoryFollowUp(correctedText)) {
        console.log("[composer] route → story_follow_up");
        return false;
      }

      // 5. DEFAULT: search Guardian for a new story.
      //    Primary path for bare entity names, artist/game/topic queries,
      //    remaining typo-heavy inputs, and anything not caught above.
      console.log("[composer] route → topic_search (default)");
      await handleGuardianTopicSearch(correctedText);
      return true;
    },
    [
      handleGuardianTopicSearch,
      handleNextStory,
      handleNextStoryInCategory,
      handleTopicSelect,
      getLastStoryCategory,
    ]
  );

  return (
    <AppShell maxWidth="md" padTop={true} className="!px-0">
      <div className="h-[calc(100vh-80px)] flex flex-col">
        <ConversationThread
          greeting={greeting}
          threadItems={threadItems}
          isLoading={isThreadLoading}
          topicOptions={topicOptions}
          onTopicSelect={handleTopicSelect}
          storyChips={storyChips}
          onStoryChipSelect={handleStoryChipSelect}
          nextSuggestionChip={nextSuggestionChip}
          onNextStory={handleNextStory}
          onTypedComposerIntent={handleTypedComposerIntent}
          onFollowUpMessage={handleFollowUpMessage}
        />
      </div>
    </AppShell>
  );
}
