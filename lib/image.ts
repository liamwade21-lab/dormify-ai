/**
 * Resize an image file client side to max 1024px on long edge,
 * encode as JPEG at 85% quality, return a base64 string (no data URL prefix).
 */
export async function resizeToBase64(file: File, maxEdge = 1024, quality = 0.85): Promise<string> {
  const bitmap = await fileToBitmap(file);
  const { width, height } = scaleTo(bitmap.width, bitmap.height, maxEdge);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context unavailable");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))),
      "image/jpeg",
      quality,
    );
  });

  const arrayBuf = await blob.arrayBuffer();
  return arrayBufferToBase64(arrayBuf);
}

async function fileToBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // fall through
    }
  }
  // fallback using an Image element
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("image load failed"));
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d context unavailable");
    ctx.drawImage(img, 0, 0);
    return (await createImageBitmap(canvas)) as ImageBitmap;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function scaleTo(w: number, h: number, maxEdge: number): { width: number; height: number } {
  if (w <= maxEdge && h <= maxEdge) return { width: w, height: h };
  if (w >= h) {
    return { width: maxEdge, height: Math.round((h * maxEdge) / w) };
  }
  return { width: Math.round((w * maxEdge) / h), height: maxEdge };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}
