import { readFile } from "node:fs/promises";
import { readUserContent, userContentFile } from "@/lib/user-content";

export const runtime = "nodejs";

function byteRange(rangeHeader: string, size: number) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
  if (!match) return null;
  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || start >= size) return null;
  return { start, end: Math.min(end, size - 1) };
}

export async function GET(request: Request, { params }: { params: Promise<{ uploadId: string }> }) {
  const { uploadId } = await params;
  const record = await readUserContent(uploadId);
  if (!record) return Response.json({ code: "UPLOAD_NOT_FOUND", message: "上传内容不存在" }, { status: 404 });

  const bytes = await readFile(userContentFile(record, "media"));
  const commonHeaders = {
    "Content-Type": record.mediaMimeType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
  };
  const rangeHeader = request.headers.get("range");
  if (!rangeHeader) {
    return new Response(bytes, { headers: { ...commonHeaders, "Content-Length": String(bytes.length) } });
  }

  const range = byteRange(rangeHeader, bytes.length);
  if (!range) {
    return new Response(null, { status: 416, headers: { ...commonHeaders, "Content-Range": `bytes */${bytes.length}` } });
  }
  const chunk = bytes.subarray(range.start, range.end + 1);
  return new Response(chunk, {
    status: 206,
    headers: {
      ...commonHeaders,
      "Content-Length": String(chunk.length),
      "Content-Range": `bytes ${range.start}-${range.end}/${bytes.length}`,
    },
  });
}
