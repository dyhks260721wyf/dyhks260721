import { readFile } from "node:fs/promises";
import path from "node:path";
import OpenAI, { toFile } from "openai";
import { findVideo } from "@/lib/content";

export const runtime = "nodejs";
export const maxDuration = 180;

const weightLabels: Record<string, string> = {
  under_50: "under 50 kg",
  "50_60": "50 to 60 kg",
  "60_70": "60 to 70 kg",
  "70_85": "70 to 85 kg",
  over_85: "over 85 kg",
};

function publicFile(assetUrl: string) {
  const safePath = assetUrl.replace(/^\/+/, "");
  if (!safePath.startsWith("media/images/")) throw new Error("INVALID_ASSET_PATH");
  return path.join(process.cwd(), "public", safePath);
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  let fallbackBytes: Buffer | null = null;

  try {
    const form = await request.formData();
    const videoId = String(form.get("videoId") ?? "");
    const video = findVideo(videoId);
    const heightCm = Number(form.get("heightCm") ?? 168);
    const weightRange = String(form.get("weightRange") ?? "50_60");
    const outfitStyle = String(form.get("outfitStyle") ?? "womenswear");
    const consentAccepted = String(form.get("consentAccepted")) === "true";
    const identity = form.get("identityBoard");

    if (!video || !video.eligible) {
      return Response.json({ code: "VIDEO_NOT_ELIGIBLE", message: "当前内容暂不支持 AI 上身", requestId }, { status: 400 });
    }
    if (!consentAccepted) {
      return Response.json({ code: "CONSENT_REQUIRED", message: "请先确认人像使用授权", requestId }, { status: 400 });
    }
    if (!Number.isFinite(heightCm) || heightCm < 140 || heightCm > 210 || !weightLabels[weightRange]) {
      return Response.json({ code: "INVALID_INPUT", message: "请检查身高和体重范围", requestId }, { status: 400 });
    }

    const sceneBytes = await readFile(publicFile(video.posterUrl));
    fallbackBytes = sceneBytes;

    if (!process.env.IMAGE_API_KEY) {
      await new Promise((resolve) => setTimeout(resolve, 1100));
      return new Response(sceneBytes, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "no-store",
          "X-Request-Id": requestId,
          "X-Demo-Mode": "local-fallback",
        },
      });
    }

    let identityBytes = sceneBytes;
    let identityType = "image/jpeg";
    const hasUploadedIdentity = identity instanceof File && identity.size > 0;
    if (hasUploadedIdentity) {
      if (identity.size > 4 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(identity.type)) {
        return Response.json({ code: "INVALID_IMAGE", message: "人像图片需为 JPEG、PNG 或 WebP，且不超过 4MB", requestId }, { status: 400 });
      }
      identityBytes = Buffer.from(await identity.arrayBuffer());
      identityType = identity.type;
    }

    const imageClient = new OpenAI({
      apiKey: process.env.IMAGE_API_KEY,
      baseURL: process.env.IMAGE_API_BASE_URL ?? "https://api.8989886.xyz/v1",
      timeout: 95_000,
      maxRetries: 0,
    });
    const imageInputs = [toFile(sceneBytes, "scene-and-look.jpg", { type: "image/jpeg" })];
    if (hasUploadedIdentity) imageInputs.push(toFile(identityBytes, "identity", { type: identityType }));
    const images = await Promise.all(imageInputs);

    const identityInstruction = hasUploadedIdentity
      ? "Image 2 is the identity reference. Replace the model in Image 1 with the recognizable adult person from Image 2."
      : "Preserve the recognizable adult person already shown in Image 1, but re-render the shot as a new polished fashion photograph.";
    const prompt = `Create one photorealistic vertical fashion image.
Image 1 is the authoritative background, composition, and complete outfit reference.
${identityInstruction}
Keep the full outfit and original scene atmosphere from Image 1.
Use an approximate height of ${heightCm} cm and weight range ${weightLabels[weightRange]} for natural body proportions.
The requested styling direction is ${outfitStyle === "menswear" ? "menswear" : "womenswear"}.
Show exactly one adult person. Keep anatomy natural. Do not add text, logos, watermarks, extra garments, or unrelated accessories.`;

    const result = await imageClient.images.edit({
      model: process.env.IMAGE_API_MODEL ?? "gpt-image-2",
      image: images,
      prompt,
      size: "512x768",
      quality: "low",
      output_format: "jpeg",
      output_compression: 85,
    });

    const base64 = result.data?.[0]?.b64_json;
    if (!base64) throw new Error("EMPTY_IMAGE_RESULT");

    return new Response(Buffer.from(base64, "base64"), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "no-store",
        "X-Request-Id": requestId,
        "X-Demo-Mode": "compatible-gateway",
      },
    });
  } catch (error) {
    const apiError = error instanceof OpenAI.APIError ? error : null;
    const code = apiError?.code === "moderation_blocked" ? "MODERATION_BLOCKED" : apiError?.status === 429 ? "RATE_LIMITED" : "GENERATION_FAILED";
    const message = code === "MODERATION_BLOCKED" ? "当前输入无法生成，请更换照片后重试" : code === "RATE_LIMITED" ? "生成请求较多，请稍后重试" : "生成没有完成，请保留输入后重试";
    console.error("generate failed", { requestId, code, status: apiError?.status, upstreamRequestId: apiError?.requestID });

    const canFallback = fallbackBytes !== null && process.env.IMAGE_API_FALLBACK !== "false" && code === "GENERATION_FAILED";
    if (canFallback && fallbackBytes !== null) {
      return new Response(new Uint8Array(fallbackBytes), {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "no-store",
          "X-Request-Id": requestId,
          "X-Demo-Mode": "gateway-fallback",
          "X-Upstream-Status": String(apiError?.status ?? "timeout"),
        },
      });
    }
    return Response.json({ code, message, requestId }, { status: apiError?.status === 429 ? 429 : 500 });
  }
}
