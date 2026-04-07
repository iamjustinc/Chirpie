"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send } from "lucide-react";
import type { Digest } from "@/lib/types";
import type { Category } from "@/lib/types";
import { DigestIntroMessage } from "./DigestIntroMessage";
import { StoryBubble } from "./StoryBubble";
import { TypingIndicator } from "./TypingIndicator";
import { useStagedStatus } from "@/lib/hooks/use-staged-status";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}

interface ConversationThreadProps {
  digest: Digest;
  /**
   * When true, reveals digest items one at a time with contextual follow-up
   * prompts between each story instead of rendering all items at once.
   */
  pacedMode?: boolean;
  /**
   * The active UI category — drives which contextual continuation prompts
   * appear in the thread after a story. Not the same as the category switcher.
   */
  storyCategory?: Category;
}

// ─── End-of-digest prompts ────────────────────────────────────────────────────

const endOfDigestPrompts = [
  "Want a deeper look at any of these?",
  "Catch me tomorrow morning?",
];

// ─── Contextual in-thread continuation prompts ────────────────────────────────
// These appear after the lead story and are conversational continuations,
// NOT a duplicate of the top-level category switcher.

const CONTEXTUAL_PROMPTS: Partial<Record<Category, [string, string, string]>> = {
  "pop-culture": [
    "what's the backstory?",
    "another pop update",
    "what are fans saying?",
  ],
  finance: [
    "market angle?",
    "company context?",
    "consumer impact?",
  ],
  technology: [
    "product details?",
    "why does this matter?",
    "what's next for this?",
  ],
  general: [
    "quick recap?",
    "broader context?",
    "key takeaway?",
  ],
  world: [
    "regional context?",
    "who's involved?",
    "global reaction?",
  ],
  sports: [
    "player breakdown?",
    "what's the impact?",
    "who won?",
  ],
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

// ─── Component ────────────────────────────────────────────────────────────────

export function ConversationThread({
  digest,
  pacedMode = false,
  storyCategory,
}: ConversationThreadProps) {
  const totalItems = digest.items.length;

  // In paced mode start with 1 revealed; in normal mode reveal all immediately
  const [revealedCount, setRevealedCount] = useState(pacedMode ? 1 : totalItems);
  const [extraMessages, setExtraMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [input, setInput] = useState("");
  const [showEndPrompts, setShowEndPrompts] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Reset pacing when the digest changes (e.g. category switch or live/mock toggle)
  useEffect(() => {
    setRevealedCount(pacedMode ? 1 : digest.items.length);
    setExtraMessages([]);
    setShowEndPrompts(false);
  }, [digest.id, pacedMode, digest.items.length]);

  // Show end-of-digest prompts once all stories are visible
  useEffect(() => {
    const allRevealed = revealedCount >= totalItems;
    if (!allRevealed) return;
    const t = setTimeout(() => setShowEndPrompts(true), 2500);
    return () => clearTimeout(t);
  }, [revealedCount, totalItems]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [extraMessages, isTyping, revealedCount]);

  // Staged status text shown below TypingIndicator
  const stagedStatus = useStagedStatus(isTyping);

  function handleFollowUp(prompt: string) {
    submitMessage(prompt);
  }

  // Called when user taps a contextual continuation chip in paced mode.
  // Submits the prompt text as a message AND reveals the next digest item if available.
  function handleContextualPrompt(prompt: string) {
    if (revealedCount < totalItems) {
      setRevealedCount((c) => c + 1);
    }
    submitMessage(prompt);
  }

  function submitMessage(text: string) {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setExtraMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setShowEndPrompts(false);

    setTimeout(() => {
      setIsTyping(false);
      const reply: Message = {
        id: `msg-${Date.now()}-reply`,
        role: "assistant",
        text: getMockReply(text),
        timestamp: new Date().toISOString(),
      };
      setExtraMessages((prev) => [...prev, reply]);
    }, 1600);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitMessage(input);
  }

  const visibleItems = digest.items.slice(0, revealedCount);
  const allRevealed = revealedCount >= totalItems;
  // Show contextual prompts after the lead story, only in paced mode, only when not all revealed
  const showContextualPrompts = pacedMode && !allRevealed && extraMessages.length === 0;
  const contextualPrompts = getContextualPrompts(storyCategory);

  return (
    <div className="flex flex-col h-full">
      {/* Thread scroll area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-6 space-y-5">
        {/* Intro */}
        <DigestIntroMessage digest={digest} />

        {/* Stories — revealed progressively in paced mode */}
        {visibleItems.map((item, i) => (
          <StoryBubble
            key={item.id}
            story={item.story}
            delay={i === 0 ? 0.5 : 0.2}
            onFollowUp={handleFollowUp}
          />
        ))}

        {/* Contextual continuation prompts (paced mode, after lead story) */}
        <AnimatePresence>
          {showContextualPrompts && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.6 }}
              className="flex items-start gap-2.5"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-1"
                style={{ backgroundColor: "var(--chirpie-muted)" }}
              >
                🐦
              </div>
              <div
                className="px-4 py-3 rounded-2xl rounded-bl-sm text-sm"
                style={{
                  backgroundColor: "var(--chirpie-bubble-assistant)",
                  color: "var(--chirpie-bubble-assistant-foreground)",
                  boxShadow: "0 3px 14px 0 var(--chirpie-shadow)",
                }}
              >
                <p>want to go deeper on this one?</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {contextualPrompts.map((p) => (
                    <button
                      key={p}
                      onClick={() => handleContextualPrompt(p)}
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
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* End-of-digest prompts (once all stories revealed) */}
        <AnimatePresence>
          {showEndPrompts && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-start gap-2.5"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-1"
                style={{ backgroundColor: "var(--chirpie-muted)" }}
              >
                🐦
              </div>
              <div
                className="px-4 py-3 rounded-2xl rounded-bl-sm text-sm"
                style={{
                  backgroundColor: "var(--chirpie-bubble-assistant)",
                  color: "var(--chirpie-bubble-assistant-foreground)",
                  boxShadow: "0 3px 14px 0 var(--chirpie-shadow)",
                }}
              >
                <p>That's today's digest. Anything you want to dig into further?</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {endOfDigestPrompts.map((p) => (
                    <button
                      key={p}
                      onClick={() => handleFollowUp(p)}
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
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Extra conversation messages */}
        <AnimatePresence initial={false}>
          {extraMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className={`flex ${msg.role === "user" ? "justify-end" : "items-start gap-2.5"}`}
            >
              {msg.role === "assistant" && (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-1"
                  style={{ backgroundColor: "var(--chirpie-muted)" }}
                >
                  🐦
                </div>
              )}
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

        {/* Typing indicator + staged status text */}
        <AnimatePresence>
          {isTyping && (
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

        <div ref={bottomRef} />
      </div>

      {/* Composer */}
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
