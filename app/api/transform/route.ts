/**
 * POST /api/transform
 *
 * Accepts a raw news object and returns a Chirpie-formatted story JSON.
 *
 * Request body:
 *   {
 *     headline: string
 *     summary: string
 *     source: { name: string; url: string }
 *     tone_preference: "gen_z" | "professional" | "casual"
 *   }
 *
 * Success response (200):
 *   {
 *     headline: string
 *     chat_opening: string
 *     why_it_matters: string
 *     key_points: [string, string, string]
 *     follow_up_prompts: [string, string, string]
 *   }
 *
 * Error responses:
 *   400 → invalid / missing request fields (Zod errors surfaced safely)
 *   500 → transform failed (no internal stack trace exposed)
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { TransformInputSchema } from "@/lib/ai/schemas/chirpie-transform";
import { transformStory } from "@/lib/ai/transform-story";

export async function POST(req: NextRequest) {
  // ── Parse request body ──────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  // ── Validate input schema ───────────────────────────────────────────────────
  let input;
  try {
    input = TransformInputSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request body.",
          details: err.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Could not read request body." },
      { status: 400 }
    );
  }

  // ── Run transform ───────────────────────────────────────────────────────────
  try {
    const result = await transformStory(input);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    // Log full error server-side; expose only a clean message to the client
    console.error("[Chirpie API /api/transform] Transform error:", err);
    return NextResponse.json(
      { error: "Transform failed. Please try again." },
      { status: 500 }
    );
  }
}

// Reject unsupported HTTP methods gracefully
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 }
  );
}