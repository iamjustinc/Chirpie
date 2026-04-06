"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { themeList } from "@/lib/themes";
import type { ThemeId } from "@/lib/types";
import { useTheme } from "@/components/theme/ThemeProvider";

const previewMessages = [
  { role: "assistant" as const, text: "Good morning. Here's what's worth knowing today." },
  { role: "assistant" as const, text: "The climate summit wrapped up with something rare: a binding agreement, with actual teeth." },
  { role: "user" as const, text: "What does binding actually mean here?" },
  { role: "assistant" as const, text: "It means countries that miss targets face trade consequences — not just diplomatic pressure. That's the new part." },
];

export function ThemePreviewSection() {
  const { themeId, setTheme } = useTheme();
  const [previewId, setPreviewId] = useState<ThemeId>(themeId);

  const previewTheme = themeList.find((t) => t.id === previewId) ?? themeList[0];

  function handleSelect(id: ThemeId) {
    setPreviewId(id);
  }

  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p
            className="text-xs uppercase tracking-widest font-semibold mb-3"
            style={{ color: "var(--chirpie-accent)" }}
          >
            Themes
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
            Make it yours
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto text-balance">
            Switch themes anytime. Each one feels different — same smart digest,
            completely different vibe.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Theme selector */}
          <div className="grid grid-cols-2 gap-3">
            {themeList.map((t) => (
              <motion.button
                key={t.id}
                onClick={() => handleSelect(t.id as ThemeId)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="p-3 rounded-2xl border-2 text-left transition-all duration-200 focus:outline-none"
                style={{
                  borderColor:
                    previewId === t.id
                      ? "var(--chirpie-foreground)"
                      : "var(--chirpie-border)",
                  backgroundColor: "var(--chirpie-card)",
                  boxShadow:
                    previewId === t.id
                      ? "4px 5px 0 0 var(--chirpie-border)"
                      : "none",
                }}
              >
                <div className="flex h-6 rounded-lg overflow-hidden mb-2">
                  {t.previewColors.map((c, i) => (
                    <div key={i} className="flex-1" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <p className="text-xs font-semibold text-foreground">{t.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                  {t.description}
                </p>
              </motion.button>
            ))}
          </div>

          {/* Live preview */}
          <motion.div
            key={previewId}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="rounded-3xl border overflow-hidden"
            style={{
              backgroundColor: previewTheme.tokens.background,
              borderColor: previewTheme.tokens.border,
              boxShadow: `4px 6px 0 0 ${previewTheme.tokens.border}`,
            }}
          >
            {/* Preview header */}
            <div
              className="flex items-center gap-2 px-4 py-3 border-b text-xs font-semibold"
              style={{
                borderColor: previewTheme.tokens.border,
                color: previewTheme.tokens.foreground,
                backgroundColor: previewTheme.tokens.card,
              }}
            >
              <span>🐦</span>
              <span>Chirpie</span>
              <span
                className="ml-auto px-2 py-0.5 rounded-pill text-[10px]"
                style={{
                  backgroundColor: previewTheme.tokens.chip,
                  color: previewTheme.tokens.chipForeground,
                }}
              >
                Daily Digest
              </span>
            </div>

            {/* Preview messages */}
            <div className="flex flex-col gap-2.5 p-4">
              {previewMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className="max-w-[82%] px-3 py-2 text-xs leading-relaxed"
                    style={{
                      backgroundColor:
                        msg.role === "user"
                          ? previewTheme.tokens.bubbleUser
                          : previewTheme.tokens.bubbleAssistant,
                      color:
                        msg.role === "user"
                          ? previewTheme.tokens.bubbleUserForeground
                          : previewTheme.tokens.bubbleAssistantForeground,
                      borderRadius:
                        msg.role === "user"
                          ? "1rem 1rem 0.25rem 1rem"
                          : "1rem 1rem 1rem 0.25rem",
                      boxShadow: `0 2px 8px 0 ${previewTheme.tokens.shadow}`,
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Apply button */}
            <div className="px-4 pb-4">
              <motion.button
                onClick={() => setTheme(previewId as ThemeId)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-2 rounded-pill text-xs font-semibold transition-all"
                style={{
                  backgroundColor: previewTheme.tokens.primary,
                  color: previewTheme.tokens.primaryForeground,
                }}
              >
                {themeId === previewId ? "Current theme" : `Apply ${previewTheme.name}`}
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
