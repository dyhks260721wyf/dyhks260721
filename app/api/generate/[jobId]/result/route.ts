import { readFile } from "node:fs/promises";
import { readGenerationJob, resultFile } from "@/lib/ai-generation";

export const runtime = "nodejs";

function imageContentType(result: Buffer) {
  if (result[0] === 0xff && result[1] === 0xd8) return "image/jpeg";
  if (result.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (result.subarray(0, 4).toString("ascii") === "RIFF" && result.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return "application/octet-stream";
}

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = await readGenerationJob(jobId);
  if (!job) return Response.json({ code: "JOB_NOT_FOUND", message: "生成任务不存在或已过期" }, { status: 404 });
  if (job.status !== "completed") return Response.json({ code: "RESULT_NOT_READY", message: "生成结果尚未完成" }, { status: 409 });

  try {
    const result = await readFile(resultFile(job.id));
    return new Response(new Uint8Array(result), {
      headers: {
        "Content-Type": imageContentType(result),
        "Cache-Control": "private, no-store",
        "X-Request-Id": job.requestId,
        "X-Demo-Mode": job.resultMode ?? "seedream-generation",
        "X-Image-Model": job.resultMode === "sol-image-generation"
          ? process.env.SOL_ORCHESTRATOR_MODEL ?? "gpt-5.6-sol"
          : process.env.IMAGE_API_MODEL ?? "doubao-seedream-5.0-lite",
      },
    });
  } catch {
    return Response.json({ code: "RESULT_MISSING", message: "生成结果文件不存在" }, { status: 404 });
  }
}
