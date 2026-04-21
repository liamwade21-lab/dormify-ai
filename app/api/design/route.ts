import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { extractJson, validateDesign } from "@/lib/validate";
import type { DesignApiRequest, DesignResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "claude-sonnet-4-5";

const SYSTEM_PROMPT = `You are the creative director for Dormify AI, a room redesign tool for college students and young renters. You study a room photo and return a styling plan as strict JSON.

Rules:
- Output valid JSON only. No prose, no markdown fences.
- Exactly 6 to 8 items.
- Total price must be under the user's budget but close to it (within 15 percent of the budget ceiling).
- Mix categories: include lighting, textiles (rug/throw/curtains/bedding), wall decor, storage, and accents.
- Use real, common product names you can find on Amazon, Target, or IKEA. Store must be exactly one of "Amazon", "Target", "IKEA".
- placement.x and placement.y are percentages (0 to 100) from the top-left of the image where the price pin should sit, over the spot that item occupies in the redesigned room.
- Spread the pins out. No two pins should overlap. Keep each pin at least 8 units away from every other pin on each axis.
- imagePrompt is one dense paragraph describing the full redesigned room for an image model. Preserve the original layout, walls, windows, doors, perspective, and ceiling height. Only change furniture, textiles, lighting, wall art, and decor to match the vibe.
- Lowercase playful copy in vibeName, tagline, description, moodWords.
- hex colors are #rrggbb.
- emoji is one relevant emoji for the item.`;

function buildUserPrompt(vibe: string, budget: number): string {
  return `vibe: ${vibe}
budget ceiling: $${budget}

Return JSON matching this exact shape:
{
  "vibeName": "string, 2 to 4 words",
  "tagline": "one punchy sentence",
  "description": "2 to 3 sentences about how the room will feel",
  "moodWords": ["five lowercase words"],
  "colorPalette": [{ "name": "string", "hex": "#xxxxxx" }],
  "changesNeeded": ["remove or modify instructions, short bullets"],
  "imagePrompt": "a detailed natural language prompt describing the full redesigned room for an image model to render from the original photo",
  "items": [
    {
      "name": "specific product name",
      "description": "short reason it fits",
      "price": 29.99,
      "store": "Amazon" | "Target" | "IKEA",
      "searchQuery": "keywords",
      "emoji": "🛋️",
      "placement": { "x": 45, "y": 60, "note": "where it goes, short phrase" }
    }
  ]
}`;
}

function stricterRetryPrompt(vibe: string, budget: number): string {
  return `${buildUserPrompt(vibe, budget)}

CRITICAL: Your previous response was not valid JSON. Respond with ONLY the JSON object. Start your response with { and end with }. No text before or after. No code fences. No explanation.`;
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set on the server" },
      { status: 500 },
    );
  }

  let body: DesignApiRequest;
  try {
    body = (await req.json()) as DesignApiRequest;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { image, vibe, budget } = body;
  if (typeof image !== "string" || image.length === 0) {
    return NextResponse.json({ error: "image is required (base64 string)" }, { status: 400 });
  }
  if (typeof vibe !== "string" || vibe.length === 0) {
    return NextResponse.json({ error: "vibe is required" }, { status: 400 });
  }
  if (typeof budget !== "number" || !Number.isFinite(budget) || budget <= 0) {
    return NextResponse.json({ error: "budget must be a positive number" }, { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey });

  async function callOnce(userText: string): Promise<string> {
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: image,
              },
            },
            { type: "text", text: userText },
          ],
        },
      ],
    });

    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    if (!text) throw new Error("empty model response");
    return text;
  }

  let design: DesignResponse;
  try {
    const raw = await callOnce(buildUserPrompt(vibe, budget));
    try {
      design = validateDesign(extractJson(raw));
    } catch {
      // Second chance with stricter prompt
      const raw2 = await callOnce(stricterRetryPrompt(vibe, budget));
      design = validateDesign(extractJson(raw2));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `design generation failed: ${message}` },
      { status: 502 },
    );
  }

  return NextResponse.json(design);
}
