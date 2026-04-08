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

// ─── Category icons ───────────────────────────────────────────────────────────

const CATEGORY_ICONS: Partial<Record<Category, string>> = {
  general: "📰",
  "pop-culture": "🎬",
  finance: "📊",
  sports: "⚽",
  technology: "💻",
  world: "🌍",
};

// ─── Initial curated chips ────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}

function categoryMatchesQuery(query: string): Category | null {
  const q = normalizeText(query);

  if (
    q.includes("pop culture") ||
    q.includes("pop-culture") ||
    q.includes("celeb") ||
    q.includes("celebrity") ||
    q.includes("music") ||
    q.includes("entertainment") ||
    q === "pop"
  ) {
    return "pop-culture";
  }

  if (q.includes("general") || q === "news" || q === "general news") {
    return "general";
  }

  if (q.includes("finance") || q.includes("market") || q.includes("stocks") || q.includes("money")) {
    return "finance";
  }

  if (q.includes("sports") || q.includes("game") || q.includes("match")) {
    return "sports";
  }

  if (q.includes("tech") || q.includes("technology") || q.includes("ai") || q.includes("startup")) {
    return "technology";
  }

  if (q.includes("world") || q.includes("global") || q.includes("international")) {
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
  ].includes(q);
}

function isTopicSearchRequest(text: string): boolean {
  const q = normalizeText(text);
  return (
    q.startsWith("tell me about ") ||
    q.startsWith("what's happening with ") ||
    q.startsWith("whats happening with ") ||
    q.startsWith("news about ") ||
    q.startsWith("show me ")
  );
}

function extractTopicQuery(text: string): string {
  return text
    .trim()
    .replace(/^tell me about\s+/i, "")
    .replace(/^what'?s happening with\s+/i, "")
    .replace(/^news about\s+/i, "")
    .replace(/^show me\s+/i, "")
    .trim();
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
  const liveByCategoryRef = useRef(liveByCategory);
  liveByCategoryRef.current = liveByCategory;

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
        // curated chips remain
      });
  }, []);

  const [threadItems, setThreadItems] = useState<ThreadItem[]>([]);
  const [isThreadLoading, setIsThreadLoading] = useState(false);

  const threadItemsRef = useRef(threadItems);
  threadItemsRef.current = threadItems;

  const [selectedChipId, setSelectedChipId] = useState<string | null>(null);

  const nextSuggestionChip = useMemo((): StoryChip | undefined => {
    if (!storyChips.length) return undefined;
    if (selectedChipId) return storyChips.find((c) => c.id !== selectedChipId);
    return storyChips[0];
  }, [storyChips, selectedChipId]);

  const appendAssistantMessage = useCallback((text: string) => {
    setThreadItems((prev) => [
      ...prev,
      {
        type: "assistant-message",
        id: `msg-${Date.now()}`,
        text,
      },
    ]);
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
        id: `user-${Date.now()}`,
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
        const { story } = await fetchStoryTransform(rawStory, apiTone, `topic-${category}-${Date.now()}`);
        setThreadItems((prev) => [
          ...prev,
          {
            type: "story",
            id: `story-${Date.now()}`,
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
      if (!rawStory || !chip) return;

      const userMsg: ThreadItem = {
        type: "user-message",
        id: `user-${Date.now()}`,
        text: customUserText ?? chip.label,
      };

      setSelectedChipId(id);
      setThreadItems((prev) => [...prev, userMsg]);
      setIsThreadLoading(true);

      try {
        const { story } = await fetchStoryTransform(rawStory, apiTone, `story-${id}-${Date.now()}`);
        setThreadItems((prev) => [
          ...prev,
          {
            type: "story",
            id: `story-${Date.now()}`,
            story,
          },
        ]);
      } finally {
        setIsThreadLoading(false);
      }
    },
    [storyMap, storyChips, apiTone]
  );

  const handleNextStory = useCallback(async () => {
    const chip = nextSuggestionChip;
    if (!chip) {
      appendAssistantMessage("i don't have another story queued yet — try switching topics.");
      return;
    }

    await handleStoryChipSelect(chip.id, "new news");
  }, [nextSuggestionChip, handleStoryChipSelect, appendAssistantMessage]);

  const handleGuardianTopicSearch = useCallback(
    async (userText: string) => {
      const query = extractTopicQuery(userText);

      if (!query) {
        appendAssistantMessage("try asking for a person, topic, or subject you want news about.");
        return;
      }

      const userMsg: ThreadItem = {
        type: "user-message",
        id: `user-${Date.now()}`,
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

        const { story } = await fetchStoryTransform(
          rawStory,
          apiTone,
          `search-${query}-${Date.now()}`
        );

        setThreadItems((prev) => [
          ...prev,
          {
            type: "story",
            id: `story-${Date.now()}`,
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
    [apiTone, appendAssistantMessage]
  );

  const handleTypedComposerIntent = useCallback(
    async (text: string) => {
      const normalized = normalizeText(text);

      if (isNextStoryRequest(normalized)) {
        await handleNextStory();
        return;
      }

      const matchedCategory = categoryMatchesQuery(normalized);
      if (matchedCategory) {
        await handleTopicSelect(matchedCategory, text);
        return;
      }

      if (isTopicSearchRequest(normalized)) {
        await handleGuardianTopicSearch(text);
        return;
      }

      // Otherwise let ConversationThread treat it as a current-story follow-up.
    },
    [handleNextStory, handleTopicSelect, handleGuardianTopicSearch]
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
        />
      </div>
    </AppShell>
  );
}