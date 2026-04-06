"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface FollowUpChipsProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
}

export function FollowUpChips({ prompts, onSelect }: FollowUpChipsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
      className="flex flex-wrap gap-2 mt-1 pl-9"
    >
      {prompts.map((prompt, i) => (
        <motion.button
          key={prompt}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, delay: i * 0.07 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(prompt)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill border text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{
            backgroundColor: "var(--chirpie-chip)",
            color: "var(--chirpie-chip-foreground)",
            borderColor: "var(--chirpie-border)",
          }}
        >
          {prompt}
          <ArrowRight size={11} />
        </motion.button>
      ))}
    </motion.div>
  );
}
