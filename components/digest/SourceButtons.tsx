"use client";

import { motion } from "framer-motion";
import { ExternalLink, Clock } from "lucide-react";
import type { StorySource } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

interface SourceButtonsProps {
  sources: StorySource[];
}

const sourceTypeIcon: Record<string, string> = {
  newspaper: "📰",
  wire: "📡",
  magazine: "📖",
  blog: "✍️",
  broadcast: "📺",
};

export function SourceButtons({ sources }: SourceButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {sources.map((source, i) => (
        <motion.a
          key={i}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.06 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill border text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{
            backgroundColor: "var(--chirpie-card)",
            borderColor: "var(--chirpie-border)",
            color: "var(--chirpie-foreground)",
          }}
        >
          <span>{sourceTypeIcon[source.sourceType] ?? "📄"}</span>
          <span>{source.name}</span>
          <ExternalLink size={10} className="opacity-50" />
        </motion.a>
      ))}
    </div>
  );
}

// ─── Compact source attribution line ─────────────────────────────────────────

interface SourceLineProps {
  sources: StorySource[];
  publishedAt: string;
}

export function SourceLine({ sources, publishedAt }: SourceLineProps) {
  const names = sources.map((s) => s.name).join(", ");
  return (
    <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--chirpie-muted-foreground)" }}>
      <Clock size={10} />
      <span>{formatRelativeTime(publishedAt)}</span>
      <span>·</span>
      <span>via {names}</span>
    </div>
  );
}
