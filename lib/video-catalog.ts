import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { contentManifest, type VideoPreset } from "@/lib/content";
import { listUserContent, userContentRoot } from "@/lib/user-content";

type CatalogState = {
  hiddenPresetIds: string[];
};

export type ManagedVideo = {
  video: VideoPreset;
  source: "preset" | "upload";
  active: boolean;
};

const emptyState: CatalogState = { hiddenPresetIds: [] };

function statePath() {
  return path.join(userContentRoot(), "catalog-state.json");
}

async function readCatalogState(): Promise<CatalogState> {
  try {
    const parsed = JSON.parse(await readFile(statePath(), "utf8")) as Partial<CatalogState>;
    const knownPresetIds = new Set(contentManifest.videos.map((video) => video.id));
    return {
      hiddenPresetIds: Array.isArray(parsed.hiddenPresetIds)
        ? parsed.hiddenPresetIds.filter((id): id is string => typeof id === "string" && knownPresetIds.has(id))
        : [],
    };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return emptyState;
    throw error;
  }
}

async function writeCatalogState(state: CatalogState) {
  await mkdir(userContentRoot(), { recursive: true, mode: 0o700 });
  const target = statePath();
  const temporary = `${target}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(state), { mode: 0o600 });
  await rename(temporary, target);
}

export async function listFeedVideos() {
  const [state, uploaded] = await Promise.all([readCatalogState(), listUserContent()]);
  const hidden = new Set(state.hiddenPresetIds);
  return [
    ...contentManifest.videos.filter((video) => !hidden.has(video.id)),
    ...uploaded.map((record) => record.video),
  ];
}

export async function listManagedVideos(): Promise<ManagedVideo[]> {
  const [state, uploaded] = await Promise.all([readCatalogState(), listUserContent()]);
  const hidden = new Set(state.hiddenPresetIds);
  return [
    ...contentManifest.videos.map((video) => ({ video, source: "preset" as const, active: !hidden.has(video.id) })),
    ...uploaded.map((record) => ({ video: record.video, source: "upload" as const, active: true })),
  ];
}

export async function setPresetActive(videoId: string, active: boolean) {
  if (!contentManifest.videos.some((video) => video.id === videoId)) return false;
  const state = await readCatalogState();
  const hidden = new Set(state.hiddenPresetIds);
  if (active) hidden.delete(videoId);
  else hidden.add(videoId);
  await writeCatalogState({ hiddenPresetIds: [...hidden] });
  return true;
}
