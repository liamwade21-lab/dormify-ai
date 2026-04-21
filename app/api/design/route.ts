import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { validateDesign } from "@/lib/validate";
import type { DesignApiRequest, DesignResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT = `You are the creative director for Dormify AI, a room redesign tool for college students and young renters. You study a room photo and return a styling plan as a JSON object.

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
- Never use curly or smart quotes inside any string. Use plain ASCII characters only.`;

function buildUserPrompt(vibe: string, budget: number): string {
  return `vibe: ${vibe}
budget ceiling: $${budget}

Return a JSON object with the full styling plan.`;
}

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
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("503") ||
    msg.includes("529")
  );
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

  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
    } as Record<string, unknown>,
  });

  async function callOnce(): Promise<unknown> {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: image,
        },
      },
      buildUserPrompt(vibe, budget),
    ]);
    const text = result.response.text();
    return JSON.parse(text);
  }

  async function callWithRetry(): Promise<unknown> {
    const delays = [2000, 4000, 8000];
    let lastErr: unknown = null;
    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        return await callOnce();
      } catch (err) {
        lastErr = err;
        if (attempt < delays.length && isOverloadError(err)) {
          await sleep(delays[attempt]);
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  }

  let design: DesignResponse;
  try {
    const raw = await callWithRetry();
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
