"use client";

import { motion } from "framer-motion";
import type { Digest } from "@/lib/types";

interface DigestIntroMessageProps {
  digest: Digest;
  /** When false, hides the "Today's stories" divider — useful in guided/topic-selection mode. */
  showDivider?: boolean;
}

export function DigestIntroMessage({ digest, showDivider = true }: DigestIntroMessageProps) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-2.5">
      {/* Date badge */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex justify-center"
      >
        <span
          className="px-3 py-1 rounded-pill text-[10px] font-semibold uppercase tracking-wider"
          style={{
            backgroundColor: "var(--chirpie-muted)",
            color: "var(--chirpie-muted-foreground)",
          }}
        >
          {today}
        </span>
      </motion.div>

      {/* Greeting bubble */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-end gap-2.5"
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
          style={{ backgroundColor: "var(--chirpie-muted)" }}
        >
          🐦
        </div>
        <div
          className="px-4 py-3 rounded-2xl rounded-bl-sm max-w-[82%]"
          style={{
            backgroundColor: "var(--chirpie-bubble-assistant)",
            color: "var(--chirpie-bubble-assistant-foreground)",
            boxShadow: "0 3px 14px 0 var(--chirpie-shadow)",
          }}
        >
          <p className="text-sm font-semibold">{digest.greeting}</p>
        </div>
      </motion.div>

      {/* Intro message bubble — only shown when intro text is present */}
      {digest.intro && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-end gap-2.5 pl-10"
        >
          <div
            className="px-4 py-3 rounded-2xl rounded-bl-sm max-w-[88%]"
            style={{
              backgroundColor: "var(--chirpie-bubble-assistant)",
              color: "var(--chirpie-bubble-assistant-foreground)",
              boxShadow: "0 3px 14px 0 var(--chirpie-shadow)",
            }}
          >
            <p className="text-sm leading-relaxed">{digest.intro}</p>
          </div>
        </motion.div>
      )}

      {/* Divider — hidden in guided/topic-selection mode */}
      {showDivider && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-3 px-1 py-1"
        >
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--chirpie-border)" }} />
          <span
            className="text-[10px] font-medium uppercase tracking-widest"
            style={{ color: "var(--chirpie-muted-foreground)" }}
          >
            Today's stories
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--chirpie-border)" }} />
        </motion.div>
      )}
    </div>
  );
}
