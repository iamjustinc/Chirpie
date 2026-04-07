"use client";

import { useState, useCallback, useEffect } from "react";
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
import { uiCategoryToContentCategory } from "@/lib/content/normalize-story";
import { getCategoryLabel } from "@/lib/utils";
import type { RawStory } from "@/lib/content/types";
import type { Category, Digest } from "@/lib/types";
import type { StorySuggestion } from "@/app/api/story-suggestions/route";

// ─── Category icons (for topic chips) ────────────────────────────────────────

const CATEGORY_ICONS: Partial<Record<Category, string>> = {
  "general": "📰",
  "pop-culture": "🎬",
  "finance": "📊",
  "sports": "⚽",
  "technology": "💻",
  "world": "🌍",
};

// ─── Instant mock fallback (no network needed) ────────────────────────────────

const MOCK_BY_CATEGORY: Partial<Record<Category, (typeof mockStories)[number]>> = {
  "finance":      mockStories[0],
  "pop-culture":  mockStories[1],
  "general":      mockStories[2],
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
  // tech / world / sports: build from curated raw content via sanitizer
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

  // Topic chips (broad categories) — derived from user's stored interests
  const interests = (prefs.interests ?? ["general", "pop-culture", "finance"]) as Category[];
  const topicOptions = interests.map((cat) => ({
    id: cat,
    label: getCategoryLabel(cat),
    icon: CATEGORY_ICONS[cat] ?? "📰",
  }));

  // Story suggestion chips — fetched async from /api/story-suggestions
  // We keep the full StorySuggestion locally so we can look up rawStory by id.
  const [suggestions, setSuggestions]   = useState<StorySuggestion[]>([]);
  const [storyChips,  setStoryChips]    = useState<StoryChip[]>([]);
  // Map from chip id → rawStory for the transform pipeline
  const [storyMap,    setStoryMap]      = useState<Map<string, RawStory>>(new Map());

  useEffect(() => {
    fetch("/api/story-suggestions")
      .then((r) => r.ok ? r.json() : [])
      .then((data: StorySuggestion[]) => {
        setSuggestions(data);
        setStoryChips(data.map(({ id, label }) => ({ id, label })));
        setStoryMap(new Map(data.map(({ id, rawStory }) => [id, rawStory])));
      })
      .catch(() => {
        // silent — topic chips still work without suggestions
      });
  }, []);

  // Start with an empty-items digest — guided mode will populate it on selection
  const [digest, setDigest] = useState<Digest>(() => ({
    ...mockDigest,
    id: "digest-guided",
    items: [],
    greeting,
    intro: "",
  }));

  // ── Topic chip selection ──────────────────────────────────────────────────────
  // Tries real AI transform first (10 s timeout), falls back to instant mock.
  const handleTopicSelect = useCallback(
    async (category: Category) => {
      const contentCat = uiCategoryToContentCategory(category);
      const rawStory   = contentCat ? getLeadStoryForCategory(contentCat) : null;

      if (rawStory) {
        const { story, isAIGenerated } = await fetchStoryTransform(rawStory, apiTone, `topic-${category}`);
        const intro = isAIGenerated
          ? `here's what's happening in ${getCategoryLabel(category).toLowerCase()}.`
          : `here's what's happening in ${getCategoryLabel(category).toLowerCase()}.`;
        setDigest(buildSingleStoryDigest(story, `topic-${category}`, greeting, intro));
      } else {
        // Fallback path — no raw story available (e.g., "sports")
        setTimeout(() => setDigest(buildInstantDigest(category, greeting)), 900);
      }
    },
    [apiTone, greeting]
  );

  // ── Story chip selection ──────────────────────────────────────────────────────
  // Looks up the rawStory by id and runs it through the transform pipeline.
  const handleStoryChipSelect = useCallback(
    async (id: string) => {
      const rawStory = storyMap.get(id);
      const chip     = storyChips.find((c) => c.id === id);

      if (!rawStory || !chip) return;

      const { story } = await fetchStoryTransform(rawStory, apiTone, `story-${id}`);
      setDigest(
        buildSingleStoryDigest(
          story,
          `story-${id}`,
          greeting,
          `here's the latest on "${chip.label.toLowerCase()}".`
        )
      );
    },
    [storyMap, storyChips, apiTone, greeting]
  );

  return (
    <AppShell maxWidth="md" padTop={true} className="!px-0">
      {/* Full-height thread, minus the nav bar height (56px = h-14) */}
      <div className="h-[calc(100vh-56px)] flex flex-col">
        <ConversationThread
          digest={digest}
          pacedMode
          topicOptions={topicOptions}
          onTopicSelect={handleTopicSelect}
          storyChips={storyChips}
          onStoryChipSelect={handleStoryChipSelect}
        />
      </div>
    </AppShell>
  );
}
