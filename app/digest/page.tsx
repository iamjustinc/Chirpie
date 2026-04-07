"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { ConversationThread } from "@/components/digest/ConversationThread";
import type { StoryChip } from "@/components/digest/ConversationThread";
import { mockDigest, mockStories } from "@/lib/mock-data";
import { loadUserPrefs, getToneGreeting, toneToApiTone } from "@/lib/user-prefs";
import { buildSingleStoryDigest } from "@/lib/adapters/transform-to-story";
import { fetchStoryTransform } from "@/lib/demo/fetch-story-transform";
import { getLeadStoryForCategory } from "@/lib/content/get-demo-stories";
import { sanitizeTransformOutput } from "@/lib/ai/sanitize-transform";
import { transformOutputToStory } from "@/lib/adapters/transform-to-story";
import { uiCategoryToContentCategory, contentCategoryToUICategory } from "@/lib/content/normalize-story";
import { getCategoryLabel } from "@/lib/utils";
import { CURATED_STORIES } from "@/lib/content/sources/local-curated";
import type { ContentCategory, RawStory } from "@/lib/content/types";
import type { Category, Digest } from "@/lib/types";
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

  // CURATED_STORIES are already ordered well; pick best one per category
  for (const s of CURATED_STORIES) {
    map.set(s.id, s); // always register all stories in the map
    if (seen.has(s.category)) continue;
    seen.add(s.category);
    chips.push({ id: s.id, label: s.chipLabel ?? s.headline.slice(0, 33) });
    if (chips.length >= 5) break;
  }
  return { chips, map };
}

const { chips: INITIAL_CHIPS, map: INITIAL_MAP } = buildCuratedChips();

// ─── Instant mock fallback (no network needed) ────────────────────────────────

const MOCK_BY_CATEGORY: Partial<Record<Category, (typeof mockStories)[number]>> = {
  "finance":     mockStories[0],
  "pop-culture": mockStories[1],
  "general":     mockStories[2],
};

function buildInstantDigest(category: Category, greeting: string): Digest {
  const mockStory = MOCK_BY_CATEGORY[category];
  if (mockStory) {
    return buildSingleStoryDigest(
      mockStory,
      `topic-${category}`,
      greeting,
      `here's what's happening in ${getCategoryLabel(category).toLowerCase()}.`
    );
  }
  const contentCat = uiCategoryToContentCategory(category);
  if (contentCat) {
    const rawStory = getLeadStoryForCategory(contentCat);
    if (rawStory) {
      const sanitized = sanitizeTransformOutput({}, rawStory);
      const story = transformOutputToStory(sanitized, rawStory, "casual", `topic-${category}`);
      return buildSingleStoryDigest(
        story,
        `topic-${category}`,
        greeting,
        `here's what's happening in ${getCategoryLabel(category).toLowerCase()}.`
      );
    }
  }
  return { ...mockDigest, greeting };
}

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
  // INITIAL_CHIPS is computed at module load: no async wait, chips show on first render.
  const [storyChips, setStoryChips] = useState<StoryChip[]>(INITIAL_CHIPS);
  const [storyMap,   setStoryMap]   = useState<Map<string, RawStory>>(INITIAL_MAP);

  // Try to upgrade to live news stories in the background (best-effort)
  useEffect(() => {
    fetch("/api/story-suggestions")
      .then((r) => r.ok ? r.json() : null)
      .then((data: StorySuggestion[] | null) => {
        if (!data?.length) return; // keep curated chips if no live data
        setStoryChips(data.map(({ id, label }) => ({ id, label })));
        setStoryMap(new Map(data.map(({ id, rawStory }) => [id, rawStory])));
      })
      .catch(() => { /* silent — curated chips remain */ });
  }, []);

  // ── Which chip was last selected → drives "next" suggestion ─────────────────
  const [selectedChipId, setSelectedChipId] = useState<string | null>(null);
  // Active UI category — for contextual deep-dive prompts after a story loads
  const [activeCategory, setActiveCategory] = useState<Category | undefined>(undefined);

  // Next suggestion = first chip that wasn't the one just selected.
  // For topic-chip selections (no specific chip id), suggest the first story chip.
  const nextSuggestionChip = useMemo((): StoryChip | undefined => {
    if (!storyChips.length) return undefined;
    if (selectedChipId) return storyChips.find((c) => c.id !== selectedChipId);
    return storyChips[0];
  }, [storyChips, selectedChipId]);

  // ── Digest state ─────────────────────────────────────────────────────────────
  const [digest, setDigest] = useState<Digest>(() => ({
    ...mockDigest,
    id: "digest-guided",
    items: [],
    greeting,
    intro: "",
  }));

  // ── Topic chip selection ──────────────────────────────────────────────────────
  const handleTopicSelect = useCallback(
    async (category: Category) => {
      setSelectedChipId(null); // topic selected — next suggestion = first story chip
      setActiveCategory(category);

      const contentCat = uiCategoryToContentCategory(category);
      const rawStory   = contentCat ? getLeadStoryForCategory(contentCat) : null;

      if (rawStory) {
        const { story } = await fetchStoryTransform(rawStory, apiTone, `topic-${category}`);
        setDigest(buildSingleStoryDigest(
          story,
          `topic-${category}`,
          greeting,
          `here's what's happening in ${getCategoryLabel(category).toLowerCase()}.`
        ));
      } else {
        setTimeout(() => setDigest(buildInstantDigest(category, greeting)), 900);
      }
    },
    [apiTone, greeting]
  );

  // ── Story chip selection ──────────────────────────────────────────────────────
  const handleStoryChipSelect = useCallback(
    async (id: string) => {
      const rawStory = storyMap.get(id);
      const chip     = storyChips.find((c) => c.id === id);
      if (!rawStory || !chip) return;

      setSelectedChipId(id);
      setActiveCategory(contentCategoryToUICategory(rawStory.category));

      const { story } = await fetchStoryTransform(rawStory, apiTone, `story-${id}`);
      setDigest(buildSingleStoryDigest(
        story,
        `story-${id}`,
        greeting,
        `here's the latest on "${chip.label.toLowerCase()}".`
      ));
    },
    [storyMap, storyChips, apiTone, greeting]
  );

  return (
    <AppShell maxWidth="md" padTop={true} className="!px-0">
      <div className="h-[calc(100vh-56px)] flex flex-col">
        <ConversationThread
          digest={digest}
          pacedMode
          storyCategory={activeCategory}
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
