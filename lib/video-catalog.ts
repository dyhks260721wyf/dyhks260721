import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { contentManifest, type VideoPreset } from "@/lib/content";
import { listUserContent, userContentRoot } from "@/lib/user-content";

type CatalogState = {
  hiddenPresetIds: string[];
  orderedVideoIds: string[];
};

export type ManagedVideo = {
  video: VideoPreset;
  source: "preset" | "upload";
  active: boolean;
};

const emptyState: CatalogState = { hiddenPresetIds: [], orderedVideoIds: [] };

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
      orderedVideoIds: Array.isArray(parsed.orderedVideoIds)
        ? [...new Set(parsed.orderedVideoIds.filter((id): id is string => typeof id === "string" && id.length > 0))]
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
  return sortByCatalogOrder([
    ...contentManifest.videos.filter((video) => !hidden.has(video.id)),
    ...uploaded.map((record) => record.video),
  ], state.orderedVideoIds);
}

export async function listManagedVideos(): Promise<ManagedVideo[]> {
  const [state, uploaded] = await Promise.all([readCatalogState(), listUserContent()]);
  const hidden = new Set(state.hiddenPresetIds);
  const items = [
    ...contentManifest.videos.map((video) => ({ video, source: "preset" as const, active: !hidden.has(video.id) })),
    ...uploaded.map((record) => ({ video: record.video, source: "upload" as const, active: true })),
  ];
  const active = sortManagedByCatalogOrder(items.filter((item) => item.active), state.orderedVideoIds);
  return [...active, ...items.filter((item) => !item.active)];
}

export async function setPresetActive(videoId: string, active: boolean) {
  if (!contentManifest.videos.some((video) => video.id === videoId)) return false;
  const state = await readCatalogState();
  const hidden = new Set(state.hiddenPresetIds);
  if (active) hidden.delete(videoId);
  else hidden.add(videoId);
  await writeCatalogState({ ...state, hiddenPresetIds: [...hidden] });
  return true;
}

export async function setVideoOrder(orderedVideoIds: string[]) {
  const [state, uploaded] = await Promise.all([readCatalogState(), listUserContent()]);
  const hidden = new Set(state.hiddenPresetIds);
  const activeIds = [
    ...contentManifest.videos.filter((video) => !hidden.has(video.id)).map((video) => video.id),
    ...uploaded.map((record) => record.video.id),
  ];
  const requested = [...new Set(orderedVideoIds)];
  if (requested.length !== activeIds.length || requested.some((id) => !activeIds.includes(id))) return false;
  await writeCatalogState({ ...state, orderedVideoIds: requested });
  return true;
}

export async function removeVideoFromCatalogOrder(videoId: string) {
  const state = await readCatalogState();
  if (!state.orderedVideoIds.includes(videoId)) return;
  await writeCatalogState({ ...state, orderedVideoIds: state.orderedVideoIds.filter((id) => id !== videoId) });
}

function sortByCatalogOrder(videos: VideoPreset[], orderedVideoIds: string[]) {
  const rank = new Map(orderedVideoIds.map((id, index) => [id, index]));
  return videos
    .map((video, index) => ({ video, index }))
    .sort((left, right) => (rank.get(left.video.id) ?? orderedVideoIds.length + left.index) - (rank.get(right.video.id) ?? orderedVideoIds.length + right.index))
    .map(({ video }) => video);
}

function sortManagedByCatalogOrder(items: ManagedVideo[], orderedVideoIds: string[]) {
  const rank = new Map(orderedVideoIds.map((id, index) => [id, index]));
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => (rank.get(left.item.video.id) ?? orderedVideoIds.length + left.index) - (rank.get(right.item.video.id) ?? orderedVideoIds.length + right.index))
    .map(({ item }) => item);
}
