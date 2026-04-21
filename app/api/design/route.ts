import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { extractJson, validateDesign } from "@/lib/validate";
import type { DesignApiRequest, DesignResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const PRIMARY_MODEL = "claude-sonnet-4-5";
const FALLBACK_MODEL = "claude-haiku-4-5";

const SYSTEM_PROMPT = `You are the creative director for Dormify AI, a room redesign tool for college students and young renters. You study a room photo and return a styling plan by calling the submit_design tool.

Rules:
- Always call the submit_design tool. Do not respond with text.
- Return exactly 6 to 8 items.
- Total price must be under the user's budget but close to it (within 15 percent of the budget ceiling).
- Mix categories: include lighting, textiles (rug, throw, curtains, bedding), wall decor, storage, and accents.
- Use real, common product names you can find on Amazon, Target, or IKEA. Store must be exactly one of "Amazon", "Target", "IKEA".
- placement.x and placement.y are percentages (0 to 100) from the top-left of the image where the price pin should sit, over the spot that item occupies in the redesigned room.
- Spread the pins out. No two pins should overlap. Keep each pin at least 8 units away from every other pin on each axis.
- imagePrompt is one dense paragraph describing the full redesigned room. Preserve the original layout, walls, windows, doors, perspective, and ceiling height. Only change furniture, textiles, lighting, wall art, and decor to match the vibe.
- Lowercase playful copy in vibeName, tagline, description, moodWords.
- hex colors are #rrggbb.
- emoji is one relevant emoji for the item.
- Never use curly or smart quotes inside any string. Use plain ASCII characters only.`;

// Tool schema that mirrors DesignResponse. Claude is forced to call this tool,
// which guarantees we receive structured JSON and avoids hand-written parse errors.
const DESIGN_TOOL: Anthropic.Tool = {
  name: "submit_design",
  description:
    "Submit the full room redesign plan as structured data. Always call this tool with the complete design.",
  input_schema: {
    type: "object",
    properties: {
      vibeName: { type: "string", description: "2 to 4 words, lowercase" },
      tagline: { type: "string", description: "one punchy sentence" },
      description: {
        type: "string",
        description: "2 to 3 sentences about how the room will feel",
      },
      moodWords: {
        type: "array",
        items: { type: "string" },
        description: "exactly five lowercase words",
      },
      colorPalette: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            hex: { type: "string", description: "format #rrggbb" },
          },
          required: ["name", "hex"],
        },
      },
      changesNeeded: {
        type: "array",
        items: { type: "string" },
        description: "short bullets about things to remove or modify",
      },
      imagePrompt: {
        type: "string",
        description: "one dense paragraph describing the redesigned room",
      },
      items: {
        type: "array",
        description: "6 to 8 product items",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "specific product name" },
            description: { type: "string", description: "short reason it fits" },
            price: { type: "number" },
            store: {
              type: "string",
              enum: ["Amazon", "Target", "IKEA"],
            },
            searchQuery: { type: "string", description: "keywords" },
            emoji: { type: "string", description: "one emoji" },
            placement: {
              type: "object",
              properties: {
                x: { type: "number", description: "0 to 100" },
                y: { type: "number", description: "0 to 100" },
                note: {
                  type: "string",
                  description: "where it goes, short phrase",
                },
              },
              required: ["x", "y", "note"],
            },
          },
          required: [
            "name",
            "description",
            "price",
            "store",
            "searchQuery",
            "emoji",
            "placement",
          ],
        },
      },
    },
    required: [
      "vibeName",
      "tagline",
      "description",
      "moodWords",
      "colorPalette",
      "changesNeeded",
      "imagePrompt",
      "items",
    ],
  },
};

function buildUserPrompt(vibe: string, budget: number): string {
  return `vibe: ${vibe}
budget ceiling: $${budget}

Call the submit_design tool with the full styling plan.`;
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

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function isOverloadError(err: unknown): boolean {
    if (!err) return false;
    const anyErr = err as { status?: number; message?: string };
    const status = anyErr.status;
    if (status === 503 || status === 529 || status === 502 || status === 504 || status === 429) {
      return true;
    }
    const msg = (anyErr.message ?? String(err)).toLowerCase();
    return (
      msg.includes("overloaded") ||
      msg.includes("high demand") ||
      msg.includes("service unavailable") ||
      msg.includes("503") ||
      msg.includes("529")
    );
  }

  // Single call to the model with forced tool use. Returns the raw tool input
  // object (already parsed by the SDK, so no JSON syntax errors possible).
  async function callToolOnce(model: string, userText: string): Promise<unknown> {
    const msg = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [DESIGN_TOOL],
      tool_choice: { type: "tool", name: DESIGN_TOOL.name },
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

    for (const block of msg.content) {
      if (block.type === "tool_use" && block.name === DESIGN_TOOL.name) {
        return block.input;
      }
    }

    // Very rare: model returned text instead of calling the tool. Try to
    // pull JSON out of the text as a last resort.
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    if (text) {
      return extractJson(text);
    }
    throw new Error("model returned no tool call and no text");
  }

  // Retry wrapper. Retries on overload errors with backoff (2s, 4s, 8s).
  // Falls back to the smaller model after the primary keeps failing.
  async function callWithRetry(userText: string): Promise<unknown> {
    const delays = [2000, 4000, 8000];
    let lastErr: unknown = null;
    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        return await callToolOnce(PRIMARY_MODEL, userText);
      } catch (err) {
        lastErr = err;
        if (attempt < delays.length && isOverloadError(err)) {
          await sleep(delays[attempt]);
          continue;
        }
        // Not an overload, or ran out of retries. Try the fallback model once.
        try {
          return await callToolOnce(FALLBACK_MODEL, userText);
        } catch (fallbackErr) {
          throw fallbackErr;
        }
      }
    }
    throw lastErr;
  }

  let design: DesignResponse;
  try {
    const raw = await callWithRetry(buildUserPrompt(vibe, budget));
    design = validateDesign(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const anyErr = err as { status?: number };
    const isOverload = isOverloadError(err);
    return NextResponse.json(
      {
        error: isOverload
          ? "the design model is busy right now. please try again in a moment."
          : `design generation failed: ${message}`,
      },
      { status: anyErr.status && anyErr.status >= 500 ? 503 : 502 },
    );
  }

  return NextResponse.json(design);
}
