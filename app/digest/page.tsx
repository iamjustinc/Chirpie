"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { ConversationThread } from "@/components/digest/ConversationThread";
import type { StoryChip } from "@/components/digest/ConversationThread";
import { loadUserPrefs, getToneGreeting, toneToApiTone } from "@/lib/user-prefs";
import { fetchStoryTransform } from "@/lib/demo/fetch-story-transform";
import { getLeadStoryForCategory } from "@/lib/content/get-demo-stories";
import { uiCategoryToContentCategory, contentCategoryToUICategory } from "@/lib/content/normalize-story";
import { getCategoryLabel } from "@/lib/utils";
import { CURATED_STORIES } from "@/lib/content/sources/local-curated";
import type { ContentCategory, RawStory } from "@/lib/content/types";
import type { Category, ThreadItem } from "@/lib/types";
import type { StorySuggestion } from "@/app/api/story-suggestions/route";

// ─── Category icons (for topic chips) ────────────────────────────────────────

const CATEGORY_ICONS: Partial<Record<Category, string>> = {
  "general":     "📰",
  "pop-culture": "🎬",
  "finance":     "📊",
  "sports":      "⚽",
  "technology":  "💻",
  "world":       "🌍",
};

// ─── Build initial story chips + map from curated (synchronous, no async needed) ──

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DigestPage() {
  const [prefs]  = useState(() => loadUserPrefs());
  const greeting = getToneGreeting(prefs.tone, prefs.name);
  const apiTone  = toneToApiTone(prefs.tone);

  // Topic chips (broad categories) — from user's stored interests
  const interests = (prefs.interests ?? ["general", "pop-culture", "finance"]) as Category[];
  const topicOptions = interests.map((cat) => ({
    id: cat,
    label: getCategoryLabel(cat),
    icon: CATEGORY_ICONS[cat] ?? "📰",
  }));

  // ── Story chips — pre-populated from curated immediately, updated async ──────
  const [storyChips, setStoryChips] = useState<StoryChip[]>(INITIAL_CHIPS);
  const [storyMap,   setStoryMap]   = useState<Map<string, RawStory>>(INITIAL_MAP);

  useEffect(() => {
    fetch("/api/story-suggestions")
      .then((r) => r.ok ? r.json() : null)
      .then((data: StorySuggestion[] | null) => {
        if (!data?.length) return;
        setStoryChips(data.map(({ id, label }) => ({ id, label })));
        setStoryMap(new Map(data.map(({ id, rawStory }) => [id, rawStory])));
      })
      .catch(() => { /* silent — curated chips remain */ });
  }, []);

  // ── Thread state (append-only — never replaced) ───────────────────────────────
  const [threadItems, setThreadItems] = useState<ThreadItem[]>([]);
  const [isThreadLoading, setIsThreadLoading] = useState(false);

  // Stable ref to threadItems so callbacks don't go stale
  const threadItemsRef = useRef(threadItems);
  threadItemsRef.current = threadItems;

  // ── Which chip was last selected → drives "next" suggestion ─────────────────
  const [selectedChipId, setSelectedChipId] = useState<string | null>(null);

  const nextSuggestionChip = useMemo((): StoryChip | undefined => {
    if (!storyChips.length) return undefined;
    if (selectedChipId) return storyChips.find((c) => c.id !== selectedChipId);
    return storyChips[0];
  }, [storyChips, selectedChipId]);

  // ── Topic chip selection ──────────────────────────────────────────────────────
  const handleTopicSelect = useCallback(
    async (category: Category) => {
      const label = getCategoryLabel(category).toLowerCase();
      const currentItems = threadItemsRef.current;
      const hasStories = currentItems.some((i) => i.type === "story");
      const userText = hasStories ? `let's switch to ${label}` : `let's talk about ${label}`;

      const userMsg: ThreadItem = {
        type: "user-message",
        id: `user-${Date.now()}`,
        text: userText,
      };

      setSelectedChipId(null);
      setThreadItems((prev) => [...prev, userMsg]);
      setIsThreadLoading(true);

      const contentCat = uiCategoryToContentCategory(category);
      const rawStory   = contentCat ? getLeadStoryForCategory(contentCat) : null;

      if (rawStory) {
        const { story } = await fetchStoryTransform(rawStory, apiTone, `topic-${category}`);
        setIsThreadLoading(false);
        setThreadItems((prev) => [...prev, {
          type: "story",
          id: `story-${Date.now()}`,
          story,
        }]);
      } else {
        // No curated story for this category — show a graceful fallback message
        setIsThreadLoading(false);
        setThreadItems((prev) => [...prev, {
          type: "assistant-message",
          id: `msg-${Date.now()}`,
          text: `nothing new on ${label} right now — check back later or pick another topic.`,
        }]);
      }
    },
    [apiTone]
  );

  // ── Story chip selection ──────────────────────────────────────────────────────
  const handleStoryChipSelect = useCallback(
    async (id: string) => {
      const rawStory = storyMap.get(id);
      const chip     = storyChips.find((c) => c.id === id);
      if (!rawStory || !chip) return;

      const userMsg: ThreadItem = {
        type: "user-message",
        id: `user-${Date.now()}`,
        text: chip.label,
      };

      setSelectedChipId(id);
      setThreadItems((prev) => [...prev, userMsg]);
      setIsThreadLoading(true);

      const { story } = await fetchStoryTransform(rawStory, apiTone, `story-${id}`);
      setIsThreadLoading(false);
      setThreadItems((prev) => [...prev, {
        type: "story",
        id: `story-${Date.now()}`,
        story,
      }]);
    },
    [storyMap, storyChips, apiTone]
  );

  return (
    <AppShell maxWidth="md" padTop={true} className="!px-0">
      <div className="h-[calc(100vh-64px)] flex flex-col">
        <ConversationThread
          greeting={greeting}
          threadItems={threadItems}
          isLoading={isThreadLoading}
          topicOptions={topicOptions}
          onTopicSelect={handleTopicSelect}
          storyChips={storyChips}
          onStoryChipSelect={handleStoryChipSelect}
          nextSuggestionChip={nextSuggestionChip}
        />
      </div>
    </AppShell>
  );
}
