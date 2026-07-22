import { requireAdmin } from "@/lib/admin-auth";
import { listManagedVideos } from "@/lib/video-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return Response.json(
    { items: await listManagedVideos() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
