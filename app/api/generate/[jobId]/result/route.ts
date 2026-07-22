import { readFile } from "node:fs/promises";
import { readGenerationJob, resultFile } from "@/lib/ai-generation";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = await readGenerationJob(jobId);
  if (!job) return Response.json({ code: "JOB_NOT_FOUND", message: "生成任务不存在或已过期" }, { status: 404 });
  if (job.status !== "completed") return Response.json({ code: "RESULT_NOT_READY", message: "生成结果尚未完成" }, { status: 409 });

  try {
    const result = await readFile(resultFile(job.id));
    return new Response(new Uint8Array(result), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, no-store",
        "X-Request-Id": job.requestId,
        "X-Demo-Mode": job.resultMode ?? "sol-image-generation",
        "X-Orchestrator-Model": process.env.VISION_ORCHESTRATOR_MODEL ?? "gpt-5.6-sol",
        "X-Image-Tool": "image_generation (gpt-image-2)",
      },
    });
  } catch {
    return Response.json({ code: "RESULT_MISSING", message: "生成结果文件不存在" }, { status: 404 });
  }
}
