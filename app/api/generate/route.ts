import { readFile } from "node:fs/promises";
import path from "node:path";
import { createGenerationJob } from "@/lib/ai-generation";
import { findVideo } from "@/lib/content";

export const runtime = "nodejs";

const weightLabels: Record<string, string> = {
  under_50: "under 50 kg",
  "50_60": "50 to 60 kg",
  "60_70": "60 to 70 kg",
  "70_85": "70 to 85 kg",
  over_85: "over 85 kg",
};

const bodyTypeLabels: Record<string, string> = {
  hourglass: "hourglass",
  triangle: "inverted triangle",
  pear: "pear",
  rectangle: "rectangle",
};

function publicFile(assetUrl: string) {
  const safePath = assetUrl.replace(/^\/+/, "");
  if (!safePath.startsWith("media/images/")) throw new Error("INVALID_ASSET_PATH");
  return path.join(process.cwd(), "public", safePath);
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    const form = await request.formData();
    const videoId = String(form.get("videoId") ?? "");
    const video = findVideo(videoId);
    const heightCm = Number(form.get("heightCm") ?? 168);
    const weightRange = String(form.get("weightRange") ?? "50_60");
    const bodyType = String(form.get("bodyType") ?? "hourglass");
    const outfitStyle = String(form.get("outfitStyle") ?? "womenswear");
    const consentAccepted = String(form.get("consentAccepted")) === "true";
    const identity = form.get("identityBoard");

    if (!video || !video.eligible) {
      return Response.json({ code: "VIDEO_NOT_ELIGIBLE", message: "当前内容暂不支持 AI 上身", requestId }, { status: 400 });
    }
    if (!consentAccepted) {
      return Response.json({ code: "CONSENT_REQUIRED", message: "请先确认人像使用授权", requestId }, { status: 400 });
    }
    if (!Number.isFinite(heightCm) || heightCm < 140 || heightCm > 210 || !weightLabels[weightRange] || !bodyTypeLabels[bodyType]) {
      return Response.json({ code: "INVALID_INPUT", message: "请检查身高、体重和身材类型", requestId }, { status: 400 });
    }

    const sceneBytes = await readFile(publicFile(video.posterUrl));
    let identityBytes: Buffer | null = null;
    let identityType: string | null = null;
    if (identity instanceof File && identity.size > 0) {
      if (identity.size > 4 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(identity.type)) {
        return Response.json({ code: "INVALID_IMAGE", message: "人像图片需为 JPEG、PNG 或 WebP，且不超过 4MB", requestId }, { status: 400 });
      }
      identityBytes = Buffer.from(await identity.arrayBuffer());
      identityType = identity.type;
    }

    const job = await createGenerationJob({
      requestId,
      sceneBytes,
      identityBytes,
      identityType,
      contentSummary: video.analysis.summary,
      location: video.location,
      outfitStyle: outfitStyle === "menswear" ? "menswear" : "womenswear",
      bodyType: bodyTypeLabels[bodyType],
      heightCm,
      weightLabel: weightLabels[weightRange],
    });

    return Response.json(
      {
        jobId: job.id,
        status: job.status,
        statusUrl: `/api/generate/${job.id}`,
      },
      { status: 202, headers: { "Cache-Control": "no-store", "X-Request-Id": requestId } },
    );
  } catch (error) {
    console.error("create generation job failed", { requestId, error: error instanceof Error ? error.message : "UNKNOWN" });
    return Response.json({ code: "GENERATION_JOB_FAILED", message: "生成任务创建失败，请稍后重试", requestId }, { status: 500 });
  }
}
