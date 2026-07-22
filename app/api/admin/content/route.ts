import { requireAdmin } from "@/lib/admin-auth";
import { listManagedVideos, setVideoOrder } from "@/lib/video-catalog";

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

export async function PATCH(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const body = await request.json().catch(() => null) as { orderedVideoIds?: unknown } | null;
  if (!Array.isArray(body?.orderedVideoIds) || body.orderedVideoIds.some((id) => typeof id !== "string")) {
    return Response.json({ code: "INVALID_BODY", message: "orderedVideoIds 必须是视频 ID 数组" }, { status: 400 });
  }
  const updated = await setVideoOrder(body.orderedVideoIds as string[]);
  if (!updated) {
    return Response.json({ code: "INVALID_VIDEO_ORDER", message: "排序内容与当前视频流不一致，请刷新后重试" }, { status: 409 });
  }
  return Response.json({ updated: true, items: await listManagedVideos() });
}
