import { requireAdmin } from "@/lib/admin-auth";
import { deleteUserContent } from "@/lib/user-content";
import { listManagedVideos, setPresetActive } from "@/lib/video-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request: Request, { params }: { params: Promise<{ videoId: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { videoId } = await params;
  const managed = await listManagedVideos();
  const target = managed.find((item) => item.video.id === videoId);
  if (!target) return Response.json({ code: "NOT_FOUND", message: "视频不存在或已删除" }, { status: 404 });
  if (target.active && managed.filter((item) => item.active).length <= 1) {
    return Response.json({ code: "LAST_ACTIVE_VIDEO", message: "视频流至少需要保留一条内容" }, { status: 409 });
  }

  if (videoId.startsWith("user-")) {
    const deleted = await deleteUserContent(videoId);
    if (!deleted) return Response.json({ code: "NOT_FOUND", message: "视频不存在或已删除" }, { status: 404 });
    return Response.json({ deleted: true, permanent: true });
  }

  const hidden = await setPresetActive(videoId, false);
  if (!hidden) return Response.json({ code: "NOT_FOUND", message: "视频不存在" }, { status: 404 });
  return Response.json({ deleted: true, permanent: false });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ videoId: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { videoId } = await params;
  const body = await request.json().catch(() => null) as { active?: unknown } | null;
  if (typeof body?.active !== "boolean") {
    return Response.json({ code: "INVALID_BODY", message: "active 必须是布尔值" }, { status: 400 });
  }
  const updated = await setPresetActive(videoId, body.active);
  if (!updated) return Response.json({ code: "NOT_FOUND", message: "内置视频不存在" }, { status: 404 });
  return Response.json({ updated: true, active: body.active });
}
