import { readGenerationJob } from "@/lib/ai-generation";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = await readGenerationJob(jobId);
  if (!job) return Response.json({ code: "JOB_NOT_FOUND", message: "生成任务不存在或已过期" }, { status: 404 });

  return Response.json(
    {
      jobId: job.id,
      requestId: job.requestId,
      status: job.status,
      stage: job.stage,
      message: job.message,
      generationMode: job.generationMode,
      resultMode: job.resultMode,
      resultUrl: job.status === "completed" ? `/api/generate/${job.id}/result` : undefined,
      error: job.error,
      productStatus: job.productStatus,
      productMessage: job.productMessage,
      products: job.products,
      productError: job.productError,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
