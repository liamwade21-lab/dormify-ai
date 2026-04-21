import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { RenderApiRequest, RenderApiResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "gemini-2.5-flash-image";

const PRESERVE_INSTRUCTION = `Redesign this room's furniture, lighting, textiles, wall decor, and accents to match the style described below. Preserve the room's layout exactly: same walls, same windows, same doors, same ceiling height, same camera perspective and vantage point. Do not move the camera. Do not change the architecture. Keep any built-in fixtures. Produce a single photorealistic image of the redesigned room from the same angle as the original photo.`;

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not set on the server" },
      { status: 500 },
    );
  }

  let body: RenderApiRequest;
  try {
    body = (await req.json()) as RenderApiRequest;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { image, imagePrompt } = body;
  if (typeof image !== "string" || image.length === 0) {
    return NextResponse.json({ error: "image is required (base64 string)" }, { status: 400 });
  }
  if (typeof imagePrompt !== "string" || imagePrompt.length === 0) {
    return NextResponse.json({ error: "imagePrompt is required" }, { status: 400 });
  }

  try {
    const genai = new GoogleGenerativeAI(apiKey);
    const model = genai.getGenerativeModel({ model: MODEL });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: image,
        },
      },
      {
        text: `${PRESERVE_INSTRUCTION}\n\nStyle description:\n${imagePrompt}`,
      },
    ]);

    const response = result.response;
    const candidates = response.candidates ?? [];
    let imageBase64: string | null = null;
    for (const cand of candidates) {
      const parts = cand.content?.parts ?? [];
      for (const part of parts) {
        const anyPart = part as { inlineData?: { data?: string; mimeType?: string } };
        if (anyPart.inlineData?.data) {
          imageBase64 = anyPart.inlineData.data;
          break;
        }
      }
      if (imageBase64) break;
    }

    if (!imageBase64) {
      return NextResponse.json(
        { error: "gemini returned no image data" },
        { status: 502 },
      );
    }

    const payload: RenderApiResponse = { imageBase64 };
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `render failed: ${message}` },
      { status: 502 },
    );
  }
}
