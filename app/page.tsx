import { Experience } from "@/components/Experience";
import { listFeedVideos } from "@/lib/video-catalog";

export const dynamic = "force-dynamic";

export default async function Home() {
  return <Experience initialVideos={await listFeedVideos()} />;
}
