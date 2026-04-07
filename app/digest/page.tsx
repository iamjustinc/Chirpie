"use client";

import { useState, useCallback } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { ConversationThread } from "@/components/digest/ConversationThread";
import { mockDigest, mockStories } from "@/lib/mock-data";
import { loadUserPrefs, getToneGreeting } from "@/lib/user-prefs";
import { buildSingleStoryDigest } from "@/lib/adapters/transform-to-story";
import { getLeadStoryForCategory } from "@/lib/content/get-demo-stories";
import { sanitizeTransformOutput } from "@/lib/ai/sanitize-transform";
import { transformOutputToStory } from "@/lib/adapters/transform-to-story";
import { uiCategoryToContentCategory } from "@/lib/content/normalize-story";
import { getCategoryLabel } from "@/lib/utils";
import type { Category, Digest } from "@/lib/types";

// ─── Category icons (for topic chips) ────────────────────────────────────────

const CATEGORY_ICONS: Partial<Record<Category, string>> = {
  "general": "📰",
  "pop-culture": "🎬",
  "finance": "📊",
  "sports": "⚽",
  "technology": "💻",
  "world": "🌍",
};

// ─── Build a single-story mock digest for a given UI category ─────────────────

function buildTopicDigest(category: Category, greeting: string): Digest {
  // Use existing editorial mock stories for covered categories
  const mockByCategory: Partial<Record<Category, (typeof mockStories)[number]>> = {
    "finance": mockStories[0],
    "pop-culture": mockStories[1],
    "general": mockStories[2],
  };

  const mockStory = mockByCategory[category];
  if (mockStory) {
    return buildSingleStoryDigest(
      mockStory,
      `topic-${category}`,
      greeting,
      `here's what's happening in ${getCategoryLabel(category).toLowerCase()}.`
    );
  }

  // For technology / world / sports: build from curated raw content via sanitizer
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

  // Ultimate fallback
  return { ...mockDigest, greeting };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DigestPage() {
  const [prefs] = useState(() => loadUserPrefs());
  const greeting = getToneGreeting(prefs.tone, prefs.name);

  // Topic options based on user interests (from onboarding/account prefs)
  const interests = prefs.interests ?? ["general", "pop-culture", "finance"];
  const topicOptions = interests.map((cat) => ({
    id: cat as Category,
    label: getCategoryLabel(cat as Category),
    icon: CATEGORY_ICONS[cat as Category] ?? "📰",
  }));

  // Start with an empty-items digest — guided mode will populate it on topic selection
  const [digest, setDigest] = useState<Digest>(() => ({
    ...mockDigest,
    id: "digest-guided",
    items: [],
    greeting,
    intro: "", // no intro text — guided bubble handles the follow-up
  }));

  const handleTopicSelect = useCallback(
    (category: Category) => {
      // Small delay so the user sees their message + typing indicator before the story pops in
      setTimeout(() => {
        setDigest(buildTopicDigest(category, greeting));
      }, 1200);
    },
    [greeting]
  );

  return (
    <AppShell maxWidth="md" padTop={true} className="!px-0">
      {/* Full-height thread, minus the nav bar height (56px = pt-14) */}
      <div className="h-[calc(100vh-56px)] flex flex-col">
        <ConversationThread
          digest={digest}
          pacedMode
          topicOptions={topicOptions}
          onTopicSelect={handleTopicSelect}
        />
      </div>
    </AppShell>
  );
}
