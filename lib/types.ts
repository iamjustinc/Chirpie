// ─── Category & Preference Types ────────────────────────────────────────────

export type Category =
  | "general"
  | "pop-culture"
  | "finance"
  | "sports"
  | "technology"
  | "world";

export type Tone = "casual" | "gen-z" | "professional" | "minimal";

export type DigestFrequency = "daily" | "weekly";

export type ThemeId = "classic-chat" | "pixel-sky" | "retro-pink" | "night-mode";

export type EmojiLevel = "none" | "minimal" | "moderate";

export type DigestLength = "short" | "medium";

// ─── User ────────────────────────────────────────────────────────────────────

export interface UserPreferences {
  id: string;
  name: string;
  email: string;
  interests: Category[];
  tone: Tone;
  frequency: DigestFrequency;
  themeId: ThemeId;
  emojiLevel: EmojiLevel;
  punctuation: boolean;
  digestLength: DigestLength;
}

// ─── Story ───────────────────────────────────────────────────────────────────

export interface StorySource {
  name: string;
  url: string;
  sourceType: "newspaper" | "wire" | "magazine" | "blog" | "broadcast";
  publishedAt: string;
}

export interface Story {
  id: string;
  headline: string;
  category: Category;
  subcategory?: string;
  chatOpening: string;
  whyItMatters: string;
  keyPoints: string[];
  sources: StorySource[];
  followUpPrompts: string[];
  tone: Tone;
  publishedAt: string;
  importanceScore: number;
  saved?: boolean;
}

// ─── Digest ──────────────────────────────────────────────────────────────────

export interface DigestItem {
  id: string;
  story: Story;
  transformedText: string;
  position: number;
}

export interface Digest {
  id: string;
  userId: string;
  generatedAt: string;
  frequency: DigestFrequency;
  themeId: ThemeId;
  greeting: string;
  intro: string;
  items: DigestItem[];
}

// ─── Theme System ─────────────────────────────────────────────────────────────

export interface ThemeTokens {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  bubbleUser: string;
  bubbleUserForeground: string;
  bubbleAssistant: string;
  bubbleAssistantForeground: string;
  border: string;
  shadow: string;
  accent: string;
  accentForeground: string;
  muted: string;
  mutedForeground: string;
  chip: string;
  chipForeground: string;
  input: string;
  ring: string;
  primary: string;
  primaryForeground: string;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  description: string;
  tokens: ThemeTokens;
  previewColors: string[];
}

// ─── Thread Items (append-only continuous chat model) ────────────────────────

export type ThreadItem =
  | { type: "user-message"; id: string; text: string }
  | { type: "story"; id: string; story: Story }
  | { type: "assistant-message"; id: string; text: string };

// ─── Onboarding ───────────────────────────────────────────────────────────────

export type OnboardingStep =
  | "interests"
  | "tone"
  | "frequency"
  | "theme"
  | "preview";

export interface OnboardingState {
  step: OnboardingStep;
  stepIndex: number;
  preferences: Partial<UserPreferences>;
}
