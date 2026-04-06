import type { Digest, Story, UserPreferences } from "./types";

// ─── Mock User Preferences ────────────────────────────────────────────────────

export const mockUser: UserPreferences = {
  id: "user-001",
  name: "Alex",
  email: "alex@example.com",
  interests: ["general", "pop-culture", "finance"],
  tone: "casual",
  frequency: "daily",
  themeId: "classic-chat",
  emojiLevel: "minimal",
  punctuation: true,
  digestLength: "medium",
};

// ─── Mock Stories ─────────────────────────────────────────────────────────────

export const mockStories: Story[] = [
  {
    id: "story-001",
    headline: "Federal Reserve Holds Rates Steady Amid Mixed Economic Signals",
    category: "finance",
    subcategory: "macro",
    chatOpening:
      "The Fed kept interest rates right where they are — no hike, no cut. That might sound boring, but it's actually a pretty deliberate signal.",
    whyItMatters:
      "Rate decisions ripple through everything: your mortgage, credit cards, savings accounts, and the stock market. A hold means the Fed is watching closely before its next move.",
    keyPoints: [
      "Fed funds rate held at 5.25–5.50%",
      "Officials cited persistent inflation in services",
      "Markets had priced in a cut — didn't happen",
      "Next decision expected in six weeks",
    ],
    sources: [
      {
        name: "Reuters",
        url: "https://reuters.com",
        sourceType: "wire",
        publishedAt: "2025-04-06T14:00:00Z",
      },
      {
        name: "Wall Street Journal",
        url: "https://wsj.com",
        sourceType: "newspaper",
        publishedAt: "2025-04-06T14:30:00Z",
      },
    ],
    followUpPrompts: [
      "What does a rate hold actually mean for me?",
      "When might the Fed cut next?",
      "How does this affect the stock market?",
    ],
    tone: "casual",
    publishedAt: "2025-04-06T14:00:00Z",
    importanceScore: 0.91,
    saved: false,
  },
  {
    id: "story-002",
    headline: "Beyoncé's New Album Breaks Streaming Records in First 24 Hours",
    category: "pop-culture",
    subcategory: "music",
    chatOpening:
      "Okay so Beyoncé just dropped her new project and the internet is absolutely not handling it. The streaming numbers are genuinely historic.",
    whyItMatters:
      "This isn't just a music moment — it's a cultural one. The release strategy, the sonic direction, and the immediate fan response are all reshaping what a major album rollout looks like in 2025.",
    keyPoints: [
      "Surpassed 200 million streams in under 24 hours",
      "No traditional promotional cycle — surprise release",
      "Genre-blending: elements of country, R&B, and orchestral pop",
      "Three visual films dropping throughout the week",
    ],
    sources: [
      {
        name: "Pitchfork",
        url: "https://pitchfork.com",
        sourceType: "magazine",
        publishedAt: "2025-04-06T10:00:00Z",
      },
      {
        name: "Billboard",
        url: "https://billboard.com",
        sourceType: "magazine",
        publishedAt: "2025-04-06T11:30:00Z",
      },
    ],
    followUpPrompts: [
      "What genre is it, exactly?",
      "Who produced the album?",
      "How does this compare to Renaissance?",
    ],
    tone: "casual",
    publishedAt: "2025-04-06T10:00:00Z",
    importanceScore: 0.83,
    saved: false,
  },
  {
    id: "story-003",
    headline: "Global Climate Summit Yields Binding Emissions Agreement",
    category: "general",
    subcategory: "world",
    chatOpening:
      "For the first time in years, major economies actually signed something with teeth. A new climate agreement came out of this week's Geneva summit — and it includes enforcement mechanisms.",
    whyItMatters:
      "Past climate deals have often stalled because there was no real way to hold countries accountable. This one introduces trade-linked consequences for missing targets, which changes the calculus.",
    keyPoints: [
      "40 nations signed, including the US, EU, China, and India",
      "Binding emissions targets tied to trade framework",
      "Independent audit mechanism included",
      "First review period: 2027",
    ],
    sources: [
      {
        name: "BBC News",
        url: "https://bbc.com/news",
        sourceType: "broadcast",
        publishedAt: "2025-04-05T18:00:00Z",
      },
      {
        name: "The Guardian",
        url: "https://theguardian.com",
        sourceType: "newspaper",
        publishedAt: "2025-04-05T19:30:00Z",
      },
      {
        name: "AP News",
        url: "https://apnews.com",
        sourceType: "wire",
        publishedAt: "2025-04-05T17:45:00Z",
      },
    ],
    followUpPrompts: [
      "What happens if a country misses its target?",
      "What did China agree to?",
      "How is this different from the Paris Agreement?",
    ],
    tone: "casual",
    publishedAt: "2025-04-05T18:00:00Z",
    importanceScore: 0.95,
    saved: false,
  },
];

// ─── Mock Digest ──────────────────────────────────────────────────────────────

export const mockDigest: Digest = {
  id: "digest-001",
  userId: "user-001",
  generatedAt: new Date().toISOString(),
  frequency: "daily",
  themeId: "classic-chat",
  greeting: "Good morning, Alex.",
  intro:
    "Here's what's worth knowing today. I kept it focused — three stories, each one a different flavor. Ready when you are.",
  items: [
    {
      id: "item-001",
      story: mockStories[2], // general news first
      transformedText: mockStories[2].chatOpening,
      position: 0,
    },
    {
      id: "item-002",
      story: mockStories[1], // pop culture second
      transformedText: mockStories[1].chatOpening,
      position: 1,
    },
    {
      id: "item-003",
      story: mockStories[0], // finance last
      transformedText: mockStories[0].chatOpening,
      position: 2,
    },
  ],
};

// ─── Landing Page Mock Chat (for PhoneMockup) ──────────────────────────────────

export const landingPageChat = [
  {
    role: "assistant" as const,
    text: "Good morning. Here's what's happening today.",
    delay: 0,
  },
  {
    role: "assistant" as const,
    text: "The Fed held rates steady — no cut yet. Markets are recalibrating expectations for later this year.",
    delay: 600,
  },
  {
    role: "user" as const,
    text: "Why does a hold matter?",
    delay: 1400,
  },
  {
    role: "assistant" as const,
    text: "A hold means the Fed isn't ready to loosen yet. High rates keep borrowing expensive — mortgages, car loans, credit cards. The hope was for relief. Not yet.",
    delay: 2200,
  },
  {
    role: "assistant" as const,
    text: "Also: Beyoncé dropped something and the internet is offline.",
    delay: 3000,
  },
];
