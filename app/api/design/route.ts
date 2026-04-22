import { NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { validateDesign } from "@/lib/validate";
import type { DesignApiRequest, DesignResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// Tried in order. If one hits a quota or overload error, the next is tried.
// Free tier quotas differ between models, so a chain helps a lot.
// Note: gemini-1.5-flash was retired from the v1beta API and now returns 404,
// so the chain uses only current 2.x models plus a lite fallback.
const MODEL_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite",
] as const;

const SYSTEM_PROMPT = `You are the creative director for Dormify AI, a room redesign tool for college students and young renters. You study a room photo and return a styling plan as structured JSON that matches the provided schema.

Rules:
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
- Use only plain ASCII characters in every string. No curly quotes, no em dashes, no smart punctuation.`;

// Schema for Gemini structured output. Mirrors DesignResponse exactly.
const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    vibeName: { type: SchemaType.STRING, description: "2 to 4 words, lowercase" },
    tagline: { type: SchemaType.STRING, description: "one punchy sentence" },
    description: {
      type: SchemaType.STRING,
      description: "2 to 3 sentences about how the room will feel",
    },
    moodWords: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "exactly five lowercase words",
    },
    colorPalette: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          hex: { type: SchemaType.STRING, description: "format #rrggbb" },
        },
        required: ["name", "hex"],
      },
    },
    changesNeeded: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "short bullets about things to remove or modify",
    },
    imagePrompt: {
      type: SchemaType.STRING,
      description: "one dense paragraph describing the redesigned room",
    },
    items: {
      type: SchemaType.ARRAY,
      description: "6 to 8 product items",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING, description: "specific product name" },
          description: { type: SchemaType.STRING, description: "short reason it fits" },
          price: { type: SchemaType.NUMBER },
          store: {
            type: SchemaType.STRING,
            enum: ["Amazon", "Target", "IKEA"],
            format: "enum",
          },
          searchQuery: { type: SchemaType.STRING },
          emoji: { type: SchemaType.STRING },
          placement: {
            type: SchemaType.OBJECT,
            properties: {
              x: { type: SchemaType.NUMBER, description: "0 to 100" },
              y: { type: SchemaType.NUMBER, description: "0 to 100" },
              note: { type: SchemaType.STRING },
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
};

function buildUserPrompt(vibe: string, budget: number): string {
  return `vibe: ${vibe}
budget ceiling: $${budget}

Return the styling plan as JSON matching the response schema.`;
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not set on the server" },
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

  const genai = new GoogleGenerativeAI(apiKey);

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function isRetryableError(err: unknown): boolean {
    if (!err) return false;
    const anyErr = err as { status?: number; message?: string };
    const status = anyErr.status;
    if (
      status === 429 ||
      status === 503 ||
      status === 502 ||
      status === 504 ||
      status === 529
    ) {
      return true;
    }
    const msg = (anyErr.message ?? String(err)).toLowerCase();
    return (
      msg.includes("429") ||
      msg.includes("503") ||
      msg.includes("too many requests") ||
      msg.includes("quota") ||
      msg.includes("overloaded") ||
      msg.includes("high demand") ||
      msg.includes("service unavailable")
    );
  }

  function isQuotaError(err: unknown): boolean {
    if (!err) return false;
    const anyErr = err as { status?: number; message?: string };
    if (anyErr.status === 429) return true;
    const msg = (anyErr.message ?? String(err)).toLowerCase();
    return msg.includes("quota") || msg.includes("429");
  }

  // One call to a specific model. Returns parsed JSON.
  async function callOnce(modelName: string, userText: string): Promise<unknown> {
    const model = genai.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA as never,
        temperature: 0.7,
      },
    });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: image,
        },
      },
      { text: userText },
    ]);

    const text = result.response.text();
    if (!text) throw new Error("empty model response");
    try {
      return JSON.parse(text);
    } catch (parseErr) {
      const message =
        parseErr instanceof Error ? parseErr.message : String(parseErr);
      throw new Error(`json parse failed: ${message}`);
    }
  }

  // Try each model in the chain. For each model, retry with backoff
  // (2s, 4s, 8s) if the error is a transient overload. Move to the next
  // model on quota errors immediately, since waiting will not help.
  async function callWithRetryAndFallback(userText: string): Promise<unknown> {
    const delays = [2000, 4000, 8000];
    let lastErr: unknown = null;

    for (const modelName of MODEL_CHAIN) {
      for (let attempt = 0; attempt <= delays.length; attempt++) {
        try {
          return await callOnce(modelName, userText);
        } catch (err) {
          lastErr = err;
          // Quota errors: skip to next model immediately.
          if (isQuotaError(err)) {
            break;
          }
          // Other transient errors: back off and retry on same model.
          if (attempt < delays.length && isRetryableError(err)) {
            await sleep(delays[attempt]);
            continue;
          }
          // Non transient error or out of retries on this model: try next.
          break;
        }
      }
    }
    throw lastErr ?? new Error("design generation failed");
  }

  let design: DesignResponse;
  try {
    const raw = await callWithRetryAndFallback(buildUserPrompt(vibe, budget));
    design = validateDesign(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const friendly = isQuotaError(err)
      ? "the design model is over its quota right now. please try again in a few minutes."
      : isRetryableError(err)
      ? "the design model is busy right now. please try again in a moment."
      : `design generation failed: ${message}`;
    return NextResponse.json({ error: friendly }, { status: 503 });
  }

  return NextResponse.json(design);
}
