import type { DesignResponse, DesignItem, ColorSwatch, Store } from "./types";

const VALID_STORES: readonly Store[] = ["Amazon", "Target", "IKEA"] as const;

export function extractJson(raw: string): unknown {
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("no JSON object found in response");
  }
  const slice = raw.slice(first, last + 1);
  return JSON.parse(slice);
}

export function validateDesign(value: unknown): DesignResponse {
  if (!isRecord(value)) throw new Error("response is not an object");

  const vibeName = requireString(value, "vibeName");
  const tagline = requireString(value, "tagline");
  const description = requireString(value, "description");
  const imagePrompt = requireString(value, "imagePrompt");

  const moodWords = requireStringArray(value, "moodWords");
  const changesNeeded = requireStringArray(value, "changesNeeded");

  const colorPalette = requireArray(value, "colorPalette").map(validateSwatch);
  const items = requireArray(value, "items").map(validateItem);

  if (items.length < 1) throw new Error("items array is empty");

  return {
    vibeName,
    tagline,
    description,
    moodWords,
    colorPalette,
    changesNeeded,
    imagePrompt,
    items,
  };
}

function validateSwatch(value: unknown): ColorSwatch {
  if (!isRecord(value)) throw new Error("swatch is not an object");
  return {
    name: requireString(value, "name"),
    hex: requireString(value, "hex"),
  };
}

function validateItem(value: unknown): DesignItem {
  if (!isRecord(value)) throw new Error("item is not an object");
  const storeRaw = requireString(value, "store");
  if (!VALID_STORES.includes(storeRaw as Store)) {
    throw new Error(`invalid store: ${storeRaw}`);
  }
  const priceRaw = value.price;
  if (typeof priceRaw !== "number" || !Number.isFinite(priceRaw)) {
    throw new Error("price is not a number");
  }
  const placement = value.placement;
  if (!isRecord(placement)) throw new Error("placement missing");
  const px = placement.x;
  const py = placement.y;
  if (typeof px !== "number" || typeof py !== "number") {
    throw new Error("placement.x/y not numbers");
  }

  return {
    name: requireString(value, "name"),
    description: requireString(value, "description"),
    price: priceRaw,
    store: storeRaw as Store,
    searchQuery: requireString(value, "searchQuery"),
    emoji: requireString(value, "emoji"),
    placement: {
      x: clampPct(px),
      y: clampPct(py),
      note: requireString(placement, "note"),
    },
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function requireString(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  if (typeof v !== "string" || v.length === 0) {
    throw new Error(`missing or empty string: ${key}`);
  }
  return v;
}

function requireArray(obj: Record<string, unknown>, key: string): unknown[] {
  const v = obj[key];
  if (!Array.isArray(v)) throw new Error(`missing array: ${key}`);
  return v;
}

function requireStringArray(obj: Record<string, unknown>, key: string): string[] {
  const arr = requireArray(obj, key);
  return arr.map((v, i) => {
    if (typeof v !== "string") throw new Error(`${key}[${i}] is not a string`);
    return v;
  });
}

function clampPct(n: number): number {
  if (Number.isNaN(n)) return 50;
  return Math.max(0, Math.min(100, n));
}
