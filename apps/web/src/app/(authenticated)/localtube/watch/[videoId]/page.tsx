import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocalTubeVideo, getLocalTubeVideos } from "@/src/lib/services/localtube";
import { WatchView } from "@/src/modules/localtube/components/watch-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reproducir · LocalTube" };

export default async function LocalTubeWatchPage({ params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await params;
  const [videoResult, upNextResult] = await Promise.all([
    getLocalTubeVideo(videoId),
    getLocalTubeVideos("", undefined, videoId),
  ]);
  if (!videoResult.success) notFound();
  return <WatchView video={videoResult.data} upNext={upNextResult.success ? upNextResult.data.items : []} />;
}
