"use client";

import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Choose what matters to you",
    description:
      "Pick your interests — general news, pop culture, finance. Select a tone that fits how you like to read. Chirpie remembers your choices.",
    icon: "🎯",
  },
  {
    number: "02",
    title: "Chirpie crafts your digest",
    description:
      "Every morning (or week), Chirpie pulls from trusted sources, distills the key stories, and writes them in your preferred style. No bloat.",
    icon: "✨",
  },
  {
    number: "03",
    title: "Read it like a conversation",
    description:
      "Stories arrive as chat messages — casual, sequenced, and human-feeling. Tap to go deeper, ask follow-ups, or read the original source.",
    icon: "💬",
  },
  {
    number: "04",
    title: "Save, share, and come back",
    description:
      "Bookmark stories, share your digest, and let Chirpie learn what resonates. The more you interact, the sharper it gets.",
    icon: "🔖",
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <p
            className="text-xs uppercase tracking-widest font-semibold mb-3"
            style={{ color: "var(--chirpie-accent)" }}
          >
            How it works
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
            News, redesigned for how you actually read
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto text-balance">
            Not another news aggregator. Not another AI summary tool. Something
            genuinely different.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative p-6 rounded-2xl border card-shadow"
              style={{
                backgroundColor: "var(--chirpie-card)",
                borderColor: "var(--chirpie-border)",
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ backgroundColor: "var(--chirpie-muted)" }}
                >
                  {step.icon}
                </div>
                <div>
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest mb-1"
                    style={{ color: "var(--chirpie-accent)" }}
                  >
                    Step {step.number}
                  </p>
                  <h3 className="font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
