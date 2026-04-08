"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send } from "lucide-react";
import Image from "next/image";
import type { Category, ThreadItem, Story, Tone } from "@/lib/types";
import { DigestIntroMessage } from "./DigestIntroMessage";
import { StoryBubble } from "./StoryBubble";
import { TypingIndicator } from "./TypingIndicator";
import { useStagedStatus } from "@/lib/hooks/use-staged-status";

interface TopicOption {
  id: Category;
  label: string;
  icon: string;
}

export interface StoryChip {
  id: string;
  label: string;
}

interface ConversationThreadProps {
  greeting: string;
  threadItems: ThreadItem[];
  isLoading: boolean;
  topicOptions?: TopicOption[];
  onTopicSelect?: (category: Category) => void;
  storyChips?: StoryChip[];
  onStoryChipSelect?: (id: string) => void;
  nextSuggestionChip?: StoryChip;
  onNextStory?: (customUserText?: string) => Promise<void> | void;
  onTypedComposerIntent?: (text: string) => Promise<boolean> | boolean;
  /**
   * Called for each follow-up message (user question + assistant reply) so the
   * parent can append them to threadItems, keeping the unified chronological order.
   */
  onFollowUpMessage?: (role: "user" | "assistant", text: string) => void;
}

const CONTEXTUAL_PROMPTS: Partial<Record<Category, [string, string, string]>> = {
  "pop-culture": ["what's the backstory?", "another pop update", "what are fans saying?"],
  finance: ["market angle?", "company context?", "consumer impact?"],
  technology: ["product details?", "why does this matter?", "what's next for this?"],
  general: ["quick recap?", "broader context?", "key takeaway?"],
  world: ["regional context?", "who's involved?", "global reaction?"],
  sports: ["player breakdown?", "what's the impact?", "who won?"],
};

const DEFAULT_CONTEXTUAL_PROMPTS: [string, string, string] = [
  "tell me more",
  "why does this matter?",
  "what's next?",
];

function getContextualPrompts(category: Category | undefined): [string, string, string] {
  if (!category) return DEFAULT_CONTEXTUAL_PROMPTS;
  return CONTEXTUAL_PROMPTS[category] ?? DEFAULT_CONTEXTUAL_PROMPTS;
}

function BirdAvatar({ className = "w-13 h-13 mt-1" }: { className?: string }) {
  return (
    <div
      className={`rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${className}`}
      style={{ backgroundColor: "var(--chirpie-muted)" }}
      aria-hidden="true"
    >
      <Image
        src="/bird-logo.png"
        alt=""
        width={44}
        height={44}
        className="w-11 h-11 object-contain"
      />
    </div>
  );
}

function storyToneToApiTone(tone: Tone): "gen_z" | "professional" | "casual" {
  const map: Record<Tone, "gen_z" | "professional" | "casual"> = {
    "gen-z": "gen_z",
    professional: "professional",
    casual: "casual",
    minimal: "casual",
  };
  return map[tone] ?? "casual";
}

function localFollowUpReply(question: string, story: Story | null): string {
  if (!story) {
    return "Pick a topic above and I can answer questions about that story.";
  }

  const q = question.toLowerCase();

  if (q.includes("why") || q.includes("matter") || q.includes("important")) {
    return story.whyItMatters;
  }

  if (
    q.includes("more") ||
    q.includes("background") ||
    q.includes("context") ||
    q.includes("backstory")
  ) {
    const pts = story.keyPoints.filter(Boolean);
    return pts.length >= 2 ? `${pts[0]} ${pts[1]}` : story.chatOpening;
  }

  if (q.includes("next") || q.includes("happen")) {
    return story.keyPoints[2] ?? story.whyItMatters;
  }

  return story.keyPoints[0] ?? story.whyItMatters;
}

async function fetchFollowUpReply(question: string, story: Story | null): Promise<string> {
  if (!story) return localFollowUpReply(question, null);

  try {
    const res = await fetch("/api/story-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "follow_up",
        headline: story.headline,
        chatOpening: story.chatOpening,
        whyItMatters: story.whyItMatters,
        keyPoints: story.keyPoints,
        tonePreference: storyToneToApiTone(story.tone),
        userQuestion: question,
        sourceUrl: story.sources[0]?.url,
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = (await res.json()) as { text?: string };
    const text = data?.text?.trim();
    return text || localFollowUpReply(question, story);
  } catch {
    return localFollowUpReply(question, story);
  }
}

export function ConversationThread({
  greeting,
  threadItems,
  isLoading,
  topicOptions,
  onTopicSelect,
  storyChips,
  onStoryChipSelect,
  nextSuggestionChip,
  onNextStory,
  onTypedComposerIntent,
  onFollowUpMessage,
}: ConversationThreadProps) {
  const hasItems = threadItems.length > 0;
  const isGuidedMode = !!(topicOptions?.length && onTopicSelect);

  const lastStory = [...threadItems].reverse().find((i) => i.type === "story");
  const storyCategory: Category | undefined =
    lastStory?.type === "story" ? lastStory.story.category : undefined;

  const contextualPrompts = getContextualPrompts(storyCategory);

  // isTypingReply: shows a local typing indicator during follow-up API calls.
  // Follow-up messages themselves are pushed into threadItems via onFollowUpMessage
  // so they stay in chronological order alongside stories and searches.
  const [isTypingReply, setIsTypingReply] = useState(false);
  const [input, setInput] = useState("");
  const [showEndPrompts, setShowEndPrompts] = useState(false);

  // Guard against concurrent submitMessage calls (e.g. rapid chip taps).
  // A ref (not state) is used so changes never trigger a re-render cycle.
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    setShowEndPrompts(false);
    if (isLoading || !hasItems) return;
    const t = setTimeout(() => setShowEndPrompts(true), 2500);
    return () => clearTimeout(t);
  }, [isLoading, hasItems, threadItems.length]);

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadItems, isLoading, isTypingReply]);

  const stagedStatus = useStagedStatus(isLoading);

  function handleTopicChipSelect(option: TopicOption) {
    onTopicSelect?.(option.id);
  }

  function handleStoryChipSelect(chip: StoryChip) {
    onStoryChipSelect?.(chip.id);
  }

  async function submitMessage(text: string) {
    if (!text.trim()) return;

    const cleanText = text.trim();
    setInput("");
    setShowEndPrompts(false);

    // Let the parent router decide first (search, navigation, topic switch).
    // If the parent handles it, its own isLoading indicator takes over — we
    // must NOT also set isTypingReply or push an extra user bubble here.
    const handled = await onTypedComposerIntent?.(cleanText);
    if (handled) return;

    // Pure follow-up path: push user message + eventual reply into threadItems
    // via onFollowUpMessage so they stay in correct chronological position
    // relative to any future stories added by the parent.
    setIsTypingReply(true);
    try {
      onFollowUpMessage?.("user", cleanText);

      const story = lastStory?.type === "story" ? lastStory.story : null;
      const replyText = await fetchFollowUpReply(cleanText, story);

      onFollowUpMessage?.("assistant", replyText);
    } finally {
      setIsTypingReply(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitMessage(input);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-6 space-y-5">
        <DigestIntroMessage greeting={greeting} />

        <AnimatePresence>
          {isGuidedMode && !hasItems && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.22 } }}
              transition={{ duration: 0.45, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-start gap-2.5"
            >
              <BirdAvatar />
              <div
                className="px-4 py-3 rounded-2xl rounded-bl-sm"
                style={{
                  backgroundColor: "var(--chirpie-bubble-assistant)",
                  color: "var(--chirpie-bubble-assistant-foreground)",
                  boxShadow: "0 3px 14px 0 var(--chirpie-shadow)",
                }}
              >
                <p className="text-sm mb-3">what would you like to talk about today?</p>

                <div className="flex flex-wrap gap-2">
                  {topicOptions!.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleTopicChipSelect(opt)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill border text-xs font-medium transition-all hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      style={{
                        backgroundColor: "var(--chirpie-chip)",
                        color: "var(--chirpie-chip-foreground)",
                        borderColor: "var(--chirpie-border)",
                      }}
                    >
                      <span>{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {storyChips && storyChips.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.1 }}
                      className="flex flex-wrap gap-2 mt-2.5 pt-2.5 border-t"
                      style={{ borderColor: "var(--chirpie-border)" }}
                    >
                      <span
                        className="w-full text-[10px] font-semibold uppercase tracking-wider mb-0.5"
                        style={{ color: "var(--chirpie-muted-foreground)" }}
                      >
                        Or pick a story
                      </span>
                      {storyChips.map((chip) => (
                        <button
                          key={chip.id}
                          onClick={() => handleStoryChipSelect(chip)}
                          className="px-3 py-1.5 rounded-pill border text-xs font-medium transition-all hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          style={{
                            backgroundColor: "var(--chirpie-background)",
                            color: "var(--chirpie-foreground)",
                            borderColor: "var(--chirpie-border)",
                          }}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── All messages in one unified chronological block ──────────────────────
            threadItems contains: user-messages, stories, assistant-messages, and
            follow-up pairs — all appended in arrival order by the parent. */}
        <AnimatePresence initial={false}>
          {threadItems.map((item) => {
            if (item.type === "user-message") {
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="flex justify-end"
                >
                  <div
                    className="max-w-[75%] px-4 py-2.5 text-sm leading-relaxed"
                    style={{
                      backgroundColor: "var(--chirpie-bubble-user)",
                      color: "var(--chirpie-bubble-user-foreground)",
                      borderRadius: "1rem 1rem 0.25rem 1rem",
                      boxShadow: "0 3px 14px 0 var(--chirpie-shadow)",
                    }}
                  >
                    {item.text}
                  </div>
                </motion.div>
              );
            }

            if (item.type === "story") {
              return (
                <StoryBubble
                  key={item.id}
                  story={item.story}
                  delay={0.2}
                  onFollowUp={(prompt) => submitMessage(prompt)}
                />
              );
            }

            if (item.type === "assistant-message") {
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-start gap-2.5"
                >
                  <BirdAvatar />
                  <div
                    className="max-w-[80%] px-4 py-3 text-sm leading-relaxed rounded-2xl rounded-bl-sm"
                    style={{
                      backgroundColor: "var(--chirpie-bubble-assistant)",
                      color: "var(--chirpie-bubble-assistant-foreground)",
                      boxShadow: "0 3px 14px 0 var(--chirpie-shadow)",
                    }}
                  >
                    {item.text}
                  </div>
                </motion.div>
              );
            }

            return null;
          })}
        </AnimatePresence>

        {/* Parent-controlled loading indicator (topic switch / story search) */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-1.5"
            >
              <TypingIndicator />
              <motion.p
                key={stagedStatus}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="text-[11px] pl-9"
                style={{ color: "var(--chirpie-muted-foreground)" }}
              >
                {stagedStatus}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Post-story continuation prompts */}
        <AnimatePresence>
          {showEndPrompts && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-start gap-2.5"
            >
              <BirdAvatar />
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  {contextualPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => submitMessage(prompt)}
                      className="px-3 py-1.5 rounded-pill text-xs font-medium transition-all hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      style={{
                        backgroundColor: "var(--chirpie-chip)",
                        color: "var(--chirpie-chip-foreground)",
                      }}
                    >
                      {prompt}
                    </button>
                  ))}

                  {nextSuggestionChip && (
                    <button
                      onClick={() => submitMessage("new news")}
                      className="px-3 py-1.5 rounded-pill text-xs font-medium transition-all hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      style={{
                        backgroundColor: "var(--chirpie-accent)",
                        color: "var(--chirpie-accent-foreground)",
                      }}
                    >
                      {nextSuggestionChip.label} →
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Follow-up typing indicator (local, only during /api/story-action calls) */}
        <AnimatePresence>
          {isTypingReply && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <TypingIndicator />
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      <AnimatePresence>
        {hasItems && isGuidedMode && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-shrink-0 px-4 pt-2 pb-1 flex items-center gap-1.5 overflow-x-auto scrollbar-hide border-t"
            style={{ borderColor: "var(--chirpie-border)" }}
          >
            <span
              className="text-[10px] font-semibold uppercase tracking-wider flex-shrink-0"
              style={{ color: "var(--chirpie-muted-foreground)" }}
            >
              switch:
            </span>
            {topicOptions!.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleTopicChipSelect(opt)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-pill border text-[11px] font-medium flex-shrink-0 transition-all hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{
                  backgroundColor: "var(--chirpie-chip)",
                  color: "var(--chirpie-chip-foreground)",
                  borderColor: "var(--chirpie-border)",
                }}
              >
                <span>{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="border-t px-4 py-3 flex-shrink-0"
        style={{
          borderColor: "var(--chirpie-border)",
          backgroundColor: "var(--chirpie-background)",
        }}
      >
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a follow-up."
            className="flex-1 px-4 py-2.5 rounded-pill border text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
            style={{
              backgroundColor: "var(--chirpie-input)",
              borderColor: "var(--chirpie-border)",
              color: "var(--chirpie-foreground)",
            }}
          />
          <motion.button
            type="submit"
            disabled={!input.trim()}
            whileHover={{ scale: input.trim() ? 1.06 : 1 }}
            whileTap={{ scale: 0.94 }}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
            style={{
              backgroundColor: "var(--chirpie-primary)",
              color: "var(--chirpie-primary-foreground)",
            }}
            aria-label="Send message"
          >
            <Send size={16} />
          </motion.button>
        </form>
      </div>
    </div>
  );
}
