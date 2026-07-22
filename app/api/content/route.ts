import { NextResponse } from "next/server";
import { contentManifest } from "@/lib/content";
import { listUserContent } from "@/lib/user-content";

export const dynamic = "force-dynamic";

export async function GET() {
  const uploaded = await listUserContent();
  return NextResponse.json({
    ...contentManifest,
    videos: [...contentManifest.videos, ...uploaded.map((record) => record.video)],
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
