"use client";

/**
 * StoryActions.tsx
 *
 * Compact per-story action row: Recap · Why it matters · Hear more · Read original.
 * Supports the three user jobs for every story: Skim → Understand → Verify / go deeper.
 *
 * Placed below each StoryBubble card.
 * Reuses existing chip, muted-card, and accent-color design tokens.
 *
 * - "Recap" and "Hear more" call /api/story-action (AI, with local fallback)
 * - "Why it matters" uses existing story.whyItMatters field directly (no network)
 * - "Read original" opens source URL in a new tab (no network, no state)
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, X, Loader2 } from "lucide-react";
import type { Story, Tone } from "@/lib/types";

// ─── Tone mapping ─────────────────────────────────────────────────────────────

function storyToneToApiTone(tone: Tone): "gen_z" | "professional" | "casual" {
  const map: Record<Tone, "gen_z" | "professional" | "casual"> = {
    "gen-z": "gen_z",
    professional: "professional",
    casual: "casual",
    minimal: "casual",
  };
  return map[tone] ?? "casual";
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionId = "one_line_recap" | "why_it_matters" | "hear_more";

interface ActionResult {
  text: string;
  sourceUrl?: string;
}

// ─── AI actions (call /api/story-action) ─────────────────────────────────────

const AI_ACTIONS: ActionId[] = ["one_line_recap", "hear_more"];

const ACTION_LABELS: Record<ActionId, string> = {
  one_line_recap: "Recap",
  why_it_matters: "Why it matters",
  hear_more: "Hear more",
};

// ─── Local fallback derivation ────────────────────────────────────────────────

function buildLocalFallback(action: ActionId, story: Story): ActionResult {
  switch (action) {
    case "one_line_recap": {
      const sentence = story.chatOpening.split(/(?<=[.!?])\s/)[0]?.trim();
      return { text: sentence ?? story.headline };
    }
    case "why_it_matters":
      return { text: story.whyItMatters };
    case "hear_more":
      return {
        text: story.chatOpening,
        sourceUrl: story.sources[0]?.url,
      };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface StoryActionsProps {
  story: Story;
}

export function StoryActions({ story }: StoryActionsProps) {
  const [activeAction, setActiveAction] = useState<ActionId | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [loading, setLoading] = useState(false);

  const sourceUrl = story.sources[0]?.url;

  const handleAction = useCallback(
    async (action: ActionId) => {
      // Toggle off if the same action is already showing
      if (activeAction === action) {
        setActiveAction(null);
        setResult(null);
        return;
      }

      setActiveAction(action);

      // "Why it matters" is always local — no network call
      if (action === "why_it_matters") {
        setResult({ text: story.whyItMatters });
        return;
      }

      // AI-powered actions
      setResult(null);
      setLoading(true);

      try {
        const res = await fetch("/api/story-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            headline: story.headline,
            chatOpening: story.chatOpening,
            whyItMatters: story.whyItMatters,
            keyPoints: story.keyPoints,
            tonePreference: storyToneToApiTone(story.tone),
            isHighGravity: false,
            sourceUrl,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ActionResult = await res.json();
        setResult(data);
      } catch {
        // Always surface something useful — fall back to local derivation
        setResult(buildLocalFallback(action, story));
      } finally {
        setLoading(false);
      }
    },
    [activeAction, story, sourceUrl]
  );

  function handleDismiss() {
    setActiveAction(null);
    setResult(null);
  }

  return (
    <div className="mt-1.5 pl-9">
      {/* ── Action chip row ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(Object.keys(ACTION_LABELS) as ActionId[]).map((action) => {
          const isActive = activeAction === action;
          const isAI = AI_ACTIONS.includes(action);
          const showSpinner = isActive && isAI && loading;

          return (
            <motion.button
              key={action}
              onClick={() => handleAction(action)}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-pill text-xs font-medium border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{
                backgroundColor: isActive
                  ? "var(--chirpie-accent)"
                  : "var(--chirpie-chip)",
                color: isActive
                  ? "var(--chirpie-accent-foreground)"
                  : "var(--chirpie-chip-foreground)",
                borderColor: isActive
                  ? "var(--chirpie-accent)"
                  : "var(--chirpie-border)",
              }}
            >
              {showSpinner && (
                <Loader2 size={10} className="animate-spin flex-shrink-0" />
              )}
              {ACTION_LABELS[action]}
            </motion.button>
          );
        })}

        {/* Read original — always visible anchor, no AI, no state */}
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 rounded-pill text-xs font-medium border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:opacity-80"
            style={{
              backgroundColor: "var(--chirpie-chip)",
              color: "var(--chirpie-chip-foreground)",
              borderColor: "var(--chirpie-border)",
            }}
          >
            Read original
            <ExternalLink size={10} className="flex-shrink-0" />
          </a>
        )}
      </div>

      {/* ── Inline result card ───────────────────────────────────────────── */}
      <AnimatePresence>
        {activeAction && (result || loading) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div
              className="mt-2 px-3.5 py-2.5 rounded-xl border relative"
              style={{
                backgroundColor: "var(--chirpie-muted)",
                borderColor: "var(--chirpie-border)",
              }}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2
                    size={12}
                    className="animate-spin"
                    style={{ color: "var(--chirpie-muted-foreground)" }}
                  />
                  <span
                    className="text-xs"
                    style={{ color: "var(--chirpie-muted-foreground)" }}
                  >
                    thinking…
                  </span>
                </div>
              ) : (
                <>
                  <p
                    className="text-xs leading-relaxed pr-5"
                    style={{ color: "var(--chirpie-foreground)" }}
                  >
                    {result?.text}
                  </p>
                  {result?.sourceUrl && (
                    <a
                      href={result.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-[10px] font-semibold transition-opacity hover:opacity-70"
                      style={{ color: "var(--chirpie-accent)" }}
                    >
                      Read original
                      <ExternalLink size={10} />
                    </a>
                  )}
                  {/* Dismiss button */}
                  <button
                    onClick={handleDismiss}
                    className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full transition-opacity hover:opacity-60 focus:outline-none"
                    style={{ color: "var(--chirpie-muted-foreground)" }}
                    aria-label="Dismiss"
                  >
                    <X size={11} />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
