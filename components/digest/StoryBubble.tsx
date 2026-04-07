"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, Share2, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import type { Story } from "@/lib/types";
import { SourceButtons, SourceLine } from "./SourceButtons";
import { FollowUpChips } from "./FollowUpChips";
import { StoryActions } from "./StoryActions";
import { cn, getCategoryColor, getCategoryLabel } from "@/lib/utils";

interface StoryBubbleProps {
  story: Story;
  onFollowUp?: (prompt: string) => void;
  delay?: number;
}

export function StoryBubble({ story, onFollowUp, delay = 0 }: StoryBubbleProps) {
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(story.saved ?? false);
  const [shared, setShared] = useState(false);

  function handleShare() {
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-start gap-2.5"
    >
      {/* Chirpie avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-1"
        style={{ backgroundColor: "var(--chirpie-muted)" }}
        aria-hidden="true"
      >
        🐦
      </div>

      {/* Bubble */}
      <div className="flex-1 min-w-0">
        <motion.div
          className="rounded-2xl rounded-bl-sm border overflow-hidden"
          style={{
            backgroundColor: "var(--chirpie-bubble-assistant)",
            borderColor: "var(--chirpie-border)",
            boxShadow: "0 3px 14px 0 var(--chirpie-shadow)",
          }}
          layout
        >
          {/* Category + source line */}
          <div
            className="flex items-center justify-between gap-2 px-4 pt-3 pb-2"
          >
            <span
              className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded-pill uppercase tracking-wide",
                getCategoryColor(story.category)
              )}
            >
              {getCategoryLabel(story.category)}
            </span>
            <SourceLine sources={story.sources} publishedAt={story.publishedAt} />
          </div>

          {/* Headline */}
          <div className="px-4 pb-1">
            <h3
              className="text-xs font-semibold leading-snug"
              style={{ color: "var(--chirpie-muted-foreground)" }}
            >
              {story.headline}
            </h3>
          </div>

          {/* Chat opening — the primary message */}
          <div className="px-4 pb-3">
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--chirpie-bubble-assistant-foreground)" }}
            >
              {story.chatOpening}
            </p>
          </div>

          {/* Expanded content */}
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                {/* Why it matters */}
                <div
                  className="mx-4 mb-3 px-3 py-2.5 rounded-xl border-l-2 text-xs leading-relaxed"
                  style={{
                    backgroundColor: "var(--chirpie-muted)",
                    borderColor: "var(--chirpie-accent)",
                    color: "var(--chirpie-muted-foreground)",
                  }}
                >
                  <p className="font-semibold text-foreground mb-1 text-[10px] uppercase tracking-wider">
                    Why it matters
                  </p>
                  <p>{story.whyItMatters}</p>
                </div>

                {/* Key points */}
                {story.keyPoints.length > 0 && (
                  <div className="px-4 mb-3">
                    <p
                      className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                      style={{ color: "var(--chirpie-muted-foreground)" }}
                    >
                      Key points
                    </p>
                    <ul className="space-y-1">
                      {story.keyPoints.map((point, i) => (
                        <li key={i} className="flex gap-2 text-xs" style={{ color: "var(--chirpie-bubble-assistant-foreground)" }}>
                          <span style={{ color: "var(--chirpie-accent)" }}>—</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sources */}
                <div className="px-4 mb-3">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: "var(--chirpie-muted-foreground)" }}
                  >
                    Read original
                  </p>
                  <SourceButtons sources={story.sources} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action bar */}
          <div
            className="flex items-center justify-between px-4 py-2.5 border-t"
            style={{ borderColor: "var(--chirpie-border)" }}
          >
            <div className="flex items-center gap-1">
              {/* Expand / Collapse */}
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-pill text-xs font-medium transition-all hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{
                  backgroundColor: "var(--chirpie-chip)",
                  color: "var(--chirpie-chip-foreground)",
                }}
              >
                {expanded ? (
                  <>
                    <ChevronUp size={11} />
                    Less
                  </>
                ) : (
                  <>
                    <ChevronDown size={11} />
                    More
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-1">
              {/* Save */}
              <motion.button
                onClick={() => setSaved(!saved)}
                whileTap={{ scale: 0.85 }}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{
                  backgroundColor: saved ? "var(--chirpie-accent)" : "var(--chirpie-muted)",
                  color: saved ? "var(--chirpie-accent-foreground)" : "var(--chirpie-muted-foreground)",
                }}
                aria-label={saved ? "Unsave story" : "Save story"}
                aria-pressed={saved}
              >
                <Bookmark size={13} fill={saved ? "currentColor" : "none"} />
              </motion.button>

              {/* Share */}
              <motion.button
                onClick={handleShare}
                whileTap={{ scale: 0.85 }}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{
                  backgroundColor: "var(--chirpie-muted)",
                  color: shared ? "var(--chirpie-accent)" : "var(--chirpie-muted-foreground)",
                }}
                aria-label="Share story"
              >
                <Share2 size={13} />
              </motion.button>

              {/* Read original */}
              <motion.a
                href={story.sources[0]?.url}
                target="_blank"
                rel="noopener noreferrer"
                whileTap={{ scale: 0.85 }}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{
                  backgroundColor: "var(--chirpie-muted)",
                  color: "var(--chirpie-muted-foreground)",
                }}
                aria-label="Read original source"
              >
                <ExternalLink size={13} />
              </motion.a>
            </div>
          </div>
        </motion.div>

        {/* Story actions — Recap · Why it matters · Hear more · Read original */}
        <StoryActions story={story} />

        {/* Follow-up chips — conversational next steps */}
        {story.followUpPrompts.length > 0 && onFollowUp && (
          <FollowUpChips
            prompts={story.followUpPrompts}
            onSelect={onFollowUp}
          />
        )}
      </div>
    </motion.div>
  );
}
