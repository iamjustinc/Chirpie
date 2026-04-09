/**
 * lib/query/normalize.ts
 *
 * Shared query classification utilities used by the page-level intent router.
 * No dependencies — pure string operations, safe to import in client components.
 */

// ─── Pre-normalization (routing-level typo correction) ────────────────────────

/**
 * Applies conservative, high-confidence corrections for common misspellings
 * of routing-critical keywords (category names, navigation terms) BEFORE any
 * routing decisions are made.
 *
 * Rules for inclusion:
 *   (a) typo is an extremely common 1-2 character transposition/addition, AND
 *   (b) the correction is unambiguous in a news-app context.
 *
 * General entity/topic typos ("chapple roan") are handled by the search
 * route's AI correction phase — not here.
 */
export function preNormalizeQuery(text: string): string {
  return text
    // ── Finance / market ────────────────────────────────────────────────────
    // "stick market" is the most common single-word typo for "stock market"
    .replace(/\bstick\s+market/gi, "stock market")
    .replace(/\bstikc\s+market/gi, "stock market")
    .replace(/\bstocke?\s+market/gi, "stock market")
    .replace(/\bsotck\b/gi, "stock")
    .replace(/\bstokc\b/gi, "stock")
    .replace(/\bstcok\b/gi, "stock")
    // "finances" → "finance" (plural → singular for routing)
    .replace(/\bfinances\b/gi, "finance")
    .replace(/\bfinannce\b/gi, "finance")
    .replace(/\bfinace\b/gi, "finance")
    .replace(/\bfinnce\b/gi, "finance")
    .replace(/\bfincance\b/gi, "finance")
    .replace(/\bfinanace\b/gi, "finance")
    .replace(/\bfianance\b/gi, "finance")
    .replace(/\bfinacnce\b/gi, "finance")
    // "business" common misspellings
    .replace(/\bbuisness\b/gi, "business")
    .replace(/\bbusinees\b/gi, "business")
    .replace(/\bbusiness's?\b/gi, "business")
    // "economy" misspellings
    .replace(/\becononomy\b/gi, "economy")
    .replace(/\beconmoy\b/gi, "economy")
    .replace(/\becnoomy\b/gi, "economy")
    // "market" misspellings
    .replace(/\bmarkeet\b/gi, "market")
    .replace(/\bmaket\b/gi, "market")
    .replace(/\bmarkts\b/gi, "markets")

    // ── Navigation ──────────────────────────────────────────────────────────
    // "updatee" / "updaet" are extremely common double-tap errors
    .replace(/\bupdatee+\b/gi, "update")
    .replace(/\bupdaet\b/gi, "update")
    .replace(/\bupdte\b/gi, "update")
    // "another" misspellings
    .replace(/\bnaother\b/gi, "another")
    .replace(/\banohter\b/gi, "another")
    .replace(/\banthother\b/gi, "another")
    .replace(/\banothr\b/gi, "another")
    // "more" / "next"
    .replace(/\bmoree\b/gi, "more")
    .replace(/\bneext\b/gi, "next")

    // ── Pop culture ─────────────────────────────────────────────────────────
    .replace(/\bpoph\b/gi, "pop")
    .replace(/\bpop[- ]?cultur\b/gi, "pop culture")

    // ── Tech ────────────────────────────────────────────────────────────────
    .replace(/\btehc\b/gi, "tech")
    .replace(/\bteche\b/gi, "tech")
    .replace(/\btechonology\b/gi, "technology")
    .replace(/\btechnolgy\b/gi, "technology");
}

// ─── Story follow-up classifier ───────────────────────────────────────────────

/**
 * Returns true ONLY when the typed text is clearly a contextual follow-up
 * about the currently active story — i.e., the user is asking about THIS
 * article, not requesting a new topic or search.
 *
 * This is a strict ALLOWLIST. Anything that doesn't match goes to search.
 * Erring on the side of search is intentional: "default-to-search" behavior.
 */
export function isStoryFollowUp(text: string): boolean {
  const q = text.trim().toLowerCase();

  const PATTERNS: RegExp[] = [
    // Why / significance — must reference "this", "it", or "that"
    /^why (does|did|is|was|has) (this|it|that)/,
    /^why is this/,
    /^why (is|was) it/,

    // What questions about this article's context
    /^what('?s| is| was| were| has been) (the |a )?(background|backstory|context|history|reason|cause|response|reaction|impact|effect|aftermath|significance)/,
    /^what (led|brought|caused) (to |this|it)/,
    /^what has been (the |a )?/,
    /^what('?s| is) (happening here|happening in this|the deal here|the situation)/,

    // Next / future about this article (bare — no entity name following)
    /^what('?s| is) next\s*\??$/,
    /^what happens next\s*\??$/,
    /^what('?s| will) happen (next|now|after)\s*\??$/,

    // Who questions about this article (not person searches)
    /^who (is|are|was|were) (involved|affected|responsible|behind|impacted|at fault)/,

    // Summary / recap of this article
    /^(summarize|recap|summary|tldr|tl;dr)\s*(this|it|the story|the article)?\s*\??$/,

    // Elaboration on this article — only when bare (no specific entity follows)
    /^tell me more\s*\??$/,
    /^(more details|elaborate|dig deeper|go deeper)\s*\??$/,
    /^explain (more|this|it|further)\s*\??$/,
    /^(give|can you give) me (more|a recap|context|background)\s*\??$/,

    // How questions about this article
    /^how (does|did|is|was|do) (this|it|that)/,
    /^how (significant|important|big) is (this|it)/,

    // Broader context on this article (bare — no topic name following)
    /^(broader|deeper|more|additional) (context|background|details)\s*\??$/,
    /^key (takeaway|takeaways|point|points|detail|details)\s*\??$/,

    // What else (follow-up on article content)
    /^(what|who) else\s*\??$/,
    /^anything else (about this|on this|related)\s*\??$/,

    // Questions that explicitly reference "this story" / "this article"
    /\b(this story|this article|the story|the article)\b/,

    // Demonstratives implying "the current context"
    /^(what|how|when|where|why|who).*(this|it|that)\s*\??$/,
  ];

  return PATTERNS.some((re) => re.test(q));
}
