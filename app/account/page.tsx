"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/shell/AppShell";
import { ThemeCardPicker } from "@/components/theme/ThemeSwitcher";
import { useTheme } from "@/components/theme/ThemeProvider";
import type { Category, Tone, DigestFrequency, ThemeId, UserPreferences } from "@/lib/types";
import { getFullUserPrefs, saveUserPrefs } from "@/lib/user-prefs";
import { getCategoryLabel } from "@/lib/utils";
import { Check, LogOut, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const categoryOptions: { value: Category; icon: string }[] = [
  { value: "general", icon: "📰" },
  { value: "pop-culture", icon: "🎬" },
  { value: "finance", icon: "📊" },
  { value: "sports", icon: "⚽" },
  { value: "technology", icon: "💻" },
  { value: "world", icon: "🌍" },
];

const toneOptions: { value: Tone; label: string }[] = [
  { value: "casual", label: "Casual" },
  { value: "gen-z", label: "Gen Z" },
  { value: "professional", label: "Professional" },
  { value: "minimal", label: "Minimal" },
];

const frequencyOptions: { value: DigestFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-semibold text-foreground">{title}</h2>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

function Pill<T extends string>({
  value,
  selected,
  onClick,
  children,
}: {
  value: T;
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "px-3.5 py-1.5 rounded-pill border text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
      style={{
        backgroundColor: selected ? "var(--chirpie-primary)" : "var(--chirpie-card)",
        borderColor: selected ? "var(--chirpie-primary)" : "var(--chirpie-border)",
        color: selected ? "var(--chirpie-primary-foreground)" : "var(--chirpie-foreground)",
      }}
      aria-pressed={selected}
    >
      {children}
    </motion.button>
  );
}

export default function AccountPage() {
  const { themeId, setTheme } = useTheme();
  // Initialise from localStorage — overrides theme with the ThemeProvider's live value
  const [prefs, setPrefs] = useState<UserPreferences>(() => ({
    ...getFullUserPrefs(),
    themeId,
  }));
  const [saved, setSaved] = useState(false);

  function toggleInterest(cat: Category) {
    setPrefs((p) => {
      const has = p.interests.includes(cat);
      if (has && p.interests.length === 1) return p;
      return {
        ...p,
        interests: has ? p.interests.filter((c) => c !== cat) : [...p.interests, cat],
      };
    });
  }

  function handleSave() {
    setTheme(prefs.themeId);
    saveUserPrefs(prefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <AppShell maxWidth="md" padTop={true}>
      <div className="py-6 space-y-8 max-w-lg mx-auto">
        {/* Profile header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 p-5 rounded-2xl border"
          style={{
            backgroundColor: "var(--chirpie-card)",
            borderColor: "var(--chirpie-border)",
          }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
            style={{ backgroundColor: "var(--chirpie-muted)" }}
          >
            🐦
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">
              {prefs.name || prefs.email?.split("@")[0] || "Your account"}
            </p>
            {prefs.email && (
              <p className="text-sm text-muted-foreground">{prefs.email}</p>
            )}
            <span
              className="inline-block mt-1 px-2 py-0.5 rounded-pill text-[10px] font-semibold uppercase tracking-wide"
              style={{
                backgroundColor: "var(--chirpie-chip)",
                color: "var(--chirpie-chip-foreground)",
              }}
            >
              {prefs.frequency} digest
            </span>
          </div>
        </motion.div>

        {/* Interests */}
        <section
          className="p-5 rounded-2xl border"
          style={{
            backgroundColor: "var(--chirpie-card)",
            borderColor: "var(--chirpie-border)",
          }}
        >
          <SectionHeader
            title="Your interests"
            subtitle="Select everything you want in your digest."
          />
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map((opt) => (
              <Pill
                key={opt.value}
                value={opt.value}
                selected={prefs.interests.includes(opt.value)}
                onClick={() => toggleInterest(opt.value)}
              >
                <span className="mr-1">{opt.icon}</span>
                {getCategoryLabel(opt.value)}
              </Pill>
            ))}
          </div>
        </section>

        {/* Tone */}
        <section
          className="p-5 rounded-2xl border"
          style={{
            backgroundColor: "var(--chirpie-card)",
            borderColor: "var(--chirpie-border)",
          }}
        >
          <SectionHeader
            title="Tone"
            subtitle="How should Chirpie write to you?"
          />
          <div className="flex flex-wrap gap-2">
            {toneOptions.map((opt) => (
              <Pill
                key={opt.value}
                value={opt.value}
                selected={prefs.tone === opt.value}
                onClick={() => setPrefs((p) => ({ ...p, tone: opt.value }))}
              >
                {opt.label}
              </Pill>
            ))}
          </div>
        </section>

        {/* Frequency */}
        <section
          className="p-5 rounded-2xl border"
          style={{
            backgroundColor: "var(--chirpie-card)",
            borderColor: "var(--chirpie-border)",
          }}
        >
          <SectionHeader title="Digest frequency" />
          <div className="flex gap-2">
            {frequencyOptions.map((opt) => (
              <Pill
                key={opt.value}
                value={opt.value}
                selected={prefs.frequency === opt.value}
                onClick={() => setPrefs((p) => ({ ...p, frequency: opt.value }))}
              >
                {opt.label}
              </Pill>
            ))}
          </div>
        </section>

        {/* Theme */}
        <section
          className="p-5 rounded-2xl border"
          style={{
            backgroundColor: "var(--chirpie-card)",
            borderColor: "var(--chirpie-border)",
          }}
        >
          <SectionHeader
            title="Theme"
            subtitle="Switch anytime. Changes apply immediately."
          />
          <ThemeCardPicker
            value={prefs.themeId}
            onChange={(id: ThemeId) => setPrefs((p) => ({ ...p, themeId: id }))}
          />
        </section>

        {/* Save button */}
        <motion.button
          onClick={handleSave}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3 rounded-pill text-sm font-semibold flex items-center justify-center gap-2 transition-all"
          style={{
            backgroundColor: saved ? "var(--chirpie-accent)" : "var(--chirpie-primary)",
            color: "var(--chirpie-primary-foreground)",
          }}
        >
          {saved ? (
            <>
              <Check size={15} strokeWidth={3} />
              Saved
            </>
          ) : (
            "Save preferences"
          )}
        </motion.button>

        {/* Danger zone */}
        <section
          className="p-5 rounded-2xl border space-y-3"
          style={{
            backgroundColor: "var(--chirpie-card)",
            borderColor: "var(--chirpie-border)",
          }}
        >
          <SectionHeader title="Account" />
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <LogOut size={14} />
            Sign out
          </button>
          <button className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition-colors">
            <Trash2 size={14} />
            Delete account
          </button>
        </section>
      </div>
    </AppShell>
  );
}
