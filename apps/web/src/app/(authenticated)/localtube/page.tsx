import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { LibraryContainer } from "@/src/modules/localtube/components/library-container";
import { VideoSearch } from "@/src/modules/localtube/components/video-search";

export const metadata: Metadata = { title: "LocalTube · Home Server", description: "Tu biblioteca privada de vídeos." };
export const dynamic = "force-dynamic";

export default async function LocalTubePage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  return (
    <section className="mx-auto -mt-3 max-w-[1200px] lg:-mt-4">
      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_minmax(0,48rem)_1fr] sm:items-center">
        <div className="hidden sm:block" />
        <VideoSearch initialQuery={query} />
        <Link
          href="/localtube/upload"
          className="bg-muted text-foreground hover:bg-muted/70 focus-visible:ring-ring inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none sm:h-9 sm:w-fit sm:justify-self-end"
        >
          <Plus className="size-4" strokeWidth={2.25} /> Subir
        </Link>
      </div>
      <LibraryContainer query={query} />
    </section>
  );
}
