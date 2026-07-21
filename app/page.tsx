import { Experience } from "@/components/Experience";
import { contentManifest } from "@/lib/content";

export default function Home() {
  return <Experience initialVideos={contentManifest.videos} />;
}
