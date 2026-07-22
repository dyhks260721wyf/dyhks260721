import { createUserContent, listUserContent } from "@/lib/user-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxMediaBytes = 60 * 1024 * 1024;
const maxPosterBytes = 8 * 1024 * 1024;
const mediaTypes = new Map<string, "video" | "image">([
  ["video/mp4", "video"],
  ["video/webm", "video"],
  ["image/jpeg", "image"],
  ["image/png", "image"],
  ["image/webp", "image"],
]);

export async function GET() {
  const records = await listUserContent();
  return Response.json(
    { videos: records.map((record) => record.video) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const form = await request.formData();
    const media = form.get("media");
    const poster = form.get("posterFrame");

    if (!(media instanceof File) || media.size === 0) {
      return Response.json({ code: "MEDIA_REQUIRED", message: "请选择一段视频或一张图片", requestId }, { status: 400 });
    }
    const mediaType = mediaTypes.get(media.type);
    if (!mediaType) {
      return Response.json({ code: "UNSUPPORTED_MEDIA", message: "仅支持 MP4、WebM、JPEG、PNG 或 WebP", requestId }, { status: 415 });
    }
    if (media.size > maxMediaBytes) {
      return Response.json({ code: "MEDIA_TOO_LARGE", message: "上传文件不能超过 60MB", requestId }, { status: 413 });
    }
    if (!(poster instanceof File) || poster.type !== "image/jpeg" || poster.size === 0 || poster.size > maxPosterBytes) {
      return Response.json({ code: "INVALID_POSTER", message: "媒体预览帧需为不超过 8MB 的 JPEG", requestId }, { status: 400 });
    }

    const record = await createUserContent({
      originalName: media.name,
      mediaType,
      mediaMimeType: media.type,
      mediaBytes: Buffer.from(await media.arrayBuffer()),
      posterBytes: Buffer.from(await poster.arrayBuffer()),
    });

    return Response.json(
      { video: record.video, requestId },
      { status: 201, headers: { "Cache-Control": "no-store", "X-Request-Id": requestId } },
    );
  } catch (error) {
    console.error("user media upload failed", { requestId, error: error instanceof Error ? error.message : "UNKNOWN" });
    return Response.json({ code: "UPLOAD_FAILED", message: "上传失败，请稍后重试", requestId }, { status: 500 });
  }
}
