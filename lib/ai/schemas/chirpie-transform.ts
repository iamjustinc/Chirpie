import { z } from "zod";

// ─── Tone preference enum ─────────────────────────────────────────────────────

export const TonePreferenceSchema = z.enum(["gen_z", "professional", "casual"]);
export type TonePreference = z.infer<typeof TonePreferenceSchema>;

// ─── Request body (what the POST /api/transform endpoint accepts) ─────────────

export const TransformInputSchema = z.object({
  headline: z.string().min(1, "headline is required"),
  summary: z.string().min(1, "summary is required"),
  source: z.object({
    name: z.string().min(1, "source.name is required"),
    url: z.string().url("source.url must be a valid URL"),
  }),
  tone_preference: TonePreferenceSchema,
});

export type TransformInput = z.infer<typeof TransformInputSchema>;

// ─── AI output (what Claude must return, validated strictly) ──────────────────

export const TransformOutputSchema = z.object({
  headline: z.string().min(1),
  chat_opening: z.string().min(1),
  why_it_matters: z.string().min(1),
  // Exactly 3 items enforced at the Zod layer
  key_points: z
    .array(z.string().min(1))
    .length(3, "key_points must contain exactly 3 items"),
  follow_up_prompts: z
    .array(z.string().min(1))
    .length(3, "follow_up_prompts must contain exactly 3 items"),
});

export type TransformOutput = z.infer<typeof TransformOutputSchema>;
