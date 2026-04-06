"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";
import type { Category, Tone, DigestFrequency, ThemeId, UserPreferences } from "@/lib/types";
import { ThemeCardPicker } from "@/components/theme/ThemeSwitcher";
import { useTheme } from "@/components/theme/ThemeProvider";
import { mockDigest } from "@/lib/mock-data";
import { StoryBubble } from "@/components/digest/StoryBubble";
import { cn } from "@/lib/utils";

// ─── Step config ──────────────────────────────────────────────────────────────

const STEPS = ["interests", "tone", "frequency", "theme", "preview"] as const;
type Step = typeof STEPS[number];

const STEP_LABELS: Record<Step, string> = {
  interests: "What do you follow?",
  tone: "How should I talk to you?",
  frequency: "How often do you want updates?",
  theme: "Pick your look",
  preview: "Here's a taste",
};

// ─── Interest options ─────────────────────────────────────────────────────────

const interestOptions: { value: Category; label: string; icon: string; description: string }[] = [
  { value: "general", label: "General News", icon: "📰", description: "World events, politics, current affairs" },
  { value: "pop-culture", label: "Pop Culture", icon: "🎬", description: "Music, film, celebs, internet moments" },
  { value: "finance", label: "Finance", icon: "📊", description: "Markets, company news, economy" },
  { value: "sports", label: "Sports", icon: "⚽", description: "Scores, trades, highlights" },
  { value: "technology", label: "Technology", icon: "💻", description: "Startups, product launches, AI" },
  { value: "world", label: "World", icon: "🌍", description: "International news and global context" },
];

// ─── Tone options ─────────────────────────────────────────────────────────────

const toneOptions: { value: Tone; label: string; icon: string; sample: string }[] = [
  {
    value: "casual",
    label: "Casual",
    icon: "☀️",
    sample: "The Fed just decided to hold rates — basically they're playing wait-and-see while the economy figures itself out.",
  },
  {
    value: "gen-z",
    label: "Gen Z",
    icon: "✨",
    sample: "Fed said nah to rate cuts again. Inflation not cooperating, markets are coping. This is giving prolonged uncertainty era.",
  },
  {
    value: "professional",
    label: "Professional",
    icon: "📋",
    sample: "The Federal Reserve maintained its benchmark rate at 5.25–5.50%, citing persistent services inflation and mixed economic indicators.",
  },
  {
    value: "minimal",
    label: "Minimal",
    icon: "—",
    sample: "Fed holds rates. Inflation still elevated. Next decision in six weeks.",
  },
];

// ─── Frequency options ────────────────────────────────────────────────────────

const frequencyOptions: { value: DigestFrequency; label: string; icon: string; description: string }[] = [
  {
    value: "daily",
    label: "Daily",
    icon: "☀️",
    description: "Fresh digest every morning. Ideal if you like staying on top of things.",
  },
  {
    value: "weekly",
    label: "Weekly",
    icon: "📅",
    description: "A curated roundup once a week. Great if you prefer the big picture.",
  },
];

// ─── Main Stepper ─────────────────────────────────────────────────────────────

export function OnboardingStepper() {
  const router = useRouter();
  const { setTheme } = useTheme();

  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [prefs, setPrefs] = useState<Partial<UserPreferences>>({
    interests: ["general"],
    tone: "casual",
    frequency: "daily",
    themeId: "classic-chat",
  });

  const currentStep = STEPS[stepIndex];

  function goNext() {
    setDirection(1);
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function goPrev() {
    setDirection(-1);
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  function finish() {
    router.push("/digest");
  }

  function toggleInterest(cat: Category) {
    setPrefs((p) => {
      const current = p.interests ?? [];
      const has = current.includes(cat);
      if (has && current.length === 1) return p; // must keep at least one
      return {
        ...p,
        interests: has ? current.filter((c) => c !== cat) : [...current, cat],
      };
    });
  }

  const canProceed = () => {
    if (currentStep === "interests") return (prefs.interests?.length ?? 0) > 0;
    return true;
  };

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--chirpie-background)" }}>
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-10 h-1" style={{ backgroundColor: "var(--chirpie-border)" }}>
        <motion.div
          className="h-full"
          style={{ backgroundColor: "var(--chirpie-primary)" }}
          animate={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        />
      </div>

      {/* Header */}
      <div className="pt-8 pb-4 px-4 text-center">
        <div className="flex items-center justify-center gap-1.5 mb-6">
          <span className="text-xl">🐦</span>
          <span className="font-bold text-foreground">Chirpie</span>
        </div>
        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className="transition-all duration-300"
              style={{
                width: i === stepIndex ? "20px" : "6px",
                height: "6px",
                borderRadius: "9999px",
                backgroundColor:
                  i <= stepIndex
                    ? "var(--chirpie-primary)"
                    : "var(--chirpie-border)",
              }}
            />
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.h1
            key={currentStep}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="text-2xl font-bold text-foreground"
          >
            {STEP_LABELS[currentStep]}
          </motion.h1>
        </AnimatePresence>
      </div>

      {/* Step content */}
      <div className="flex-1 px-4 pb-28 max-w-lg mx-auto w-full overflow-y-auto">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {currentStep === "interests" && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                {interestOptions.map((opt) => {
                  const selected = prefs.interests?.includes(opt.value);
                  return (
                    <motion.button
                      key={opt.value}
                      onClick={() => toggleInterest(opt.value)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="relative p-4 rounded-2xl border-2 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      style={{
                        borderColor: selected ? "var(--chirpie-primary)" : "var(--chirpie-border)",
                        backgroundColor: selected ? "var(--chirpie-muted)" : "var(--chirpie-card)",
                      }}
                      aria-pressed={selected}
                    >
                      <div className="text-2xl mb-2">{opt.icon}</div>
                      <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{opt.description}</p>
                      {selected && (
                        <div
                          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: "var(--chirpie-primary)" }}
                        >
                          <Check size={11} color="white" strokeWidth={3} />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}

            {currentStep === "tone" && (
              <div className="flex flex-col gap-3 mt-4">
                {toneOptions.map((opt) => {
                  const selected = prefs.tone === opt.value;
                  return (
                    <motion.button
                      key={opt.value}
                      onClick={() => setPrefs((p) => ({ ...p, tone: opt.value }))}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className="relative p-4 rounded-2xl border-2 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      style={{
                        borderColor: selected ? "var(--chirpie-primary)" : "var(--chirpie-border)",
                        backgroundColor: selected ? "var(--chirpie-muted)" : "var(--chirpie-card)",
                      }}
                      aria-pressed={selected}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-base">{opt.icon}</span>
                        <span className="font-semibold text-sm text-foreground">{opt.label}</span>
                        {selected && (
                          <div
                            className="ml-auto w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: "var(--chirpie-primary)" }}
                          >
                            <Check size={11} color="white" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <p
                        className="text-xs leading-relaxed italic"
                        style={{ color: "var(--chirpie-muted-foreground)" }}
                      >
                        "{opt.sample}"
                      </p>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {currentStep === "frequency" && (
              <div className="flex flex-col gap-3 mt-4">
                {frequencyOptions.map((opt) => {
                  const selected = prefs.frequency === opt.value;
                  return (
                    <motion.button
                      key={opt.value}
                      onClick={() => setPrefs((p) => ({ ...p, frequency: opt.value }))}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="relative p-5 rounded-2xl border-2 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      style={{
                        borderColor: selected ? "var(--chirpie-primary)" : "var(--chirpie-border)",
                        backgroundColor: selected ? "var(--chirpie-muted)" : "var(--chirpie-card)",
                      }}
                      aria-pressed={selected}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{opt.icon}</span>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{opt.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                        </div>
                        {selected && (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: "var(--chirpie-primary)" }}
                          >
                            <Check size={11} color="white" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {currentStep === "theme" && (
              <div className="mt-4">
                <ThemeCardPicker
                  value={prefs.themeId ?? "classic-chat"}
                  onChange={(id) => {
                    setPrefs((p) => ({ ...p, themeId: id }));
                    setTheme(id);
                  }}
                />
              </div>
            )}

            {currentStep === "preview" && (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Here's a sample story in your style. This is what your digest will feel like.
                </p>
                <StoryBubble story={mockDigest.items[0].story} delay={0.1} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom nav */}
      <div
        className="fixed bottom-0 left-0 right-0 border-t px-4 py-4"
        style={{
          backgroundColor: "var(--chirpie-background)",
          borderColor: "var(--chirpie-border)",
        }}
      >
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {stepIndex > 0 && (
            <motion.button
              onClick={goPrev}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-pill border text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{
                borderColor: "var(--chirpie-border)",
                color: "var(--chirpie-muted-foreground)",
              }}
            >
              <ChevronLeft size={16} />
              Back
            </motion.button>
          )}

          <motion.button
            onClick={stepIndex === STEPS.length - 1 ? finish : goNext}
            disabled={!canProceed()}
            whileHover={{ scale: canProceed() ? 1.03 : 1 }}
            whileTap={{ scale: 0.97 }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-pill text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
            style={{
              backgroundColor: "var(--chirpie-primary)",
              color: "var(--chirpie-primary-foreground)",
            }}
          >
            {stepIndex === STEPS.length - 1 ? (
              <>Open my digest</>
            ) : (
              <>
                Continue
                <ChevronRight size={16} />
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
