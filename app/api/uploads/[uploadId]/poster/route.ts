import { readFile } from "node:fs/promises";
import { readUserContent, userContentFile } from "@/lib/user-content";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ uploadId: string }> }) {
  const { uploadId } = await params;
  const record = await readUserContent(uploadId);
  if (!record) return Response.json({ code: "UPLOAD_NOT_FOUND", message: "上传内容不存在" }, { status: 404 });

  const bytes = await readFile(userContentFile(record, "poster"));
  return new Response(bytes, {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store",
    },
  });
}
