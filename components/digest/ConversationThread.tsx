"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send } from "lucide-react";
import Image from "next/image";
import type { Category, ThreadItem } from "@/lib/types";
import { DigestIntroMessage } from "./DigestIntroMessage";
import { StoryBubble } from "./StoryBubble";
import { TypingIndicator } from "./TypingIndicator";
import { useStagedStatus } from "@/lib/hooks/use-staged-status";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
}

interface TopicOption {
  id: Category;
  label: string;
  icon: string;
}

/**
 * A specific story suggestion chip (distinct from broad topic chips).
 */
export interface StoryChip {
  id: string;
  label: string;
}

interface ConversationThreadProps {
  greeting: string;
  threadItems: ThreadItem[];
  /**
   * True while a topic/story fetch is in progress. Shows typing indicator.
   */
  isLoading: boolean;
  /**
   * Broad category options — shown in the initial selection bubble and as a
   * persistent compact switcher row once the thread has items.
   */
  topicOptions?: TopicOption[];
  onTopicSelect?: (category: Category) => void;
  /**
   * Specific story suggestion chips shown in the initial selection bubble.
   */
  storyChips?: StoryChip[];
  onStoryChipSelect?: (id: string) => void;
  /**
   * The next story to suggest after the user has seen one story.
   */
  nextSuggestionChip?: StoryChip;
}

// ─── Contextual in-thread continuation prompts ────────────────────────────────

const CONTEXTUAL_PROMPTS: Partial<Record<Category, [string, string, string]>> = {
  "pop-culture": ["what's the backstory?", "another pop update", "what are fans saying?"],
  finance:       ["market angle?", "company context?", "consumer impact?"],
  technology:    ["product details?", "why does this matter?", "what's next for this?"],
  general:       ["quick recap?", "broader context?", "key takeaway?"],
  world:         ["regional context?", "who's involved?", "global reaction?"],
  sports:        ["player breakdown?", "what's the impact?", "who won?"],
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

// ─── Bird avatar (reused in several places) ───────────────────────────────────

function BirdAvatar({ className = "w-7 h-7 mt-1" }: { className?: string }) {
  return (
    <div
      className={`rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${className}`}
      style={{ backgroundColor: "var(--chirpie-muted)" }}
      aria-hidden="true"
    >
      <Image src="/bird-logo.png" alt="" width={24} height={24} className="w-5 h-5 object-contain" />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConversationThread({
  greeting,
  threadItems,
  isLoading,
  topicOptions,
  onTopicSelect,
  storyChips,
  onStoryChipSelect,
  nextSuggestionChip,
}: ConversationThreadProps) {
  const hasItems = threadItems.length > 0;
  const isGuidedMode = !!(topicOptions?.length && onTopicSelect);

  // Derive active category from the last story in the thread
  const lastStory = [...threadItems].reverse().find((i) => i.type === "story");
  const storyCategory: Category | undefined =
    lastStory?.type === "story" ? lastStory.story.category : undefined;

  const contextualPrompts = getContextualPrompts(storyCategory);

  // ── Internal follow-up conversation (typed messages after stories load) ──────
  const [extraMessages, setExtraMessages] = useState<Message[]>([]);
  const [isTypingReply, setIsTypingReply] = useState(false);
  const [input, setInput] = useState("");

  // ── Post-story continuation prompts ──────────────────────────────────────────
  const [showEndPrompts, setShowEndPrompts] = useState(false);

  // Show end prompts 2.5s after load finishes, reset whenever thread changes or loading starts
  useEffect(() => {
    setShowEndPrompts(false);
    if (isLoading || !hasItems) return;
    const t = setTimeout(() => setShowEndPrompts(true), 2500);
    return () => clearTimeout(t);
  }, [isLoading, hasItems, threadItems.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-scroll ───────────────────────────────────────────────────────────────
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadItems, extraMessages, isLoading, isTypingReply]);

  // Staged status text shown while Chirpie is "thinking"
  const stagedStatus = useStagedStatus(isLoading);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleTopicChipSelect(option: TopicOption) {
    onTopicSelect?.(option.id);
  }

  function handleStoryChipSelect(chip: StoryChip) {
    onStoryChipSelect?.(chip.id);
  }

  function submitMessage(text: string) {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      text: text.trim(),
    };

    setExtraMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTypingReply(true);
    setShowEndPrompts(false);

    setTimeout(() => {
      setIsTypingReply(false);
      const reply: Message = {
        id: `msg-${Date.now()}-reply`,
        role: "assistant",
        text: getMockReply(text),
      };
      setExtraMessages((prev) => [...prev, reply]);
    }, 1600);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitMessage(input);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* ── Thread scroll area ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-6 space-y-5">
        {/* Greeting */}
        <DigestIntroMessage greeting={greeting} />

        {/* ── Initial guided selection — only before first thread item ─────────── */}
        {isGuidedMode && !hasItems && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
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

              {/* Broad topic chips */}
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

              {/* Story suggestion chips */}
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

        {/* ── Thread items ───────────────────────────────────────────────────────── */}
        <AnimatePresence initial={false}>
          {threadItems.map((item) => {
            if (item.type === "user-message") {
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
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
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
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

        {/* ── Typing indicator (parent-controlled fetch) ─────────────────────────── */}
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

        {/* ── Post-story continuation prompts ────────────────────────────────────── */}
        <AnimatePresence>
          {showEndPrompts && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-start gap-2.5"
            >
              <BirdAvatar />
              <div
                className="px-4 py-3 rounded-2xl rounded-bl-sm text-sm"
                style={{
                  backgroundColor: "var(--chirpie-bubble-assistant)",
                  color: "var(--chirpie-bubble-assistant-foreground)",
                  boxShadow: "0 3px 14px 0 var(--chirpie-shadow)",
                }}
              >
                <p className="mb-2">want to go deeper on this one?</p>
                <div className="flex flex-wrap gap-2">
                  {contextualPrompts.slice(0, 2).map((p) => (
                    <button
                      key={p}
                      onClick={() => submitMessage(p)}
                      className="px-3 py-1 rounded-pill border text-xs font-medium transition-all hover:opacity-80"
                      style={{
                        backgroundColor: "var(--chirpie-chip)",
                        color: "var(--chirpie-chip-foreground)",
                        borderColor: "var(--chirpie-border)",
                      }}
                    >
                      {p}
                    </button>
                  ))}
                  {nextSuggestionChip && (
                    <button
                      onClick={() => handleStoryChipSelect(nextSuggestionChip)}
                      className="px-3 py-1 rounded-pill text-xs font-semibold transition-all hover:opacity-80"
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

        {/* ── Internal follow-up messages (typed by user) ───────────────────────── */}
        <AnimatePresence initial={false}>
          {extraMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className={`flex ${msg.role === "user" ? "justify-end" : "items-start gap-2.5"}`}
            >
              {msg.role === "assistant" && <BirdAvatar />}
              <div
                className="max-w-[80%] px-4 py-3 text-sm leading-relaxed"
                style={{
                  backgroundColor:
                    msg.role === "user"
                      ? "var(--chirpie-bubble-user)"
                      : "var(--chirpie-bubble-assistant)",
                  color:
                    msg.role === "user"
                      ? "var(--chirpie-bubble-user-foreground)"
                      : "var(--chirpie-bubble-assistant-foreground)",
                  borderRadius:
                    msg.role === "user"
                      ? "1rem 1rem 0.25rem 1rem"
                      : "1rem 1rem 1rem 0.25rem",
                  boxShadow: "0 3px 14px 0 var(--chirpie-shadow)",
                }}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator for internal replies */}
        <AnimatePresence>
          {isTypingReply && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <TypingIndicator />
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* ── Persistent topic switcher — visible once thread has items ─────────────── */}
      <AnimatePresence>
        {hasItems && isGuidedMode && !isLoading && (
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

      {/* ── Composer ──────────────────────────────────────────────────────────────── */}
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
            placeholder="Ask a follow-up..."
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

// ─── Mock reply generator ─────────────────────────────────────────────────────

function getMockReply(prompt: string): string {
  const p = prompt.toLowerCase();

  if (p.includes("fed") || p.includes("rate") || p.includes("interest") || p.includes("market angle") || p.includes("consumer impact")) {
    return "A rate hold means the Fed is keeping borrowing costs where they are — expensive. The hope was for a cut to ease mortgage and loan rates, but inflation in services is still sticky. Next decision is in about six weeks.";
  }
  if (p.includes("beyoncé") || p.includes("album") || p.includes("music") || p.includes("fans") || p.includes("pop")) {
    return "The album blends country, R&B, and orchestral pop — it's a genre statement as much as a music release. No traditional promo cycle, which made the surprise drop hit even harder. Three visual films are rolling out through the week.";
  }
  if (p.includes("climate") || p.includes("agreement") || p.includes("binding") || p.includes("broader context")) {
    return "Binding means countries that miss targets face trade consequences — tariffs, restricted market access. That's different from past agreements where failure had no real penalty. The first review period is 2027, so we'll see if it holds.";
  }
  if (p.includes("gpt") || p.includes("openai") || p.includes("ai") || p.includes("product details") || p.includes("what's next for")) {
    return "GPT-5 combines text, voice, and live video in one model — no switching between modes. The main unlock is real-time vision: you can point your camera at something and ask questions live. It's in rollout for Plus subscribers starting today.";
  }
  if (p.includes("backstory") || p.includes("company context") || p.includes("who's involved")) {
    return "Good question — the background here is the key context. Once the live AI layer is fully connected, I'll give you a real deep-dive. For now, the source links in each story are your best next step.";
  }
  if (p.includes("recap") || p.includes("key takeaway") || p.includes("why does this matter")) {
    return "The short version: this one has real downstream effects. I'd dig into that with you — once the live AI layer is connected, I'll give you a full breakdown. The source links are a good starting point.";
  }
  if (p.includes("deeper") || p.includes("more")) {
    return "Sure — which story do you want to explore further? The climate summit, the Fed decision, or the Beyoncé album drop?";
  }
  if (p.includes("tomorrow") || p.includes("morning") || p.includes("next")) {
    return "Your next digest is scheduled for tomorrow morning. I'll have fresh stories ready — same vibe, all new.";
  }

  return "Good question. I'd dig into that with you — once the live AI layer is connected, I'll give you a real answer. For now, the source links in each story are your best next step.";
}
