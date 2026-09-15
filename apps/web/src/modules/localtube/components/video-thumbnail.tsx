"use client";

import { Film } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export const VideoThumbnail = ({ alt, src, sizes }: { alt: string; src: string; sizes: string }) => {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <div className="bg-muted text-muted-foreground grid h-full w-full place-items-center">
        <Film className="size-8" />
      </div>
    );
  return (
    <Image
      unoptimized
      fill
      alt={alt}
      src={src}
      sizes={sizes}
      onError={() => setFailed(true)}
      className="object-cover transition duration-300 group-hover:scale-[1.025]"
    />
  );
};
