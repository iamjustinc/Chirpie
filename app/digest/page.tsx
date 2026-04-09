"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { ConversationThread } from "@/components/digest/ConversationThread";
import type { StoryChip } from "@/components/digest/ConversationThread";
import { loadUserPrefs, getToneGreeting, toneToApiTone } from "@/lib/user-prefs";
import { isStoryFollowUp } from "@/lib/query/normalize";
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
    "another update",
    "another pop update",
    "another general update",
    "another finance update",
    "another tech update",
    "another sports update",
    "another world update",
  ].includes(q);
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

  const nextSuggestionChip = useMemo((): StoryChip | undefined => {
    if (!storyChips.length) return undefined;
    if (selectedChipId) return storyChips.find((c) => c.id !== selectedChipId);
    return storyChips[0];
  }, [storyChips, selectedChipId]);

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
        appendAssistantMessage("i don't have another story queued yet — try switching topics.");
        return;
      }

      await handleStoryChipSelect(chip.id, customUserText);
    },
    [nextSuggestionChip, handleStoryChipSelect, appendAssistantMessage]
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
        const rawStory = data?.stories?.[0] as RawStory | undefined;
        const correctedQuery: string | undefined = data?.correctedQuery;

        if (correctedQuery) {
          console.log(`[Chirpie][search] query corrected: "${query}" → "${correctedQuery}"`);
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
      const normalized = normalizeText(text);
      console.log("[composer] raw:", JSON.stringify(text));

      // 1. Navigation shortcuts — exact phrases like "next", "more", "another one"
      if (isNextStoryRequest(normalized)) {
        console.log("[composer] route → next_story");
        await handleNextStory(text);
        return true;
      }

      // 2. Contextual "another X update" (e.g., "another pop update")
      const lastCategory = getLastStoryCategory();
      if (normalized.includes("another") && normalized.includes("update") && lastCategory) {
        console.log("[composer] route → contextual_next_story", lastCategory);
        await handleNextStory(text);
        return true;
      }

      // 3. Explicit category redirect — narrow set of phrases that clearly mean
      //    "switch me to this category", not "search for this entity".
      //    Bare entity names (artists, games, market terms) are intentionally NOT
      //    caught here — they go to search instead so Guardian finds specific articles.
      const matchedCategory = categoryMatchesQuery(normalized);
      if (matchedCategory) {
        const lastCat = getLastStoryCategory();
        if (lastCat === matchedCategory) {
          console.log("[composer] route → next_story (same-category dedup)", matchedCategory);
          await handleNextStory(text);
        } else {
          console.log("[composer] route → topic_switch", matchedCategory);
          await handleTopicSelect(matchedCategory, text);
        }
        return true;
      }

      // 4. Clear story follow-up — user is asking about the CURRENT article.
      //    This is a strict allowlist (see lib/query/normalize.ts). Anything that
      //    doesn't match falls through to search below.
      if (isStoryFollowUp(text)) {
        console.log("[composer] route → story_follow_up");
        return false;
      }

      // 5. DEFAULT: search Guardian for a new story.
      //    This is the primary path for bare entity names, artist/game/topic
      //    queries, typo-heavy inputs, and anything that isn't clearly navigation
      //    or a follow-up question about the active article.
      console.log("[composer] route → topic_search (default)");
      await handleGuardianTopicSearch(text);
      return true;
    },
    [
      handleGuardianTopicSearch,
      handleNextStory,
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
