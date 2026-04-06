/**
 * gravity-check.ts
 *
 * Lightweight local heuristic that flags high-gravity content — stories involving
 * death, violence, tragedy, disaster, abuse, or mass harm.
 *
 * This runs BEFORE the AI call so we can instruct Claude to use a
 * Neutral/Respectful tone override regardless of user tone preference.
 *
 * Two-layer safety:
 *   Layer 1 → this function flags the story and sets is_high_gravity in the Claude prompt
 *   Layer 2 → the system prompt enforces Neutral/Respectful when is_high_gravity is true
 */

// Ordered roughly by severity. Single words and short phrases only —
// longer phrases risk false-negative mismatches on substring checks.
const HIGH_GRAVITY_SIGNALS: readonly string[] = [
  // Death & killing
  "dead",
  "died",
  "death",
  "deaths",
  "killed",
  "killing",
  "kills",
  "murder",
  "murdered",
  "homicide",
  "massacre",
  "genocide",
  "fatalities",
  "casualties",
  // Violence & weapons
  "shooting",
  "shot dead",
  "stabbing",
  "stabbed",
  "bombing",
  "bombed",
  "attack",
  "attacked",
  "assault",
  "assaulted",
  "violence",
  "violent",
  "hostage",
  "hostages",
  "terrorism",
  "terrorist",
  // Abuse & harm
  "abuse",
  "abused",
  "child abuse",
  "sexual assault",
  "rape",
  "trafficking",
  // Crisis & disaster
  "disaster",
  "catastrophe",
  "catastrophic",
  "tragedy",
  "tragic",
  "crisis",
  "emergency",
  "evacuate",
  "evacuation",
  // Natural disasters
  "earthquake",
  "hurricane",
  "tsunami",
  "tornado",
  "wildfire",
  "flood",
  "famine",
  "starvation",
  // War & conflict
  "war",
  "warfare",
  "conflict",
  "airstrike",
  "shelling",
  "invasion",
  "occupation",
  // Health crises
  "overdose",
  "suicide",
  "suicidal",
  "pandemic",
  "epidemic",
  "outbreak",
  // Mass harm
  "victims",
  "survivors",
  "injured",
  "injuries",
  "mass shooting",
  "mass casualty",
];

export interface GravityCheckResult {
  isHighGravity: boolean;
  /** The specific keywords that triggered the flag — useful for debugging and logging */
  matchedSignals: string[];
}

/**
 * Runs a keyword scan over the headline and summary.
 * Returns isHighGravity=true if any high-gravity signal is found.
 *
 * Case-insensitive. Whole-word matching is intentionally NOT enforced —
 * we'd rather have a false positive (conservative tone) than a false negative
 * (flippant tone on a serious story).
 */
export function gravityCheck(headline: string, summary: string): GravityCheckResult {
  const combined = `${headline} ${summary}`.toLowerCase();

  const matchedSignals = HIGH_GRAVITY_SIGNALS.filter((signal) =>
    combined.includes(signal)
  );

  return {
    isHighGravity: matchedSignals.length > 0,
    matchedSignals,
  };
}
