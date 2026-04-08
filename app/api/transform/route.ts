/**
 * POST /api/transform
 *
 * Accepts a raw news object and returns a Chirpie-formatted story JSON.
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { TransformInputSchema } from "@/lib/ai/schemas/chirpie-transform";
import transformStoryDefault, {
  transformStory as transformStoryNamed,
} from "@/lib/ai/transform-story";

const transformStory =
  typeof transformStoryNamed === "function"
    ? transformStoryNamed
    : typeof transformStoryDefault === "function"
    ? transformStoryDefault
    : null;

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
    input = TransformInputSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request body.",
          details: err.issues.map((e) => ({
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

  if (!transformStory) {
    console.error("[Chirpie API /api/transform] transformStory import is invalid");
    return NextResponse.json(
      { error: "Transform module is not available." },
      { status: 500 }
    );
  }

  try {
    const result = await transformStory(input);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error(err);
    console.error("[Chirpie API /api/transform] Transform error above ↑");
    return NextResponse.json(
      { error: "Transform failed. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 }
  );
}