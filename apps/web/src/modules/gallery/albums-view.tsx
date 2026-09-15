import Link from "next/link";
import { FolderOpen, Images } from "lucide-react";
import type { GalleryAlbumSummaryView } from "./types/gallery";

export function AlbumsView({ albums, error }: { albums: GalleryAlbumSummaryView[]; error?: string }) {
  if (error) return <Message title="Álbumes no disponibles" message={error} />;
  if (!albums.length)
    return <Message title="Todavía no hay álbumes" message="Crea una subcarpeta al subir archivos para verla aquí." />;
  return (
    <section className="mx-auto max-w-[1800px]">
      <header className="mb-7 flex items-end justify-between gap-4">
        <div>
          <p className="text-primary text-xs font-semibold tracking-wider uppercase">Gallery</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Álbumes</h1>
        </div>
        <span className="text-muted-foreground text-sm">
          {albums.length} {albums.length === 1 ? "álbum" : "álbumes"}
        </span>
      </header>
      <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {albums.map((album) => (
          <Link key={album.id} href={`/gallery/albums/${album.id}`} className="group min-w-0">
            <div className="bg-muted aspect-[4/3] overflow-hidden rounded-xl">
              {album.cover ? (
                <img
                  src={album.cover.thumbnailUrl}
                  alt=""
                  className="size-full object-cover transition duration-200 group-hover:scale-[1.03]"
                />
              ) : (
                <span className="text-muted-foreground grid size-full place-items-center">
                  <Images className="size-8" />
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <FolderOpen className="text-primary size-4 shrink-0" />
              <p className="truncate text-sm font-semibold">{album.name}</p>
            </div>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {album.itemCount} {album.itemCount === 1 ? "elemento" : "elementos"}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Message({ title, message }: { title: string; message: string }) {
  return (
    <section className="mx-auto grid min-h-[60vh] max-w-xl place-items-center text-center">
      <div>
        <span className="bg-muted text-primary mx-auto grid size-16 place-items-center rounded-full">
          <FolderOpen className="size-7" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold">{title}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{message}</p>
      </div>
    </section>
  );
}
