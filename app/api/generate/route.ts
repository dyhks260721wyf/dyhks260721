import { readFile } from "node:fs/promises";
import path from "node:path";
import OpenAI, { toFile } from "openai";
import { findVideo } from "@/lib/content";

export const runtime = "nodejs";
export const maxDuration = 240;

const gatewayUserAgent =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36";

const weightLabels: Record<string, string> = {
  under_50: "under 50 kg",
  "50_60": "50 to 60 kg",
  "60_70": "60 to 70 kg",
  "70_85": "70 to 85 kg",
  over_85: "over 85 kg",
};

type ImageToolArguments = {
  prompt: string;
  visual_analysis?: string;
};

function publicFile(assetUrl: string) {
  const safePath = assetUrl.replace(/^\/+/, "");
  if (!safePath.startsWith("media/images/")) throw new Error("INVALID_ASSET_PATH");
  return path.join(process.cwd(), "public", safePath);
}

function imageDataUrl(bytes: Buffer, mimeType: string) {
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

function parseImageToolArguments(rawArguments: string | undefined): ImageToolArguments {
  if (!rawArguments) throw new Error("EMPTY_IMAGE_TOOL_CALL");
  const parsed = JSON.parse(rawArguments) as Partial<ImageToolArguments>;
  if (typeof parsed.prompt !== "string" || parsed.prompt.trim().length < 80 || parsed.prompt.length > 5_000) {
    throw new Error("INVALID_IMAGE_TOOL_PROMPT");
  }
  return {
    prompt: parsed.prompt.trim(),
    visual_analysis: typeof parsed.visual_analysis === "string" ? parsed.visual_analysis.slice(0, 1_500) : undefined,
  };
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

    const gatewayClient = new OpenAI({
      apiKey: process.env.IMAGE_API_KEY,
      baseURL: process.env.IMAGE_API_BASE_URL ?? "https://api.8989886.xyz/v1",
      timeout: 110_000,
      maxRetries: 0,
      defaultHeaders: {
        "User-Agent": gatewayUserAgent,
      },
    });
    const imageInputs = [toFile(sceneBytes, "scene-and-look.jpg", { type: "image/jpeg" })];
    if (hasUploadedIdentity) imageInputs.push(toFile(identityBytes, "identity", { type: identityType }));
    const images = await Promise.all(imageInputs);

    const identityInstruction = hasUploadedIdentity
      ? "Image 2 is an authorized identity reference. Preserve that adult person's recognizable facial identity while replacing the model in Image 1."
      : "No separate identity image was supplied. Preserve the adult person visible in Image 1 while re-rendering the photograph.";
    const orchestration = await gatewayClient.chat.completions.create({
      model: process.env.VISION_ORCHESTRATOR_MODEL ?? "gpt-5.6-sol",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `You are the vision director for an AI fashion try-on service.
Analyze every supplied image before acting. Identify the visible adult, complete outfit, pose, camera framing, lighting, background, and scene atmosphere.
You must call the generate_image tool exactly once. The tool prompt must be a production-ready English image-editing instruction that tells an image model what to preserve and what to change.
Treat Image 1 as the authoritative scene, composition, and complete outfit reference. Never invent garments that are not visible. Preserve identity only from the authorized identity reference.
Require exactly one adult person, natural anatomy, photorealism, and no text, logos, watermarks, duplicate people, extra limbs, or unrelated accessories.
Do not answer with prose outside the tool call.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Prepare one vertical fashion image edit.
Content context: ${video.analysis.summary}
Location: ${video.location}
Styling direction: ${outfitStyle === "menswear" ? "menswear" : "womenswear"}
Approximate body proportions: ${heightCm} cm, ${weightLabels[weightRange]}.
${identityInstruction}
The final tool prompt must explicitly preserve the full outfit, original scene atmosphere, lighting direction, and camera composition from Image 1.`,
            },
            { type: "image_url", image_url: { url: imageDataUrl(sceneBytes, "image/jpeg"), detail: "high" } },
            ...(hasUploadedIdentity
              ? [{ type: "image_url" as const, image_url: { url: imageDataUrl(identityBytes, identityType), detail: "high" as const } }]
              : []),
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "generate_image",
            description: "Generate the final try-on image using the supplied scene and identity references.",
            parameters: {
              type: "object",
              additionalProperties: false,
              properties: {
                visual_analysis: {
                  type: "string",
                  description: "A concise description of the recognized outfit, person, scene, pose, lighting, and composition.",
                },
                prompt: {
                  type: "string",
                  description: "A complete English image-editing prompt for the downstream image model.",
                },
              },
              required: ["visual_analysis", "prompt"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "generate_image" } },
    });

    const toolCall = orchestration.choices[0]?.message.tool_calls?.find(
      (call) => call.type === "function" && call.function.name === "generate_image",
    );
    if (!toolCall || toolCall.type !== "function") throw new Error("MISSING_IMAGE_TOOL_CALL");
    const toolArguments = parseImageToolArguments(toolCall.function.arguments);

    const result = await gatewayClient.images.edit({
      model: process.env.IMAGE_API_MODEL ?? "gpt-image-2",
      image: images,
      prompt: toolArguments.prompt,
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
        "X-Orchestrator-Model": process.env.VISION_ORCHESTRATOR_MODEL ?? "gpt-5.6-sol",
        "X-Image-Model": process.env.IMAGE_API_MODEL ?? "gpt-image-2",
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
