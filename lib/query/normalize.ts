/**
 * lib/query/normalize.ts
 *
 * Shared query classification utilities used by the page-level intent router.
 * No dependencies — pure string operations, safe to import in client components.
 */

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

    // Next / future about this article
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

    // Broader context on this article
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
