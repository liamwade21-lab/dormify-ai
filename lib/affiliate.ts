// Wraps outbound product links with the amazon associates tag when possible.
// Non amazon links pass through unchanged. Malformed urls also pass through
// unchanged so the ui never breaks on a bad string.
//
// The tag is read from NEXT_PUBLIC_AMAZON_TAG so it can be set in vercel
// under project settings, environment variables. it is public because this
// runs in the browser and the tag is meant to be visible in the url.
export function withAffiliateTag(url: string): string {
  const tag = process.env.NEXT_PUBLIC_AMAZON_TAG ?? "";
  if (!tag) return url;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.toLowerCase().includes("amazon")) {
      return url;
    }
    parsed.searchParams.set("tag", tag);
    return parsed.toString();
  } catch {
    return url;
  }
}
