"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { ConversationThread } from "@/components/digest/ConversationThread";
import type { StoryChip } from "@/components/digest/ConversationThread";
import { loadUserPrefs, getToneGreeting, toneToApiTone } from "@/lib/user-prefs";
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

function categoryMatchesQuery(query: string): Category | null {
  const q = normalizeText(query);

  if (
    q === "pop" ||
    q.includes("pop culture") ||
    q.includes("pop-culture") ||
    q.includes("celeb") ||
    q.includes("celebrity") ||
    q.includes("entertainment") ||
    q === "music news"
  ) {
    return "pop-culture";
  }

  if (q === "general" || q === "news" || q === "general news") {
    return "general";
  }

  if (
    q === "finance" ||
    q === "stock" ||
    q === "stocks" ||
    q.includes("stock market") ||
    q.includes("market") ||
    q.includes("stocks") ||
    q.includes("money")
  ) {
    return "finance";
  }

  if (q === "sports" || q.includes("game") || q.includes("match")) {
    return "sports";
  }

  if (q === "tech" || q === "technology" || q.includes("startup")) {
    return "technology";
  }

  if (q === "world" || q.includes("global") || q.includes("international")) {
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

function isTopicSearchRequest(text: string): boolean {
  const q = normalizeText(text);

  return (
    q.startsWith("tell me about ") ||
    q.startsWith("can you tell me about ") ||
    q.startsWith("could you tell me about ") ||
    q.startsWith("what's happening with ") ||
    q.startsWith("whats happening with ") ||
    q.startsWith("what is happening with ") ||
    q.startsWith("news about ") ||
    q.startsWith("show me ") ||
    q.startsWith("search for ") ||
    q.startsWith("find me ") ||
    q.includes("related to ") ||
    q.includes("anything about ") ||
    q.includes("something about ") ||
    q.includes("how about ")
  );
}

/**
 * Returns true for bare multi-word entity/topic phrases that were NOT caught by
 * the explicit-prefix check above and are clearly NOT follow-up questions.
 *
 * Examples that should return true:
 *   "house tour by sabrina carpenter"
 *   "taylor swift eras tour"
 *   "nvidia earnings"
 *
 * Examples that should return false (stay as follow-ups):
 *   "why does this matter?" → starts with question word
 *   "what's the background?" → ends with ?
 *   "quick recap?" → ends with ? + has follow-up word
 *   "broader context?" → ends with ?
 *   "tell me more" → starts with "tell me"
 */
function looksLikeSearchQuery(text: string): boolean {
  const q = normalizeText(text);
  const words = q.split(/\s+/).filter(Boolean);

  // Need at least 2 words — single words go through category matching or next-story
  if (words.length < 2) return false;

  // Questions (by leading word) → follow-up, not search
  const QUESTION_STARTERS = [
    "why", "what", "how", "is", "are", "does", "will", "would",
    "who", "when", "where", "should", "could", "can",
  ];
  if (QUESTION_STARTERS.includes(words[0])) return false;

  // "tell me ..." prefix — "tell me about X" is caught by isTopicSearchRequest;
  // anything else ("tell me more") should be a follow-up
  if (q.startsWith("tell me")) return false;

  // Ends with ? → almost certainly a follow-up question
  if (q.endsWith("?")) return false;

  // Follow-up indicator words — these phrases belong in the story conversation
  const FOLLOW_UP_INDICATORS = [
    "matter", "happen", "background", "context", "recap",
    "explain", "summary", "summarize", "elaborate", "dig deeper",
  ];
  if (FOLLOW_UP_INDICATORS.some((w) => q.includes(w))) return false;

  // Passes all gates → likely a bare entity/topic search
  return true;
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
    .replace(/^show me\s+/i, "")
    .replace(/^search for\s+/i, "")
    .replace(/^find me\s+/i, "")
    .trim();

  if (direct !== raw && direct.length > 0) {
    return direct;
  }

  const relatedMatch =
    raw.match(/related to\s+(.+)$/i) ||
    raw.match(/anything about\s+(.+)$/i) ||
    raw.match(/something about\s+(.+)$/i) ||
    raw.match(/how about\s+(.+)$/i);

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

        if (!rawStory) {
          appendAssistantMessage(`i couldn't find a solid Guardian story for "${query}" right now.`);
          return;
        }

        setLastSearchTopic(query);

        const { story } = await fetchStoryTransform(
          rawStory,
          apiTone,
          nid("search")
        );

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
        appendAssistantMessage(`i couldn't search Guardian for "${query}" right now.`);
      } finally {
        setIsThreadLoading(false);
      }
    },
    [apiTone, appendAssistantMessage, lastSearchTopic]
  );

  const handleTypedComposerIntent = useCallback(
    async (text: string): Promise<boolean> => {
      const normalized = normalizeText(text);
      console.log("[composer] raw:", JSON.stringify(text));

      // 1. Explicit search prefix ("tell me about X", "what's happening with X", etc.)
      if (isTopicSearchRequest(normalized)) {
        console.log("[composer] route → topic_search (prefix)");
        await handleGuardianTopicSearch(text);
        return true;
      }

      // 2. Navigation ("next news", "more", "another one", etc.)
      if (isNextStoryRequest(normalized)) {
        console.log("[composer] route → next_story");
        await handleNextStory(text);
        return true;
      }

      // 3. Category keyword ("stock", "finance", "tech", etc.)
      //    If the user is already reading a story in that category, advance to
      //    the next story rather than reloading the same one.
      const matchedCategory = categoryMatchesQuery(normalized);
      if (matchedCategory) {
        const lastCat = getLastStoryCategory();
        if (lastCat === matchedCategory) {
          // Same category already active — advance rather than repeat
          console.log("[composer] route → next_story (same-category dedup)", matchedCategory);
          await handleNextStory(text);
        } else {
          console.log("[composer] route → topic_switch", matchedCategory);
          await handleTopicSelect(matchedCategory, text);
        }
        return true;
      }

      // 4. Contextual "another X update" (e.g., "another pop update")
      const lastCategory = getLastStoryCategory();
      if (
        normalized.includes("another") &&
        normalized.includes("update") &&
        lastCategory
      ) {
        console.log("[composer] route → contextual_next_story", lastCategory);
        await handleNextStory(text);
        return true;
      }

      // 5. Bare entity/topic query — multi-word phrase that doesn't look like a
      //    follow-up question ("house tour by sabrina carpenter", "nvidia earnings")
      if (looksLikeSearchQuery(text)) {
        console.log("[composer] route → topic_search (bare entity)");
        await handleGuardianTopicSearch(text);
        return true;
      }

      // 6. Falls through → ConversationThread handles it as a story follow-up
      console.log("[composer] route → story_follow_up");
      return false;
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
