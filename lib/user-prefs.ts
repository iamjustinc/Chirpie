/**
 * lib/user-prefs.ts
 *
 * Lightweight localStorage-based user preferences persistence.
 *
 * This is intentionally minimal — no auth, no server sync. Preferences set
 * during onboarding/sign-up are written here and read by the demo page to
 * personalize the content lane, tone, and digest greeting.
 *
 * Safe to call from SSR contexts — all localStorage access is guarded.
 */

import type { UserPreferences, Tone } from "./types";

const STORAGE_KEY = "chirpie_user_prefs";

// ─── Safe defaults ────────────────────────────────────────────────────────────

export const DEFAULT_USER_PREFS: Partial<UserPreferences> = {
  interests: ["general", "pop-culture", "finance"],
  tone: "casual",
  frequency: "daily",
  themeId: "classic-chat",
  emojiLevel: "minimal",
  digestLength: "medium",
};

// ─── Read / write ─────────────────────────────────────────────────────────────

/**
 * Persists user preferences to localStorage.
 * Silent no-op in SSR or when localStorage is unavailable (private mode, etc.)
 */
export function saveUserPrefs(prefs: Partial<UserPreferences>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Silently ignore — localStorage may be full or blocked
  }
}

/**
 * Reads user preferences from localStorage, merged with safe defaults.
 * Always returns a usable object — never throws.
 */
export function loadUserPrefs(): Partial<UserPreferences> {
  if (typeof window === "undefined") return DEFAULT_USER_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_USER_PREFS;
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    // Merge with defaults so new preference fields added later always have values
    return { ...DEFAULT_USER_PREFS, ...parsed };
  } catch {
    return DEFAULT_USER_PREFS;
  }
}

// ─── Tone mapping ─────────────────────────────────────────────────────────────

/**
 * Maps the UI Tone type (hyphen, includes "minimal") to the API's
 * tone_preference enum (underscore, no "minimal").
 *
 * "minimal" → "casual" (closest available equivalent)
 */
export function toneToApiTone(
  tone: Tone | undefined
): "gen_z" | "professional" | "casual" {
  switch (tone) {
    case "gen-z":
      return "gen_z";
    case "professional":
      return "professional";
    case "minimal":
    case "casual":
    default:
      return "casual";
  }
}

// ─── Greeting copy ────────────────────────────────────────────────────────────

/**
 * Returns a tone-appropriate greeting for a personalized digest.
 */
export function getToneGreeting(
  tone: Tone | undefined,
  name?: string
): string {
  const n = name?.trim();
  switch (tone) {
    case "gen-z":
      return n ? `hey ${n} 👋` : "hey 👋";
    case "professional":
      return n ? `Good morning, ${n}.` : "Good morning.";
    case "minimal":
      return n ? `Hi, ${n}.` : "Hi.";
    case "casual":
    default:
      return n ? `Hey, ${n}!` : "Hey!";
  }
}
