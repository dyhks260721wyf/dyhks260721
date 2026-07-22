import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ProductPreset, VideoPreset } from "@/lib/content";

export type UserContentRecord = {
  video: VideoPreset;
  mediaFile: string;
  mediaMimeType: string;
  posterFile: string;
  createdAt: string;
};

function uploadsRoot() {
  return (process.env.USER_CONTENT_DIR ?? "/tmp/scene-fit-user-content").replace(/\/$/, "");
}

function safeUploadId(uploadId: string) {
  if (!/^user-[0-9a-f-]{36}$/.test(uploadId)) throw new Error("INVALID_UPLOAD_ID");
  return uploadId;
}

function uploadDirectory(uploadId: string) {
  return path.join(uploadsRoot(), safeUploadId(uploadId));
}

function cleanTitle(fileName: string) {
  const title = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return title.slice(0, 42) || "我的场景穿搭";
}

function mediaExtension(mimeType: string) {
  const extensions: Record<string, string> = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const extension = extensions[mimeType];
  if (!extension) throw new Error("UNSUPPORTED_MEDIA_TYPE");
  return extension;
}

export async function createUserContent(input: {
  originalName: string;
  mediaType: "video" | "image";
  mediaMimeType: string;
  mediaBytes: Buffer;
  posterBytes: Buffer;
}) {
  const id = `user-${crypto.randomUUID()}`;
  const directory = uploadDirectory(id);
  const mediaFile = `media.${mediaExtension(input.mediaMimeType)}`;
  const posterFile = "poster.jpg";
  const createdAt = new Date().toISOString();
  const video: VideoPreset = {
    id,
    author: "我的上传",
    avatarLabel: "我",
    title: cleanTitle(input.originalName),
    location: "我的场景",
    audio: input.mediaType === "video" ? "上传视频 · 原声" : "静态图片",
    videoUrl: `/api/uploads/${id}/media`,
    posterUrl: `/api/uploads/${id}/poster`,
    mediaType: input.mediaType,
    userUploaded: true,
    uploadedAt: createdAt,
    counts: { likes: "0", comments: "0", saves: "0" },
    eligible: true,
    accent: "cyan",
    hotspots: [],
    products: [],
    analysis: {
      summary: "这是用户上传的场景画面。生成时会使用用户选中的关键帧，并由 Luna 分析其中可见的穿搭单品。",
      tags: ["我的上传", "AI 穿搭识别", "场景试穿"],
      questions: [
        { id: "q1", question: "商品什么时候出现？", answer: "开始生成后，Luna 会与生图任务并行分析关键帧；结果页会展示识别到的相似商品数据。" },
      ],
    },
  };
  const record: UserContentRecord = { video, mediaFile, mediaMimeType: input.mediaMimeType, posterFile, createdAt };

  await mkdir(directory, { recursive: true, mode: 0o700 });
  await Promise.all([
    writeFile(path.join(directory, mediaFile), input.mediaBytes, { mode: 0o600 }),
    writeFile(path.join(directory, posterFile), input.posterBytes, { mode: 0o600 }),
    writeFile(path.join(directory, "metadata.json"), JSON.stringify(record), { mode: 0o600 }),
  ]);
  return record;
}

export async function readUserContent(uploadId: string) {
  try {
    return JSON.parse(await readFile(path.join(uploadDirectory(uploadId), "metadata.json"), "utf8")) as UserContentRecord;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    if (error instanceof Error && error.message === "INVALID_UPLOAD_ID") return null;
    throw error;
  }
}

export async function listUserContent() {
  await mkdir(uploadsRoot(), { recursive: true, mode: 0o700 });
  const entries = await readdir(uploadsRoot(), { withFileTypes: true });
  const records = await Promise.all(entries
    .filter((entry) => entry.isDirectory() && /^user-[0-9a-f-]{36}$/.test(entry.name))
    .map((entry) => readUserContent(entry.name)));
  return records
    .filter((record): record is UserContentRecord => Boolean(record))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function updateUserContentProducts(uploadId: string, products: ProductPreset[]) {
  const record = await readUserContent(uploadId);
  if (!record) return null;
  const updated: UserContentRecord = {
    ...record,
    video: { ...record.video, products },
  };
  const target = path.join(uploadDirectory(uploadId), "metadata.json");
  const temporary = `${target}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(updated), { mode: 0o600 });
  await rename(temporary, target);
  return updated;
}

export function userContentFile(record: UserContentRecord, kind: "media" | "poster") {
  return path.join(uploadDirectory(record.video.id), kind === "media" ? record.mediaFile : record.posterFile);
}
