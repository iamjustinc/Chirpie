"use client";

import { motion } from "framer-motion";
import { useTheme } from "./ThemeProvider";
import { themeList } from "@/lib/themes";
import type { ThemeId } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ThemeSwitcherProps {
  className?: string;
  showLabels?: boolean;
  size?: "sm" | "md" | "lg";
}

export function ThemeSwitcher({
  className,
  showLabels = false,
  size = "md",
}: ThemeSwitcherProps) {
  const { themeId, setTheme } = useTheme();

  const dotSize = size === "sm" ? "w-5 h-5" : size === "lg" ? "w-9 h-9" : "w-7 h-7";

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {themeList.map((t) => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id as ThemeId)}
          title={t.name}
          className={cn(
            "relative rounded-pill border-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            themeId === t.id
              ? "border-foreground scale-110"
              : "border-transparent hover:scale-105 opacity-70 hover:opacity-100"
          )}
          aria-pressed={themeId === t.id}
          aria-label={`Switch to ${t.name} theme`}
        >
          {/* Color swatch strip */}
          <div className={cn("flex rounded-pill overflow-hidden", dotSize)}>
            {t.previewColors.slice(0, 2).map((color, i) => (
              <div
                key={i}
                className="flex-1 h-full"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          {themeId === t.id && (
            <motion.div
              layoutId="theme-active-ring"
              className="absolute inset-0 rounded-pill ring-2 ring-offset-1"
              style={{ outline: "2px solid var(--chirpie-primary)", outlineOffset: "2px" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </button>
      ))}

      {showLabels && (
        <span className="text-xs text-muted-foreground ml-1">
          {themeList.find((t) => t.id === themeId)?.name}
        </span>
      )}
    </div>
  );
}

// ─── Full Theme Card Picker ────────────────────────────────────────────────────

interface ThemeCardPickerProps {
  value: ThemeId;
  onChange: (id: ThemeId) => void;
}

export function ThemeCardPicker({ value, onChange }: ThemeCardPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {themeList.map((t) => (
        <motion.button
          key={t.id}
          onClick={() => onChange(t.id as ThemeId)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "relative rounded-2xl border-2 p-3 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === t.id
              ? "border-foreground shadow-card"
              : "border-border hover:border-muted-foreground"
          )}
        >
          {/* Color preview strip */}
          <div className="flex h-8 rounded-xl overflow-hidden mb-2">
            {t.previewColors.map((color, i) => (
              <div
                key={i}
                className="flex-1"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <p className="text-xs font-semibold text-foreground">{t.name}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
            {t.description}
          </p>
          {value === t.id && (
            <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-foreground flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-background" />
            </div>
          )}
        </motion.button>
      ))}
    </div>
  );
}
