import { mkdir, readFile, rename, writeFile } from "node:fs/promises";

export type GenerationJobStatus = "queued" | "processing" | "completed" | "failed";

export type GenerationJob = {
  id: string;
  requestId: string;
  status: GenerationJobStatus;
  stage: "queued" | "analyzing" | "generating" | "rendering" | "completed" | "failed";
  message: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  resultMode?: "seedream-generation" | "local-fallback";
  error?: { code: string; message: string; upstreamStatus?: number };
};

type GenerationInput = {
  requestId: string;
  sceneBytes: Buffer;
  identityBytes: Buffer | null;
  identityType: string | null;
  contentSummary: string;
  location: string;
  outfitStyle: string;
  bodyType: string;
  bodyShapeInstruction: string;
  statureInstruction: string;
  heightCm: number;
  weightLabel: string;
  poseStyle: string;
  poseInstruction: string;
};

class GenerationFailure extends Error {
  constructor(
    readonly code: string,
    readonly publicMessage: string,
    readonly upstreamStatus?: number,
  ) {
    super(code);
  }
}

function jobsRoot() {
  return (process.env.AI_JOB_DIR ?? "/tmp/scene-fit-ai-jobs").replace(/\/$/, "");
}

function jobDirectory(jobId: string) {
  if (!/^[0-9a-f-]{36}$/.test(jobId)) throw new Error("INVALID_JOB_ID");
  return `${jobsRoot()}/${jobId}`;
}

function statusFile(jobId: string) {
  return `${jobDirectory(jobId)}/status.json`;
}

export function resultFile(jobId: string) {
  return `${jobDirectory(jobId)}/result.jpg`;
}

async function writeJob(job: GenerationJob) {
  const target = statusFile(job.id);
  const temporary = `${target}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(job), { mode: 0o600 });
  await rename(temporary, target);
}

async function updateJob(job: GenerationJob, patch: Partial<GenerationJob>) {
  Object.assign(job, patch, { updatedAt: new Date().toISOString() });
  await writeJob(job);
}

function imageDataUrl(bytes: Buffer, mimeType: string) {
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

function decodeImageResult(base64: string) {
  const normalized = base64.includes(",") ? base64.slice(base64.indexOf(",") + 1) : base64;
  if (normalized.length < 1_000 || normalized.length > 30_000_000) throw new GenerationFailure("INVALID_IMAGE_RESULT", "生图服务返回了无效图片");
  const bytes = Buffer.from(normalized, "base64");
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const isPng = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if (bytes.length < 1_000 || (!isJpeg && !isPng && !isWebp)) throw new GenerationFailure("INVALID_IMAGE_RESULT", "生图服务没有返回有效图片");
  return bytes;
}

async function imageFromSeedreamResponse(response: Response) {
  const payload = await response.json().catch(() => null) as {
    data?: Array<{ b64_json?: unknown; url?: unknown }>;
    error?: { message?: unknown };
    message?: unknown;
  } | null;
  const first = payload?.data?.[0];
  if (typeof first?.b64_json === "string") return decodeImageResult(first.b64_json);
  if (typeof first?.url === "string") {
    const imageResponse = await fetch(first.url);
    if (!imageResponse.ok) throw new GenerationFailure("IMAGE_DOWNLOAD_FAILED", "生成图片下载失败", imageResponse.status);
    return decodeImageResult(Buffer.from(await imageResponse.arrayBuffer()).toString("base64"));
  }
  const upstreamMessage = typeof payload?.error?.message === "string"
    ? payload.error.message
    : typeof payload?.message === "string" ? payload.message : undefined;
  throw new GenerationFailure("EMPTY_IMAGE_RESULT", upstreamMessage ?? "Seedream 已结束处理，但没有返回生成图片");
}

function promptFor(input: GenerationInput) {
  const identityInstruction = input.identityBytes
    ? "Image 2 is an authorized identity reference. Preserve that adult person's recognizable facial identity while replacing the model in Image 1."
    : "No separate identity image was supplied. Preserve the adult person visible in Image 1 while re-rendering the photograph.";

  return `GOAL
Create one personalized, photorealistic vertical fashion photograph from the supplied reference images.

REFERENCE ROLES
- Image 1 is authoritative for the location, background identity, complete garment inventory, garment colors and materials, accessories, and lighting atmosphere.
- Image 1 is NOT authoritative for the original model's body silhouette, exact pose, limb placement, head direction, subject placement, or camera crop. These must be re-staged.
- ${identityInstruction}

PERSONALIZED BODY — MUST BE VISIBLY APPLIED
- Target measurements: ${input.heightCm} cm and ${input.weightLabel}; render ${input.statureInstruction}.
- Target body shape: ${input.bodyType}; ${input.bodyShapeInstruction}.
- Reconstruct the subject from the neck down around these target proportions. Do not inherit or average toward the body shape of the model in Image 1 or the identity board.
- Adapt garment fit, folds and drape naturally to the target shoulders, waist, hips, thighs and limb proportions. Keep the body realistic and non-exaggerated; do not turn every body type into a slim hourglass.

PERSONALIZED POSE AND CAMERA — MUST DIFFER FROM IMAGE 1
- Pose direction: ${input.poseStyle}; ${input.poseInstruction}.
- The final pose must differ from Image 1 in at least four visible ways: head direction, arm arrangement, torso angle, hip/weight distribution, and leg position.
- Recompose as a full-body or head-to-calf fashion frame so the shoulders, waist, hips and leg proportions are visible. Do not hide the silhouette behind crossed arms, a bag, foreground objects or a tight crop.

PRESERVE AND FINISH
- Preserve the complete outfit and recognizable scene from Image 1, but allow subject placement and framing to change for the new pose.
- Styling direction: ${input.outfitStyle}. Context: ${input.contentSummary}. Location: ${input.location}.
- Show exactly one adult with natural anatomy and a coherent shadow/contact with the ground.
- No text, logos, watermarks, duplicate people, extra limbs, invented garments or unrelated accessories.`;
}

async function runGeneration(job: GenerationJob, input: GenerationInput) {
  try {
    if (!process.env.IMAGE_API_KEY) {
      await writeFile(resultFile(job.id), input.sceneBytes, { mode: 0o600 });
      await updateJob(job, {
        status: "completed",
        stage: "completed",
        message: "本地演示结果已就绪",
        resultMode: "local-fallback",
      });
      return;
    }

    await updateJob(job, { status: "processing", stage: "analyzing", message: "正在整理场景、形象与身体数据" });
    const referenceImages = [imageDataUrl(input.sceneBytes, "image/jpeg")];
    if (input.identityBytes && input.identityType) {
      referenceImages.push(imageDataUrl(input.identityBytes, input.identityType));
    }

    await updateJob(job, { stage: "generating", message: "Seedream 5.0 Lite 正在生成个性化场景穿搭" });
    const endpoint = process.env.IMAGE_API_BASE_URL ?? "https://ark.cn-beijing.volces.com/api/plan/v3/images/generations";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.IMAGE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.IMAGE_API_MODEL ?? "doubao-seedream-5.0-lite",
        prompt: promptFor(input),
        image: referenceImages,
        size: process.env.IMAGE_API_SIZE ?? "2K",
        sequential_image_generation: "disabled",
        stream: false,
        response_format: "b64_json",
        watermark: false,
      }),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      console.error("Seedream upstream request failed", { requestId: input.requestId, status: response.status, detail });
      const authenticationFailed = response.status === 401 || response.status === 403;
      const message = authenticationFailed
        ? "生图服务鉴权失败，请联系管理员检查配置"
        : response.status === 429 ? "生成请求较多，请稍后重试" : `生图服务返回错误（${response.status}）`;
      const code = authenticationFailed ? "UPSTREAM_AUTH_FAILED" : response.status === 429 ? "RATE_LIMITED" : "UPSTREAM_ERROR";
      throw new GenerationFailure(code, message, response.status);
    }

    await updateJob(job, { stage: "rendering", message: "Seedream 已生成画面，正在保存最终结果" });
    const result = await imageFromSeedreamResponse(response);
    await writeFile(resultFile(job.id), result, { mode: 0o600 });
    await updateJob(job, {
      status: "completed",
      stage: "completed",
      message: "AI 场景试穿已生成",
      resultMode: "seedream-generation",
    });
  } catch (error) {
    const failure = error instanceof GenerationFailure
      ? error
      : new GenerationFailure("GENERATION_FAILED", "生成连接意外中断，请重试");
    console.error("generation job failed", {
      requestId: input.requestId,
      jobId: job.id,
      code: failure.code,
      upstreamStatus: failure.upstreamStatus,
      error: error instanceof Error ? error.message : "UNKNOWN",
    });
    await updateJob(job, {
      status: "failed",
      stage: "failed",
      message: failure.publicMessage,
      error: { code: failure.code, message: failure.publicMessage, upstreamStatus: failure.upstreamStatus },
    });
  }
}

export async function createGenerationJob(input: GenerationInput) {
  const now = new Date();
  const job: GenerationJob = {
    id: crypto.randomUUID(),
    requestId: input.requestId,
    status: "queued",
    stage: "queued",
    message: "生成任务已创建",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1_000).toISOString(),
  };
  await mkdir(jobDirectory(job.id), { recursive: true, mode: 0o700 });
  await writeJob(job);
  void runGeneration(job, input);
  return job;
}

export async function readGenerationJob(jobId: string) {
  try {
    return JSON.parse(await readFile(statusFile(jobId), "utf8")) as GenerationJob;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}
