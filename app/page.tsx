import { Experience } from "@/components/Experience";
import { contentManifest } from "@/lib/content";
import { listUserContent } from "@/lib/user-content";

export const dynamic = "force-dynamic";

export default async function Home() {
  const uploaded = await listUserContent();
  return <Experience initialVideos={[...contentManifest.videos, ...uploaded.map((record) => record.video)]} />;
}
