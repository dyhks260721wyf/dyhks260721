import { mkdir, readFile, rename, writeFile } from "node:fs/promises";

const gatewayUserAgent =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36";

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
  resultMode?: "sol-image-generation" | "local-fallback";
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
  heightCm: number;
  weightLabel: string;
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

function resultFromEvent(event: unknown): string | null {
  if (!event || typeof event !== "object") return null;
  const value = event as {
    item?: { type?: string; result?: unknown };
    response?: { output?: Array<{ type?: string; result?: unknown }> };
  };
  if (value.item?.type === "image_generation_call" && typeof value.item.result === "string") return value.item.result;
  const imageOutput = value.response?.output?.find((item) => item.type === "image_generation_call" && typeof item.result === "string");
  return typeof imageOutput?.result === "string" ? imageOutput.result : null;
}

function decodeImageResult(base64: string) {
  const normalized = base64.includes(",") ? base64.slice(base64.indexOf(",") + 1) : base64;
  if (normalized.length < 1_000 || normalized.length > 30_000_000) throw new GenerationFailure("INVALID_IMAGE_RESULT", "生图服务返回了无效图片");
  const bytes = Buffer.from(normalized, "base64");
  if (bytes.length < 1_000 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new GenerationFailure("INVALID_IMAGE_RESULT", "生图服务没有返回有效的 JPEG 图片");
  }
  return bytes;
}

async function consumeSolStream(response: Response, job: GenerationJob) {
  if (!response.body) throw new GenerationFailure("EMPTY_UPSTREAM_STREAM", "生图服务没有返回数据", response.status);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let finalResult: string | null = null;
  let currentStage = job.stage;

  const processLine = async (line: string) => {
    if (!line.startsWith("data: ") || line === "data: [DONE]") return;
    let event: { type?: string; error?: { message?: string } };
    try {
      event = JSON.parse(line.slice(6)) as typeof event;
    } catch {
      return;
    }

    const result = resultFromEvent(event);
    if (result) finalResult = result;

    if (event.type === "response.image_generation_call.in_progress" && currentStage !== "generating") {
      currentStage = "generating";
      await updateJob(job, { stage: "generating", message: "Sol 已调用 image-2，正在生成画面" });
    } else if (event.type === "response.image_generation_call.partial_image" && currentStage !== "rendering") {
      currentStage = "rendering";
      await updateJob(job, { stage: "rendering", message: "画面已生成，正在完成最终渲染" });
    } else if (event.type === "response.failed" || event.type === "error") {
      throw new GenerationFailure("UPSTREAM_GENERATION_FAILED", event.error?.message ?? "生图服务返回失败");
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    pending += decoder.decode(value, { stream: !done });
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";
    for (const line of lines) await processLine(line.trimEnd());
    if (done) break;
  }
  if (pending) await processLine(pending.trimEnd());
  if (!finalResult) throw new GenerationFailure("EMPTY_IMAGE_RESULT", "Sol 已结束处理，但没有返回生成图片");
  return decodeImageResult(finalResult);
}

function promptFor(input: GenerationInput) {
  const identityInstruction = input.identityBytes
    ? "Image 2 is an authorized identity reference. Preserve that adult person's recognizable facial identity while replacing the model in Image 1."
    : "No separate identity image was supplied. Preserve the adult person visible in Image 1 while re-rendering the photograph.";

  return `You are the sole vision and image-generation orchestrator for an authorized AI fashion try-on.
Analyze every supplied image yourself, then invoke the built-in image_generation tool backed specifically by gpt-image-2. Do not merely describe a prompt and do not ask the caller to invoke another image API. Wait for the image tool and return the final generated image.

Image 1 is the authoritative scene, complete outfit, pose, camera framing, lighting direction, background, and atmosphere reference. Never invent garments that are not visible. ${identityInstruction}

Content context: ${input.contentSummary}
Location: ${input.location}
Styling direction: ${input.outfitStyle}
Approximate body proportions: ${input.heightCm} cm, ${input.weightLabel}, ${input.bodyType} body type.

Generate exactly one photorealistic adult person with natural anatomy. Preserve the complete outfit and original scene composition from Image 1. Keep the authorized identity recognizable when Image 2 is present. Produce a vertical fashion photograph with no text, logos, watermarks, duplicate people, extra limbs, or unrelated accessories.`;
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

    await updateJob(job, { status: "processing", stage: "analyzing", message: "正在把场景与授权人像交给 Sol 分析" });
    const content: Array<Record<string, unknown>> = [
      { type: "input_text", text: promptFor(input) },
      { type: "input_image", image_url: imageDataUrl(input.sceneBytes, "image/jpeg"), detail: "high" },
    ];
    if (input.identityBytes && input.identityType) {
      content.push({ type: "input_image", image_url: imageDataUrl(input.identityBytes, input.identityType), detail: "high" });
    }

    const baseUrl = (process.env.IMAGE_API_BASE_URL ?? "https://api.8989886.xyz/v1").replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.IMAGE_API_KEY}`,
        "Content-Type": "application/json",
        "User-Agent": gatewayUserAgent,
      },
      body: JSON.stringify({
        model: process.env.VISION_ORCHESTRATOR_MODEL ?? "gpt-5.6-sol",
        input: [{ role: "user", content }],
        tools: [{
          type: "image_generation",
          quality: "low",
          size: "1024x1536",
          output_format: "jpeg",
          output_compression: 85,
        }],
        stream: true,
      }),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      console.error("Sol upstream request failed", { requestId: input.requestId, status: response.status, detail });
      const message = response.status === 429 ? "生成请求较多，请稍后重试" : `生图服务返回错误（${response.status}）`;
      throw new GenerationFailure(response.status === 429 ? "RATE_LIMITED" : "UPSTREAM_ERROR", message, response.status);
    }

    const result = await consumeSolStream(response, job);
    await writeFile(resultFile(job.id), result, { mode: 0o600 });
    await updateJob(job, {
      status: "completed",
      stage: "completed",
      message: "AI 场景试穿已生成",
      resultMode: "sol-image-generation",
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
