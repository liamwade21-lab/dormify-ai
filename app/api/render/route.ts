import { NextResponse } from "next/server";

// This route used to call Gemini to render a new image of the room.
// It has been retired. Dormify now shows the user's original uploaded
// photo in the results view with product pins and placement tips on top.
// Kept as a stub so old clients get a clean response instead of a crash.
export const runtime = "nodejs";

export async function POST() {
    return NextResponse.json(
      {
              error: "image rendering is no longer available. the app now uses your original photo.",
      },
      { status: 410 },
        );
}
