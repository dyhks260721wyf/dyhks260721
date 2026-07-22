import { NextResponse } from "next/server";
import { contentManifest } from "@/lib/content";
import { listFeedVideos } from "@/lib/video-catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ...contentManifest,
    videos: await listFeedVideos(),
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
