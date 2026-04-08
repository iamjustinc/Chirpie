"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ConversationThread } from "@/components/digest/ConversationThread";
import { mockStories, mockDigest } from "@/lib/mock-data";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { ArrowRight, Sparkles, Loader2, WifiOff } from "lucide-react";
import { fetchStoryTransform } from "@/lib/demo/fetch-story-transform";
import { getLeadStoryForCategory, getAvailableContentCategories } from "@/lib/content/get-demo-stories";
import { contentCategoryToUICategory, uiCategoryToContentCategory } from "@/lib/content/normalize-story";
import { sanitizeTransformOutput } from "@/lib/ai/sanitize-transform";
import { transformOutputToStory, buildSingleStoryDigest } from "@/lib/adapters/transform-to-story";
import { loadUserPrefs, toneToApiTone, getToneGreeting } from "@/lib/user-prefs";
import type { ContentCategory } from "@/lib/content/types";
import type { Category, Digest, Story, ThreadItem } from "@/lib/types";

// ─── Category switcher display labels ────────────────────────────────────────

const CATEGORY_LABELS: Record<ContentCategory, string> = {
  general: "General",
  pop_culture: "Pop Culture",
  finance: "Finance",
  tech: "Tech",
  world: "World",
};

// ─── Mock story map (for mock mode per category) ──────────────────────────────
// Uses existing editorial mock stories where available; falls back to curated raw content.

function buildMockDigestForCategory(
  cat: ContentCategory,
  greeting: string,
  intro: string
): Digest {
  // Use existing editorial mock stories for the three covered categories
  const mockMap: Partial<Record<ContentCategory, Story>> = {
    general: mockStories[2],
    pop_culture: mockStories[1],
    finance: mockStories[0],
  };

  const existingStory = mockMap[cat];
  if (existingStory) {
    return buildSingleStoryDigest(existingStory, `mock-${cat}`, greeting, intro);
  }

  // For tech / world: build from curated raw content via sanitizer (no AI needed)
  const rawStory = getLeadStoryForCategory(cat);
  if (rawStory) {
    const sanitized = sanitizeTransformOutput({}, rawStory);
    const story = transformOutputToStory(sanitized, rawStory, "casual", `mock-${cat}`);
    return buildSingleStoryDigest(story, `mock-${cat}`, greeting, intro);
  }

  // Ultimate fallback
  return mockDigest;
}

// ─── Mode types ───────────────────────────────────────────────────────────────

type DemoMode = "mock" | "loading" | "live" | "error";

// ─── Mode badge ───────────────────────────────────────────────────────────────

interface ModeBadgeProps {
  mode: DemoMode;
  onTryLive: () => void;
  isAIGenerated?: boolean;
}

function ModeBadge({ mode, onTryLive, isAIGenerated }: ModeBadgeProps) {
  if (mode === "mock") {
    return (
      <motion.button
        onClick={onTryLive}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-semibold border transition-colors"
        style={{
          backgroundColor: "var(--chirpie-card)",
          color: "var(--chirpie-primary)",
          borderColor: "var(--chirpie-primary)",
        }}
      >
        <Sparkles size={11} />
        Try live AI
      </motion.button>
    );
  }

  if (mode === "loading") {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-semibold border"
        style={{
          backgroundColor: "var(--chirpie-muted)",
          color: "var(--chirpie-muted-foreground)",
          borderColor: "var(--chirpie-border)",
        }}
      >
        <Loader2 size={11} className="animate-spin" />
        Transforming…
      </div>
    );
  }

  if (mode === "live") {
    if (isAIGenerated) {
      // Real Claude response — show the full "Live AI" indicator
      return (
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-semibold"
          style={{
            backgroundColor: "var(--chirpie-primary)",
            color: "var(--chirpie-primary-foreground)",
          }}
        >
          <span className="relative flex h-2 w-2">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: "var(--chirpie-primary-foreground)" }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ backgroundColor: "var(--chirpie-primary-foreground)" }}
            />
          </span>
          Live AI
        </div>
      );
    }
    // Sanitized fallback (no API key, timeout, or API error)
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-semibold border"
        style={{
          backgroundColor: "var(--chirpie-card)",
          color: "var(--chirpie-muted-foreground)",
          borderColor: "var(--chirpie-border)",
        }}
      >
        Chirpie response
      </div>
    );
  }

  // error
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-semibold border"
      style={{
        backgroundColor: "var(--chirpie-card)",
        color: "var(--chirpie-muted-foreground)",
        borderColor: "var(--chirpie-border)",
      }}
    >
      <WifiOff size={11} />
      AI unavailable
    </div>
  );
}

// ─── Category switcher row ────────────────────────────────────────────────────
// Minimal pill row — global topic navigation. Does NOT duplicate the in-thread prompts.

interface CategorySwitcherProps {
  active: ContentCategory;
  categories: ContentCategory[];
  onChange: (cat: ContentCategory) => void;
}

function CategorySwitcher({ active, categories, onChange }: CategorySwitcherProps) {
  return (
    <div
      className="px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-hide border-b flex-shrink-0"
      style={{ borderColor: "var(--chirpie-border)" }}
    >
      <span
        className="text-[10px] font-semibold uppercase tracking-wider flex-shrink-0 pr-1"
        style={{ color: "var(--chirpie-muted-foreground)" }}
      >
        Topic
      </span>
      {categories.map((cat) => {
        const isActive = cat === active;
        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className="flex-shrink-0 px-3 py-1 rounded-pill text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{
              backgroundColor: isActive
                ? "var(--chirpie-primary)"
                : "var(--chirpie-chip)",
              color: isActive
                ? "var(--chirpie-primary-foreground)"
                : "var(--chirpie-chip-foreground)",
              border: isActive ? "none" : "1px solid var(--chirpie-border)",
            }}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DemoPage() {
  // ── Load user prefs (runs once on mount, client-only) ──────────────────────
  const [userPrefs] = useState(() => loadUserPrefs());
  const apiTone = toneToApiTone(userPrefs.tone);

  // ── Active category — defaults to user's first interest ───────────────────
  const [activeCategory, setActiveCategory] = useState<ContentCategory>(() => {
    const firstInterest = userPrefs.interests?.[0];
    if (firstInterest) {
      const mapped = uiCategoryToContentCategory(firstInterest);
      if (mapped) return mapped;
    }
    return "general";
  });

  const availableCategories = getAvailableContentCategories();

  // ── Personalized copy ──────────────────────────────────────────────────────
  const greeting = getToneGreeting(userPrefs.tone, userPrefs.name);
  const mockIntro = "one story to start. switch topics above or ask a follow-up below.";

  // ── Mode & digest state ────────────────────────────────────────────────────
  const [mode, setMode] = useState<DemoMode>("mock");
  const [timedOut, setTimedOut] = useState(false);
  const [isAIGenerated, setIsAIGenerated] = useState(false);
  const [currentDigest, setCurrentDigest] = useState<Digest>(() =>
    buildMockDigestForCategory(activeCategory, greeting, mockIntro)
  );

  // The active UI Category for passing to ConversationThread's contextual prompts
  const activeUICategory: Category = contentCategoryToUICategory(activeCategory);

  // ── Category change handler ────────────────────────────────────────────────
  const handleCategoryChange = useCallback(
    async (cat: ContentCategory) => {
      if (cat === activeCategory) return;
      setActiveCategory(cat);
      setTimedOut(false);

      if (mode === "live") {
        // Re-fetch live story for new category
        setMode("loading");
        const rawStory = getLeadStoryForCategory(cat);
        if (!rawStory) {
          setMode("error");
          return;
        }
        const { story, timedOut: didTimeout, isAIGenerated: aiGenerated } = await fetchStoryTransform(
          rawStory,
          apiTone,
          `live-${cat}`
        );
        setTimedOut(didTimeout);
        setIsAIGenerated(aiGenerated);
        const uiCat = contentCategoryToUICategory(cat);
        const liveIntro = didTimeout
          ? "showing a quick version for now — sources are a bit slow."
          : `here's what's happening in ${CATEGORY_LABELS[cat].toLowerCase()}.`;
        setCurrentDigest(buildSingleStoryDigest(story, `live-${cat}`, greeting, liveIntro));
        setMode("live");
      } else {
        // Mock mode: swap to mock story for the new category immediately
        setCurrentDigest(buildMockDigestForCategory(cat, greeting, mockIntro));
      }
    },
    [activeCategory, mode, apiTone, greeting, mockIntro]
  );

  // ── "Try live AI" handler ──────────────────────────────────────────────────
  const handleTryLive = useCallback(async () => {
    setMode("loading");
    setTimedOut(false);

    const rawStory = getLeadStoryForCategory(activeCategory);
    if (!rawStory) {
      setMode("error");
      return;
    }

    const { story, timedOut: didTimeout, isAIGenerated: aiGenerated } = await fetchStoryTransform(
      rawStory,
      apiTone,
      `live-${activeCategory}`
    );

    setTimedOut(didTimeout);
    setIsAIGenerated(aiGenerated);

    const liveGreeting = greeting;
    const liveIntro = didTimeout
      ? "showing a quick version for now — sources are a bit slow."
      : "transformed in real time by Claude. tap any bubble to dig deeper.";

    setCurrentDigest(
      buildSingleStoryDigest(story, `live-${activeCategory}`, liveGreeting, liveIntro)
    );
    setMode("live");
  }, [activeCategory, apiTone, greeting]);

  // ── Keep mock digest in sync with active category when in mock mode ────────
  useEffect(() => {
    if (mode !== "mock") return;
    setCurrentDigest(buildMockDigestForCategory(activeCategory, greeting, mockIntro));
  }, [activeCategory, mode, greeting, mockIntro]);

  // Banner title
  const bannerTitle =
    mode === "live"
      ? "Live AI Digest — transformed by Claude just now."
      : "Demo Digest — this is what Chirpie looks like.";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--chirpie-background)" }}
    >
      {/* ── Main banner row ───────────────────────────────────────────────── */}
      <div
        className="px-4 py-3 flex items-center justify-between gap-4 border-b flex-shrink-0"
        style={{
          backgroundColor: "var(--chirpie-muted)",
          borderColor: "var(--chirpie-border)",
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Image src="/bird-logo.png" alt="" width={44} height={44} className="w-11 h-11 object-contain flex-shrink-0" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={bannerTitle}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="text-xs font-semibold text-foreground truncate"
            >
              {bannerTitle}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <ModeBadge mode={mode} onTryLive={handleTryLive} isAIGenerated={isAIGenerated} />
          <ThemeSwitcher size="sm" />
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/sign-up"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill text-xs font-semibold transition-all"
              style={{
                backgroundColor: "var(--chirpie-primary)",
                color: "var(--chirpie-primary-foreground)",
              }}
            >
              Get started <ArrowRight size={12} />
            </Link>
          </motion.div>
        </div>
      </div>

      {/* ── Category switcher row (top-level topic nav) ───────────────────── */}
      <CategorySwitcher
        active={activeCategory}
        categories={availableCategories}
        onChange={handleCategoryChange}
      />

      {/* ── Thread ───────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 max-w-2xl mx-auto w-full">
        {/*
          key forces ConversationThread to fully remount + re-animate on
          category/mode change so stories bubble in fresh each time.
        */}
        <ConversationThread
          key={`${currentDigest.id}-${mode}`}
          greeting={greeting}
          threadItems={
            mode === "loading"
              ? []
              : currentDigest.items.map<ThreadItem>((item) => ({
                  type: "story",
                  id: item.id,
                  story: item.story,
                }))
          }
          isLoading={mode === "loading"}
        />
      </div>
    </div>
  );
}
