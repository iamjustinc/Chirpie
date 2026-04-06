import type { ThemeDefinition, ThemeId, ThemeTokens } from "./types";

// ─── Theme Definitions ────────────────────────────────────────────────────────

export const themes: Record<ThemeId, ThemeDefinition> = {
  "classic-chat": {
    id: "classic-chat",
    name: "Classic Chat",
    description: "Soft sky blue and cream — the original Chirpie feel.",
    previewColors: ["#c8e6f5", "#f5f0e8", "#e8c4d4", "#b8d4e8"],
    tokens: {
      background: "#f0f7fc",
      foreground: "#1e3a4f",
      card: "#ffffff",
      cardForeground: "#1e3a4f",
      bubbleUser: "#dbeafe",
      bubbleUserForeground: "#1e3a5f",
      bubbleAssistant: "#ffffff",
      bubbleAssistantForeground: "#2d4a5f",
      border: "#ddeef7",
      shadow: "rgba(160, 200, 230, 0.35)",
      accent: "#5ba8cc",
      accentForeground: "#ffffff",
      muted: "#eef5fa",
      mutedForeground: "#5e86a0",
      chip: "#daeef8",
      chipForeground: "#2e6e96",
      input: "#ffffff",
      ring: "#7bb8d4",
      primary: "#4a9cc0",
      primaryForeground: "#ffffff",
    },
  },

  "pixel-sky": {
    id: "pixel-sky",
    name: "Pixel Sky",
    description: "Butter cream and berry pink — warm, bold, and playful.",
    previewColors: ["#fef3c7", "#fce7f3", "#f5d0fe", "#fef9c3"],
    tokens: {
      background: "#fffbf0",
      foreground: "#3d2c1e",
      card: "#fef9f0",
      cardForeground: "#3d2c1e",
      bubbleUser: "#fde68a",
      bubbleUserForeground: "#78350f",
      bubbleAssistant: "#fce7f3",
      bubbleAssistantForeground: "#831843",
      border: "#fde8cc",
      shadow: "rgba(251, 191, 36, 0.25)",
      accent: "#ec4899",
      accentForeground: "#ffffff",
      muted: "#fef3c7",
      mutedForeground: "#92400e",
      chip: "#fce7f3",
      chipForeground: "#9d174d",
      input: "#fffbf0",
      ring: "#f472b6",
      primary: "#ec4899",
      primaryForeground: "#ffffff",
    },
  },

  "retro-pink": {
    id: "retro-pink",
    name: "Retro Pink",
    description: "Blush and mauve — vintage-soft and quietly feminine.",
    previewColors: ["#fce4ec", "#f8bbd9", "#e1bee7", "#fce4ec"],
    tokens: {
      background: "#fdf2f8",
      foreground: "#4a1942",
      card: "#fff0f7",
      cardForeground: "#4a1942",
      bubbleUser: "#f8bbd9",
      bubbleUserForeground: "#880e4f",
      bubbleAssistant: "#f3e5f5",
      bubbleAssistantForeground: "#4a148c",
      border: "#f5d0e8",
      shadow: "rgba(244, 143, 177, 0.25)",
      accent: "#d63384",
      accentForeground: "#ffffff",
      muted: "#fce4ec",
      mutedForeground: "#ad1457",
      chip: "#fce4ec",
      chipForeground: "#c2185b",
      input: "#fff0f7",
      ring: "#f06292",
      primary: "#d63384",
      primaryForeground: "#ffffff",
    },
  },

  "night-mode": {
    id: "night-mode",
    name: "Night Mode",
    description: "Deep slate with soft glows — calm, focused, and easy on the eyes.",
    previewColors: ["#0f172a", "#1e293b", "#6366f1", "#818cf8"],
    tokens: {
      background: "#0f172a",
      foreground: "#e2e8f0",
      card: "#1e293b",
      cardForeground: "#e2e8f0",
      bubbleUser: "#1d4ed8",
      bubbleUserForeground: "#dbeafe",
      bubbleAssistant: "#1e293b",
      bubbleAssistantForeground: "#cbd5e1",
      border: "#334155",
      shadow: "rgba(99, 102, 241, 0.15)",
      accent: "#818cf8",
      accentForeground: "#0f172a",
      muted: "#1e293b",
      mutedForeground: "#64748b",
      chip: "#1e293b",
      chipForeground: "#818cf8",
      input: "#1e293b",
      ring: "#6366f1",
      primary: "#6366f1",
      primaryForeground: "#ffffff",
    },
  },
};

export const themeList = Object.values(themes);
export const defaultTheme = themes["classic-chat"];

export function getTheme(id: ThemeId): ThemeDefinition {
  return themes[id] ?? defaultTheme;
}

// Converts token object to CSS custom property string for <style> injection
export function themeToCSSVars(tokens: ThemeTokens): string {
  return Object.entries(tokens)
    .map(([key, value]) => {
      const cssKey = `--chirpie-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
      return `${cssKey}: ${value};`;
    })
    .join("\n  ");
}
