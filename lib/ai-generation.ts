import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import type { ProductPreset } from "@/lib/content";
import { seedreamTryOnSystemPrompt, solTryOnSystemPrompt } from "@/lib/generation-prompts";
import { updateUserContentProducts } from "@/lib/user-content";

export type GenerationJobStatus = "queued" | "processing" | "completed" | "failed";
export type GenerationMode = "fast" | "refined";

const gatewayUserAgent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36";

export type GenerationJob = {
  id: string;
  requestId: string;
  status: GenerationJobStatus;
  stage: "queued" | "analyzing" | "generating" | "rendering" | "completed" | "failed";
  message: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  generationMode: GenerationMode;
  resultMode?: "seedream-generation" | "sol-image-generation" | "local-fallback";
  error?: { code: string; message: string; upstreamStatus?: number };
  productStatus: "not_required" | "queued" | "analyzing" | "completed" | "failed";
  productMessage?: string;
  products: ProductPreset[];
  productError?: { code: string; message: string; upstreamStatus?: number };
};

type GenerationInput = {
  requestId: string;
  sceneBytes: Buffer;
  identityBytes: Buffer | null;
  identityType: string | null;
  revisionBytes: Buffer | null;
  revisionType: string | null;
  revisionPrompt: string | null;
  contentSummary: string;
  location: string;
  outfitStyle: string;
  bodyType: string;
  bodyShapeInstruction: string;
  statureInstruction: string;
  heightCm: number;
  weightLabel: string;
  analyzeProducts: boolean;
  productImageUrl: string;
  productOwnerId: string | null;
  generationMode: GenerationMode;
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
  const payload = JSON.stringify(job);
  const previous = jobWriteQueues.get(job.id) ?? Promise.resolve();
  const current = previous.then(async () => {
    await writeFile(temporary, payload, { mode: 0o600 });
    await rename(temporary, target);
  });
  jobWriteQueues.set(job.id, current);
  try {
    await current;
  } finally {
    if (jobWriteQueues.get(job.id) === current) jobWriteQueues.delete(job.id);
  }
}

const jobWriteQueues = new Map<string, Promise<void>>();

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

function imageResultFromSolEvent(event: unknown) {
  if (!event || typeof event !== "object") return null;
  const value = event as {
    item?: { type?: string; result?: unknown };
    response?: { output?: Array<{ type?: string; result?: unknown }> };
  };
  if (value.item?.type === "image_generation_call" && typeof value.item.result === "string") return value.item.result;
  const imageOutput = value.response?.output?.find((item) => item.type === "image_generation_call" && typeof item.result === "string");
  return typeof imageOutput?.result === "string" ? imageOutput.result : null;
}

async function consumeSolStream(response: Response, job: GenerationJob) {
  if (!response.body) throw new GenerationFailure("EMPTY_UPSTREAM_STREAM", "精细生成服务没有返回数据", response.status);
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
    const result = imageResultFromSolEvent(event);
    if (result) finalResult = result;

    if (event.type === "response.image_generation_call.in_progress" && currentStage !== "generating") {
      currentStage = "generating";
      await updateJob(job, { stage: "generating", message: "Sol 已调用 image2，正在精细生成画面" });
    } else if (event.type === "response.image_generation_call.partial_image" && currentStage !== "rendering") {
      currentStage = "rendering";
      await updateJob(job, { stage: "rendering", message: "image2 已生成画面，正在完成细节渲染" });
    } else if (event.type === "response.failed" || event.type === "error") {
      throw new GenerationFailure("SOL_GENERATION_FAILED", event.error?.message ?? "精细生成服务返回失败");
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

const generationQualityBaseline = `UNIVERSAL QUALITY BASELINE — APPLY TO EVERY GENERATION
- Produce a visually refined, aesthetically coherent fashion photograph with a clear subject, balanced negative space, intentional depth, and a believable camera viewpoint. The result should feel editorial yet natural, not stiff, theatrical, over-posed, or template-like.
- Keep the person's posture physically plausible: stable center of gravity, relaxed shoulders, natural spinal and pelvic alignment, believable joint angles, and purposeful but unforced placement of the head, arms, hands, hips, legs, and feet.
- Make the face attractive but recognizable and human: natural expression and gaze, realistic facial proportions, detailed eyes, coherent hairline and hair strands, and skin texture without waxy smoothing or uncanny symmetry.
- Render hands and feet carefully with correct anatomy, five distinct fingers per visible hand, natural grip and finger spacing, complete shoes, and no fused, missing, duplicated, twisted, or cropped limbs.
- Make clothing behave like real material: correct layering, closures, seams, thickness, gravity, folds, tension, and contact with the personalized body. Avoid melted fabric, floating accessories, body-clipping garments, or unexplained changes to the Look.
- Unify the person and environment with one consistent light direction, color temperature, perspective, scale, focus falloff, contact shadow, reflections, and weather response. The person must look photographed inside the scene rather than pasted onto it.
- Preserve realistic photographic detail and dynamic range. Avoid plastic skin, excessive sharpening, oversaturation, muddy textures, halos, warped architecture, distracting clutter, visual artifacts, or accidental text.
- Before finalizing, repair any unnatural anatomy, awkward pose, broken clothing physics, implausible lighting, poor crop, or distracting background element. Return only one polished vertical photograph.`;

function withQualityBaseline(taskPrompt: string) {
  return `${taskPrompt.trim()}\n\n${generationQualityBaseline}`;
}

function promptFor(input: GenerationInput) {
  if (input.revisionBytes && input.revisionPrompt) {
    const identityReference = input.identityBytes
      ? "Image 3 is the authorized identity reference. Preserve that adult person's recognizable face."
      : "Keep the same recognizable adult identity already present in Image 1.";

    return withQualityBaseline(`GOAL
Create one new photorealistic vertical fashion photograph by revising the current generated Look.

REFERENCE ROLES
- Image 1 is the current generated version and is authoritative for the person's identity, personalized body proportions, and the current complete outfit.
- Image 2 is the original video frame and is a fallback reference for garment colors, materials, accessories, and overall Look continuity.
- ${identityReference}

USER'S EDIT REQUEST — HIGHEST PRIORITY FOR THE NEW VERSION
${input.revisionPrompt}

REVISION RULES
- Apply the request visibly and decisively. A scene request must produce a recognizably different environment; a pose request must visibly change head direction, arms, torso, hips, and/or legs as appropriate.
- Preserve the person's recognizable identity, target body shape (${input.bodyType}), target stature (${input.heightCm} cm, ${input.weightLabel}), and realistic anatomy.
- Preserve the complete outfit by default. Only change clothing or accessories if the user explicitly asks for that change.
- Keep garment fit and drape natural for ${input.statureInstruction}; ${input.bodyShapeInstruction}.
- Recompose as a full-body or head-to-calf portrait unless the user explicitly asks for another crop.
- Show exactly one adult with coherent lighting, ground contact, and shadow.
- No text, logos, watermarks, duplicate people, extra limbs, or unintended garments.

CONTEXT
Original location: ${input.location}. Styling direction: ${input.outfitStyle}. Original content: ${input.contentSummary}.`);
  }

  const identityInstruction = input.identityBytes
    ? "Image 2 is an authorized identity reference. Preserve that adult person's recognizable facial identity while replacing the model in Image 1."
    : "No separate identity image was supplied. Preserve the adult person visible in Image 1 while re-rendering the photograph.";

  return withQualityBaseline(`GOAL
Create one personalized, photorealistic vertical fashion photograph from the supplied reference images.

REFERENCE ROLES
- Image 1 is authoritative for the location, background identity, complete garment inventory, garment colors and materials, accessories, and lighting atmosphere.
- Image 1 is authoritative for the original pose, limb placement, head direction, subject placement, camera angle and crop. Preserve them closely, making only the minimum anatomical adjustments needed to fit the personalized body naturally.
- ${identityInstruction}

PERSONALIZED BODY — MUST BE VISIBLY APPLIED
- Target measurements: ${input.heightCm} cm and ${input.weightLabel}; render ${input.statureInstruction}.
- Target body shape: ${input.bodyType}; ${input.bodyShapeInstruction}.
- Reconstruct the subject from the neck down around these target proportions. Do not inherit or average toward the body shape of the model in Image 1 or the identity board.
- Adapt garment fit, folds and drape naturally to the target shoulders, waist, hips, thighs and limb proportions. Keep the body realistic and non-exaggerated; do not turn every body type into a slim hourglass.

PRESERVE AND FINISH
- Preserve the complete outfit and recognizable scene from Image 1, while composing a natural full-body or head-to-calf fashion frame that clearly shows the personalized proportions.
- Styling direction: ${input.outfitStyle}. Context: ${input.contentSummary}. Location: ${input.location}.
- Show exactly one adult with natural anatomy and a coherent shadow/contact with the ground.
- No text, logos, watermarks, duplicate people, extra limbs, invented garments or unrelated accessories.`);
}

function seedreamPromptFor(input: GenerationInput) {
  return `${seedreamTryOnSystemPrompt}\n\n【当前任务与个性化数据】\n${promptFor(input)}`;
}

function solPromptFor(input: GenerationInput) {
  return `You are the sole vision reasoning and image-generation orchestrator for an authorized AI fashion try-on.
Analyze every supplied reference image and all requirements yourself. Then invoke the built-in image_generation tool backed specifically by image2 / gpt-image-2. Do not merely write or return a prompt, do not ask the caller to invoke another image API, and do not finish with a text-only answer. Wait for the image tool and return exactly one final generated image.

Use the image tool at high quality. Before invoking it, reconcile identity, personalized body proportions, outfit inventory, pose, environment, perspective and lighting into one coherent generation instruction. After generation, inspect the result conceptually against the constraints and prioritize natural anatomy, realistic garment physics and a polished photographic finish.

GENERATION TASK
${promptFor(input)}`;
}

async function runSolGeneration(job: GenerationJob, input: GenerationInput) {
  try {
    const apiKey = process.env.SOL_API_KEY;
    if (!apiKey) throw new GenerationFailure("SOL_NOT_CONFIGURED", "精细生成服务尚未配置");

    await updateJob(job, {
      status: "processing",
      stage: "analyzing",
      message: input.revisionBytes ? "Sol 正在理解你的修改要求" : "Sol 正在精细分析场景、形象与身体数据",
    });
    const content: Array<Record<string, unknown>> = [{ type: "input_text", text: solPromptFor(input) }];
    if (input.revisionBytes && input.revisionType) {
      content.push({ type: "input_image", image_url: imageDataUrl(input.revisionBytes, input.revisionType), detail: "high" });
    }
    content.push({ type: "input_image", image_url: imageDataUrl(input.sceneBytes, "image/jpeg"), detail: "high" });
    if (input.identityBytes && input.identityType) {
      content.push({ type: "input_image", image_url: imageDataUrl(input.identityBytes, input.identityType), detail: "high" });
    }

    const baseUrl = (process.env.SOL_API_BASE_URL ?? "https://api.8989886.xyz/v1").replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": gatewayUserAgent,
      },
      body: JSON.stringify({
        model: process.env.SOL_ORCHESTRATOR_MODEL ?? "gpt-5.6-sol",
        input: [
          { role: "system", content: [{ type: "input_text", text: solTryOnSystemPrompt }] },
          { role: "user", content },
        ],
        tools: [{
          type: "image_generation",
          quality: "high",
          size: "1024x1536",
          output_format: "jpeg",
          output_compression: 92,
        }],
        stream: true,
      }),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      console.error("Sol upstream request failed", { requestId: input.requestId, status: response.status, detail });
      const authenticationFailed = response.status === 401 || response.status === 403;
      const message = authenticationFailed
        ? "精细生成服务鉴权失败，请联系管理员检查配置"
        : response.status === 429 ? "精细生成请求较多，请稍后重试" : `精细生成服务返回错误（${response.status}）`;
      throw new GenerationFailure(authenticationFailed ? "SOL_AUTH_FAILED" : response.status === 429 ? "RATE_LIMITED" : "SOL_UPSTREAM_ERROR", message, response.status);
    }

    const result = await consumeSolStream(response, job);
    await writeFile(resultFile(job.id), result, { mode: 0o600 });
    await updateJob(job, {
      status: "completed",
      stage: "completed",
      message: input.revisionBytes ? "精细修改版本已生成" : "精细场景 Look 已生成",
      resultMode: "sol-image-generation",
    });
  } catch (error) {
    const failure = error instanceof GenerationFailure
      ? error
      : new GenerationFailure("SOL_GENERATION_FAILED", "精细生成连接意外中断，请重试");
    console.error("Sol generation job failed", {
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

async function runGeneration(job: GenerationJob, input: GenerationInput) {
  if (input.generationMode === "refined") {
    await runSolGeneration(job, input);
    return;
  }
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

    await updateJob(job, {
      status: "processing",
      stage: "analyzing",
      message: input.revisionBytes ? "正在理解你的修改需求" : "正在整理场景、形象与身体数据",
    });
    const referenceImages = input.revisionBytes && input.revisionType
      ? [imageDataUrl(input.revisionBytes, input.revisionType), imageDataUrl(input.sceneBytes, "image/jpeg")]
      : [imageDataUrl(input.sceneBytes, "image/jpeg")];
    if (input.identityBytes && input.identityType) referenceImages.push(imageDataUrl(input.identityBytes, input.identityType));

    await updateJob(job, {
      stage: "generating",
      message: input.revisionBytes ? "Seedream 正在按你的想法生成新版本" : "Seedream 5.0 Lite 正在生成个性化场景穿搭",
    });
    const endpoint = process.env.IMAGE_API_BASE_URL ?? "https://ark.cn-beijing.volces.com/api/plan/v3/images/generations";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.IMAGE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.IMAGE_API_MODEL ?? "doubao-seedream-5.0-lite",
        prompt: seedreamPromptFor(input),
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
      message: input.revisionBytes ? "新的 Look 版本已生成" : "AI 场景试穿已生成",
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

type LunaProduct = { name?: unknown; category?: unknown; priceLabel?: unknown; note?: unknown; focusX?: unknown; focusY?: unknown };

function cleanProductText(value: unknown, fallback: string, maxLength: number) {
  return (typeof value === "string" ? value.trim() : "").slice(0, maxLength) || fallback;
}

function productFocus(value: unknown, fallback: number) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : fallback;
}

function parseLunaProducts(content: string, imageUrl: string) {
  const normalized = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = normalized.indexOf("{");
  const end = normalized.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("LUNA_INVALID_JSON");
  const payload = JSON.parse(normalized.slice(start, end + 1)) as { items?: unknown };
  if (!Array.isArray(payload.items)) throw new Error("LUNA_ITEMS_MISSING");

  return payload.items.slice(0, 6).flatMap((raw, index) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as LunaProduct;
    const category = cleanProductText(item.category, "穿搭单品", 20);
    return [{
      id: `luna-${index + 1}`,
      name: cleanProductText(item.name, `${category}相似款`, 42),
      category,
      priceLabel: cleanProductText(item.priceLabel, "¥199 起", 18),
      imageUrl,
      imagePosition: `${productFocus(item.focusX, 50)}% ${productFocus(item.focusY, 50)}%`,
      note: cleanProductText(item.note, "根据暂停画面识别的同风格商品", 72),
    } satisfies ProductPreset];
  });
}

async function runProductAnalysis(job: GenerationJob, input: GenerationInput) {
  try {
    const baseUrl = (process.env.LUNA_API_BASE_URL ?? "https://api.8989886.xyz/v1").replace(/\/$/, "");
    const apiKey = process.env.LUNA_API_KEY;
    if (!apiKey) throw new GenerationFailure("LUNA_NOT_CONFIGURED", "穿搭商品识别服务尚未配置");

    await updateJob(job, {
      productStatus: "analyzing",
      productMessage: "Luna 正在识别暂停画面中的穿搭单品",
    });
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.LUNA_API_MODEL ?? "gpt-5.6-luna",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: "你是短视频穿搭商品分析师。只分析画面中清晰可见的服装、鞋、包、帽子和配饰，不推断人物身份或敏感属性。输出严格 JSON，不要 Markdown。商品是同风格示例，不得声称识别出确切品牌。",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "识别这张暂停关键帧里的完整穿搭，按视觉重要性返回 1 到 6 件可购买单品。focusX、focusY 是该单品在图片中的中心点百分比（0 到 100），用于裁切商品缩略图。输出格式：{\"items\":[{\"name\":\"具体但不虚构品牌的商品名\",\"category\":\"品类\",\"priceLabel\":\"合理人民币示例价格，如 ¥299 起\",\"note\":\"颜色、材质、版型及与场景的搭配理由\",\"focusX\":50,\"focusY\":60}]}。没有清晰服装时 items 返回空数组。",
              },
              { type: "image_url", image_url: { url: imageDataUrl(input.sceneBytes, "image/jpeg") } },
            ],
          },
        ],
      }),
    });
    const payload = await response.json().catch(() => null) as {
      choices?: Array<{ message?: { content?: unknown } }>;
      error?: { message?: unknown };
    } | null;
    if (!response.ok) {
      const publicMessage = response.status === 401 || response.status === 403
        ? "穿搭商品识别服务鉴权失败"
        : response.status === 429 ? "穿搭识别请求较多，暂未返回商品" : `穿搭商品识别返回错误（${response.status}）`;
      console.error("Luna product analysis failed", { requestId: input.requestId, status: response.status, detail: payload?.error?.message });
      throw new GenerationFailure("LUNA_UPSTREAM_ERROR", publicMessage, response.status);
    }
    const rawContent = payload?.choices?.[0]?.message?.content;
    const content = typeof rawContent === "string"
      ? rawContent
      : Array.isArray(rawContent)
        ? rawContent.flatMap((item) => item && typeof item === "object" && "text" in item && typeof item.text === "string" ? [item.text] : []).join("")
        : "";
    const products = parseLunaProducts(content, input.productImageUrl);
    if (input.productOwnerId) await updateUserContentProducts(input.productOwnerId, products);
    await updateJob(job, {
      productStatus: "completed",
      productMessage: products.length ? `Luna 已整理 ${products.length} 件相似商品` : "Luna 未在关键帧中识别到清晰单品",
      products,
    });
  } catch (error) {
    const failure = error instanceof GenerationFailure
      ? error
      : new GenerationFailure("LUNA_ANALYSIS_FAILED", "穿搭商品识别没有完成");
    console.error("Luna product analysis ended without products", {
      requestId: input.requestId,
      jobId: job.id,
      code: failure.code,
      error: error instanceof Error ? error.message : "UNKNOWN",
    });
    await updateJob(job, {
      productStatus: "failed",
      productMessage: failure.publicMessage,
      products: [],
      productError: { code: failure.code, message: failure.publicMessage, upstreamStatus: failure.upstreamStatus },
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
    generationMode: input.generationMode,
    productStatus: input.analyzeProducts ? "queued" : "not_required",
    productMessage: input.analyzeProducts ? "等待识别暂停画面中的穿搭单品" : undefined,
    products: [],
  };
  await mkdir(jobDirectory(job.id), { recursive: true, mode: 0o700 });
  await writeJob(job);
  void runGeneration(job, input);
  if (input.analyzeProducts) void runProductAnalysis(job, input);
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
