/**
 * lib/content/sources/local-curated.ts
 *
 * Curated local story fixtures — the default content source for the demo.
 *
 * Stories are organized by category. Each category has 2 stories so there's
 * variety when the user switches topics. Priority determines which story surfaces
 * first within a category (higher = more prominent).
 *
 * To add a new content source later: create a new file in this directory that
 * exports a ContentSourceAdapter, then register it in get-demo-stories.ts.
 */

import type { RawStory } from "../types";

export const CURATED_STORIES: readonly RawStory[] = [
  // ── Pop Culture ─────────────────────────────────────────────────────────────

  {
    id: "pc-001",
    category: "pop_culture",
    priority: 90,
    headline: "Charli XCX Announces Surprise Collab Album Dropping Midnight Tonight",
    summary:
      "Pop artist Charli XCX announced via social media that a surprise collaborative album with an unnamed A-list partner will be available for streaming at midnight. The project, recorded in secret over six weeks, consists of 10 tracks and marks her first full-length collab LP. Fans have been reacting wildly across TikTok and X since the announcement went live.",
    source: { name: "Pitchfork", url: "https://pitchfork.com" },
  },
  {
    id: "pc-002",
    category: "pop_culture",
    priority: 75,
    headline: "Sabrina Carpenter's World Tour Sets New Ticket Sales Record for a Female Artist",
    summary:
      "Sabrina Carpenter's upcoming world tour sold over 1.2 million tickets in its first 48 hours, breaking the previous record held by Taylor Swift's Eras Tour pre-sale. The 60-date arena run spans North America, Europe, and Australia. Carpenter's team announced a second leg of North American dates due to overwhelming demand.",
    source: { name: "Billboard", url: "https://billboard.com" },
  },

  // ── Finance ─────────────────────────────────────────────────────────────────

  {
    id: "fi-001",
    category: "finance",
    priority: 92,
    headline: "Fed Holds Rates Steady as Inflation Ticks Up for Second Straight Month",
    summary:
      "The Federal Reserve voted unanimously to hold the federal funds rate at its current level following its latest policy meeting, citing persistent inflation that rose 0.3% in March for the second consecutive month. Chair Jerome Powell signaled that rate cuts expected earlier in the year are now unlikely before Q4, a stance that sent stock futures lower in after-hours trading.",
    source: { name: "The Wall Street Journal", url: "https://wsj.com" },
  },
  {
    id: "fi-002",
    category: "finance",
    priority: 78,
    headline: "S&P 500 Posts Biggest Single-Day Gain Since 2022 After Jobs Report Surprise",
    summary:
      "US stocks surged Friday after the Bureau of Labor Statistics reported 315,000 new jobs added in April, significantly beating the 220,000 analyst consensus. The S&P 500 rose 2.4%, its largest single-day gain in over two years. Technology and financial stocks led the rally as investors recalibrated expectations for corporate earnings growth.",
    source: { name: "Reuters", url: "https://reuters.com" },
  },

  // ── Technology ──────────────────────────────────────────────────────────────

  {
    id: "tech-001",
    category: "tech",
    priority: 95,
    headline: "OpenAI Releases GPT-5 with Real-Time Vision and Voice in a Single Model",
    summary:
      "OpenAI officially launched GPT-5, its most capable model to date, which natively combines text, real-time voice conversation, and live video understanding in a single unified model. The rollout begins today for ChatGPT Plus subscribers. Early benchmarks show GPT-5 significantly outperforms its predecessor on reasoning, coding, and multimodal tasks.",
    source: { name: "The Verge", url: "https://theverge.com" },
  },
  {
    id: "tech-002",
    category: "tech",
    priority: 80,
    headline: "Apple Confirms WWDC Date — Spatial Computing and AI Tools Expected to Lead",
    summary:
      "Apple confirmed that its Worldwide Developers Conference will be held June 9–13 in Cupertino. Sources familiar with the plans expect major announcements around iOS 19, upgraded Siri with on-device large language models, and second-generation Vision Pro software updates. Developer betas are expected to ship immediately following the keynote.",
    source: { name: "9to5Mac", url: "https://9to5mac.com" },
  },

  // ── General ─────────────────────────────────────────────────────────────────

  {
    id: "gen-001",
    category: "general",
    priority: 88,
    headline: "Global Climate Summit Yields Binding Emissions Agreement",
    summary:
      "For the first time in years, 40 major economies signed a climate agreement with genuine enforcement mechanisms at the Geneva summit. The deal introduces binding emissions targets tied to a trade framework, with independent audits and financial consequences for countries that miss their targets. The first review period is set for 2027.",
    source: { name: "BBC News", url: "https://bbc.com/news" },
  },
  {
    id: "gen-002",
    category: "general",
    priority: 72,
    headline: "WHO Declares End to Mpox Public Health Emergency of International Concern",
    summary:
      "The World Health Organization announced it is lifting the Public Health Emergency of International Concern designation for mpox, citing a sustained decline in global case counts and improved vaccine access across high-burden countries. The decision does not mean mpox has been eradicated — the WHO said surveillance will continue and the outbreak status will be reassessed quarterly.",
    source: { name: "AP News", url: "https://apnews.com" },
  },

  // ── World ───────────────────────────────────────────────────────────────────

  {
    id: "world-001",
    category: "world",
    priority: 85,
    headline: "EU and India Reach Landmark Free Trade Agreement After Decade of Talks",
    summary:
      "The European Union and India announced a comprehensive free trade agreement covering goods, services, and digital trade after more than ten years of negotiations. The deal eliminates tariffs on 90% of traded goods and includes provisions on labor standards, environmental protection, and digital market access. Both sides estimate the agreement could add $100 billion to bilateral trade within five years.",
    source: { name: "Financial Times", url: "https://ft.com" },
  },
  {
    id: "world-002",
    category: "world",
    priority: 70,
    headline: "Japan Announces $50B Infrastructure Push Across Southeast Asia",
    summary:
      "Japan's government unveiled a $50 billion infrastructure investment initiative targeting Southeast Asian nations including Vietnam, Indonesia, and the Philippines. The package covers ports, rail, clean energy, and digital infrastructure, and is seen as part of Japan's strategy to offer an alternative to Chinese Belt and Road lending in the region. Agreements are expected to be finalized at a summit in Tokyo next month.",
    source: { name: "Nikkei Asia", url: "https://asia.nikkei.com" },
  },
] as const;
