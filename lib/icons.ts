// Picks a simple emoji icon based on keywords in the item name.
// Gemini sometimes returns a text word like "curtain" in the emoji field
// instead of an actual emoji character, which looks bad in the ui. This
// function ignores whatever came back from Gemini and derives a clean
// icon from the product name so the shopping list and the price pins
// always render a small visual cue.
export function categoryIcon(name: string): string {
  const n = (name ?? "").toLowerCase();

  // lighting
  if (n.includes("string light") || n.includes("fairy")) return "\u2728";
  if (
    n.includes("lamp") ||
    n.includes("sconce") ||
    n.includes("bulb") ||
    n.includes("led") ||
    n.includes("light")
  )
    return "\ud83d\udca1";
  if (n.includes("candle")) return "\ud83d\udd6f\ufe0f";

  // textiles
  if (n.includes("curtain") || n.includes("blind") || n.includes("drape"))
    return "\ud83e\ude9f";
  if (n.includes("rug") || n.includes("mat")) return "\ud83e\uddf6";
  if (n.includes("pillow") || n.includes("cushion")) return "\ud83d\udecf\ufe0f";
  if (n.includes("throw") || n.includes("blanket")) return "\ud83e\uddf5";
  if (
    n.includes("bedding") ||
    n.includes("sheet") ||
    n.includes("duvet") ||
    n.includes("comforter") ||
    n.includes("quilt")
  )
    return "\ud83d\udecf\ufe0f";

  // wall decor
  if (
    n.includes("mirror")
  )
    return "\ud83e\ude9e";
  if (
    n.includes("art") ||
    n.includes("print") ||
    n.includes("poster") ||
    n.includes("frame") ||
    n.includes("painting") ||
    n.includes("wall hanging") ||
    n.includes("tapestry")
  )
    return "\ud83d\uddbc\ufe0f";
  if (n.includes("clock")) return "\ud83d\udd70\ufe0f";

  // storage
  if (
    n.includes("bin") ||
    n.includes("basket") ||
    n.includes("crate") ||
    n.includes("storage") ||
    n.includes("organizer") ||
    n.includes("box")
  )
    return "\ud83e\uddfa";
  if (n.includes("shelf") || n.includes("bookshelf") || n.includes("shelving"))
    return "\ud83d\udcda";
  if (n.includes("hook") || n.includes("rack") || n.includes("hanger"))
    return "\ud83e\ude9d";

  // furniture
  if (n.includes("chair") || n.includes("stool") || n.includes("seat"))
    return "\ud83e\ude91";
  if (n.includes("desk") || n.includes("table") || n.includes("nightstand"))
    return "\ud83e\ude91";

  // green stuff
  if (
    n.includes("plant") ||
    n.includes("planter") ||
    n.includes("pot") ||
    n.includes("greenery") ||
    n.includes("flower")
  )
    return "\ud83e\udeb4";

  // tech and accents
  if (n.includes("speaker") || n.includes("audio") || n.includes("sound"))
    return "\ud83d\udd0a";
  if (n.includes("diffuser") || n.includes("scent")) return "\ud83c\udf43";
  if (n.includes("vase")) return "\ud83c\udffa";

  // fallback
  return "\u2728";
}
