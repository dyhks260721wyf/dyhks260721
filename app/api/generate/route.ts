import { readFile } from "node:fs/promises";
import path from "node:path";
import { createGenerationJob } from "@/lib/ai-generation";
import { findVideo } from "@/lib/content";
import { readUserContent, userContentFile } from "@/lib/user-content";

export const runtime = "nodejs";

const weightLabels: Record<string, string> = {
  under_50: "under 50 kg",
  "50_60": "50 to 60 kg",
  "60_70": "60 to 70 kg",
  "70_85": "70 to 85 kg",
  over_85: "over 85 kg",
};

const bodyProfiles: Record<string, { label: string; instruction: string }> = {
  hourglass: {
    label: "hourglass",
    instruction: "shoulders and hips have similar visual width, with a clearly defined but natural waist",
  },
  triangle: {
    label: "inverted triangle",
    instruction: "shoulders and upper torso are visibly broader than the waist and hips, with comparatively narrower hips",
  },
  pear: {
    label: "pear",
    instruction: "shoulders are narrower than the hips, with a defined waist and naturally fuller hips and upper thighs",
  },
  rectangle: {
    label: "rectangle",
    instruction: "shoulders, waist and hips have closer visual widths, with a straighter torso and only a subtle waist definition",
  },
};

const poseProfiles: Record<string, { label: string; instruction: string }> = {
  candid: {
    label: "relaxed candid",
    instruction: "use a relaxed three-quarter stance, shift weight onto one leg, keep the arms naturally separated from the torso, and turn the head toward the scenery",
  },
  walking: {
    label: "walking motion",
    instruction: "capture a believable mid-step walk, with one foot clearly forward, natural counter-swing in the arms, a slight torso turn, and fabric reacting subtly to motion",
  },
  glance: {
    label: "over-the-shoulder glance",
    instruction: "turn the torso about 30 degrees away from camera, look back over one shoulder, use an asymmetric hip shift, and place the hands naturally without covering the waistline",
  },
  editorial: {
    label: "confident editorial",
    instruction: "create a confident asymmetric fashion pose with one leg extended, one elbow bent away from the body, a lifted chest, and a camera-aware head angle",
  },
};

const weightMidpoints: Record<string, number> = { under_50: 47, "50_60": 55, "60_70": 65, "70_85": 77, over_85: 90 };

function statureInstruction(heightCm: number, weightRange: string) {
  const bmi = weightMidpoints[weightRange] / ((heightCm / 100) ** 2);
  const heightShape = heightCm < 158
    ? "a shorter stature with proportionally compact vertical lines"
    : heightCm > 175
      ? "a taller stature with visibly longer vertical and limb proportions"
      : "a medium stature with balanced torso-to-leg proportions";
  const build = bmi < 19
    ? "a naturally lean frame"
    : bmi < 23.5
      ? "a balanced medium-light frame"
      : bmi < 27.5
        ? "a softly full medium frame"
        : "a fuller, sturdy frame";
  return `${heightShape} and ${build}`;
}

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
    const uploadedRecord = videoId.startsWith("user-") ? await readUserContent(videoId) : null;
    const video = findVideo(videoId) ?? uploadedRecord?.video;
    const heightCm = Number(form.get("heightCm") ?? 168);
    const weightRange = String(form.get("weightRange") ?? "50_60");
    const bodyType = String(form.get("bodyType") ?? "hourglass");
    const poseStyle = String(form.get("poseStyle") ?? "candid");
    const outfitStyle = String(form.get("outfitStyle") ?? "womenswear");
    const consentAccepted = String(form.get("consentAccepted")) === "true";
    const sceneFrame = form.get("sceneFrame");
    const identity = form.get("identityBoard");
    const revision = form.get("revisionImage");
    const revisionPrompt = String(form.get("revisionPrompt") ?? "").trim();

    if (!video || !video.eligible) {
      return Response.json({ code: "VIDEO_NOT_ELIGIBLE", message: "当前内容暂不支持 AI 上身", requestId }, { status: 400 });
    }
    if (!consentAccepted) {
      return Response.json({ code: "CONSENT_REQUIRED", message: "请先确认人像使用授权", requestId }, { status: 400 });
    }
    if (!Number.isFinite(heightCm) || heightCm < 140 || heightCm > 210 || !weightLabels[weightRange] || !bodyProfiles[bodyType] || !poseProfiles[poseStyle]) {
      return Response.json({ code: "INVALID_INPUT", message: "请检查身高、体重、身材类型和姿势偏好", requestId }, { status: 400 });
    }
    if ((revision instanceof File && revision.size > 0) !== Boolean(revisionPrompt)) {
      return Response.json({ code: "INVALID_REVISION", message: "继续修改时需要同时提供上一张图片和修改要求", requestId }, { status: 400 });
    }
    if (revisionPrompt.length > 300) {
      return Response.json({ code: "REVISION_TOO_LONG", message: "修改要求请控制在 300 字以内", requestId }, { status: 400 });
    }

    let sceneBytes: Buffer;
    if (sceneFrame instanceof File && sceneFrame.size > 0) {
      if (sceneFrame.size > 8 * 1024 * 1024 || sceneFrame.type !== "image/jpeg") {
        return Response.json({ code: "INVALID_SCENE_FRAME", message: "视频暂停帧需为 JPEG，且不超过 8MB", requestId }, { status: 400 });
      }
      sceneBytes = Buffer.from(await sceneFrame.arrayBuffer());
    } else {
      sceneBytes = uploadedRecord
        ? await readFile(userContentFile(uploadedRecord, "poster"))
        : await readFile(publicFile(video.posterUrl));
    }
    let identityBytes: Buffer | null = null;
    let identityType: string | null = null;
    if (identity instanceof File && identity.size > 0) {
      if (identity.size > 4 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(identity.type)) {
        return Response.json({ code: "INVALID_IMAGE", message: "人像图片需为 JPEG、PNG 或 WebP，且不超过 4MB", requestId }, { status: 400 });
      }
      identityBytes = Buffer.from(await identity.arrayBuffer());
      identityType = identity.type;
    }
    let revisionBytes: Buffer | null = null;
    let revisionType: string | null = null;
    if (revision instanceof File && revision.size > 0) {
      if (revision.size > 8 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(revision.type)) {
        return Response.json({ code: "INVALID_REVISION_IMAGE", message: "上一张结果需为 JPEG、PNG 或 WebP，且不超过 8MB", requestId }, { status: 400 });
      }
      revisionBytes = Buffer.from(await revision.arrayBuffer());
      revisionType = revision.type;
    }

    const job = await createGenerationJob({
      requestId,
      sceneBytes,
      identityBytes,
      identityType,
      revisionBytes,
      revisionType,
      revisionPrompt: revisionPrompt || null,
      contentSummary: video.analysis.summary,
      location: video.location,
      outfitStyle: outfitStyle === "menswear" ? "menswear" : "womenswear",
      bodyType: bodyProfiles[bodyType].label,
      bodyShapeInstruction: bodyProfiles[bodyType].instruction,
      statureInstruction: statureInstruction(heightCm, weightRange),
      heightCm,
      weightLabel: weightLabels[weightRange],
      poseStyle: poseProfiles[poseStyle].label,
      poseInstruction: poseProfiles[poseStyle].instruction,
      analyzeProducts: Boolean(video.userUploaded),
      productImageUrl: video.posterUrl,
      productOwnerId: video.userUploaded ? video.id : null,
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
