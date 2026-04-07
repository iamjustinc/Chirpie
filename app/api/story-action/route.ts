/**
 * POST /api/story-action
 *
 * Runs a lightweight AI action on an existing transformed story.
 * Separate from /api/transform — smaller outputs, action-specific prompting.
 *
 * Actions:
 *   one_line_recap  → 12–18 word single-sentence summary (supports "Skim")
 *   why_it_matters  → 1–2 sentences on real-world impact (supports "Understand")
 *   hear_more       → 3–4 sentences of deeper context (supports "Go deeper")
 *
 * Always returns { text: string, sourceUrl?: string }.
 * Falls back to derivations from story fields if AI fails.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runStoryAction } from "@/lib/ai/story-action";

// ─── Request schema ───────────────────────────────────────────────────────────

const StoryActionRequestSchema = z.object({
  action: z.enum(["one_line_recap", "why_it_matters", "hear_more"]),
  headline: z.string().min(1, "headline is required"),
  chatOpening: z.string().min(1, "chatOpening is required"),
  whyItMatters: z.string().min(1, "whyItMatters is required"),
  keyPoints: z.array(z.string().min(1)).min(1, "at least one key point required"),
  tonePreference: z.enum(["gen_z", "professional", "casual"]).default("casual"),
  isHighGravity: z.boolean().optional(),
  sourceUrl: z.string().optional(),
});

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  let input;
  try {
    input = StoryActionRequestSchema.parse(body);
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body.", details: String(err) },
      { status: 400 }
    );
  }

  try {
    const result = await runStoryAction(input);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[Chirpie] /api/story-action error:", err);
    // Even here, try to return something useful by returning from fallback inline
    return NextResponse.json(
      { text: input.chatOpening, sourceUrl: input.sourceUrl },
      { status: 200 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 }
  );
}
