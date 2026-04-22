import { NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { validateDesign } from "@/lib/validate";
import type { DesignApiRequest, DesignResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// Tried in order. If one hits a quota or overload error, the next is tried.
// Free tier quotas differ between models, so a chain helps a lot.
// Note: gemini-1.5-flash was retired from the v1beta API and now returns 404,
// so the chain uses only current 2.x models.
// Keep the chain short so total worst-case latency stays well under the
// 60s Vercel function cap and the browser does not hit a 504 gateway timeout.
const MODEL_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-flash-lite",
] as const;

// Hard cap per model call. If Gemini takes longer than this, we abort and
// fall through to the next model instead of letting the whole serverless
// function time out.
const PER_CALL_TIMEOUT_MS = 15000;

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
  // Enforces PER_CALL_TIMEOUT_MS so a slow model cannot hold up the chain.
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

    const generatePromise = model.generateContent([
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: image,
        },
      },
      { text: userText },
    ]);

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`model call timed out after ${PER_CALL_TIMEOUT_MS}ms`)),
        PER_CALL_TIMEOUT_MS,
      );
    });

    const result = (await Promise.race([generatePromise, timeoutPromise])) as Awaited<
      typeof generatePromise
    >;

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

  // Try each model in the chain once. Do a single quick retry (1s) only for
  // transient overload errors. Move on immediately for quota or hard errors.
  // Keeping this fast is what prevents 504s at the Vercel edge.
  async function callWithRetryAndFallback(userText: string): Promise<unknown> {
    let lastErr: unknown = null;

    for (const modelName of MODEL_CHAIN) {
      try {
        return await callOnce(modelName, userText);
      } catch (err) {
        lastErr = err;
        // Quota or hard errors: skip to next model immediately.
        if (isQuotaError(err) || !isRetryableError(err)) {
          continue;
        }
        // One quick retry for transient overloads.
        await sleep(1000);
        try {
          return await callOnce(modelName, userText);
        } catch (err2) {
          lastErr = err2;
          continue;
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
