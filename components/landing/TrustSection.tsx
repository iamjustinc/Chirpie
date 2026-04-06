"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Link2, AlignLeft, BookOpen } from "lucide-react";

const trustPoints = [
  {
    icon: ShieldCheck,
    title: "Every story is source-linked",
    description:
      "Chirpie never summarizes without attribution. Every digest item shows you exactly where the information came from, with a direct link to the original reporting.",
  },
  {
    icon: AlignLeft,
    title: "Summary and source are kept separate",
    description:
      "Chirpie's voice is clearly Chirpie's. Source quotes are never blended into AI summaries without distinction. What's reported versus what's synthesized is always clear.",
  },
  {
    icon: Link2,
    title: "Read the original in one tap",
    description:
      "Every story has a 'Read original' button. Chirpie is a starting point, not a ceiling. Going deeper is always one tap away.",
  },
  {
    icon: BookOpen,
    title: "Finance gets extra care",
    description:
      "Finance stories use a calmer, more factual tone. Chirpie presents context, not advice. No price predictions, no investment recommendations.",
  },
];

const sources = [
  "Reuters",
  "AP News",
  "BBC",
  "The Guardian",
  "Wall Street Journal",
  "Pitchfork",
  "Bloomberg",
  "NPR",
];

export function TrustSection() {
  return (
    <section
      className="py-20 px-4"
      style={{ backgroundColor: "var(--chirpie-muted)" }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <p
            className="text-xs uppercase tracking-widest font-semibold mb-3"
            style={{ color: "var(--chirpie-accent)" }}
          >
            Trust by design
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
            You always know where it came from
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto text-balance">
            Chirpie doesn't replace journalism. It helps you find the stories
            worth reading, then takes you to the people who reported them.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5 mb-12">
          {trustPoints.map((point, i) => {
            const Icon = point.icon;
            return (
              <motion.div
                key={point.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="flex gap-4 p-5 rounded-2xl border"
                style={{
                  backgroundColor: "var(--chirpie-card)",
                  borderColor: "var(--chirpie-border)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: "var(--chirpie-chip)",
                    color: "var(--chirpie-chip-foreground)",
                  }}
                >
                  <Icon size={16} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground mb-1">
                    {point.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {point.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Source logos */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-5 uppercase tracking-widest">
            Pulling from trusted outlets
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {sources.map((source) => (
              <span
                key={source}
                className="px-3 py-1.5 rounded-pill border text-xs font-medium"
                style={{
                  borderColor: "var(--chirpie-border)",
                  color: "var(--chirpie-muted-foreground)",
                  backgroundColor: "var(--chirpie-card)",
                }}
              >
                {source}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
