"use client";

import { usePathname } from "next/navigation";
import type { UserDto } from "@home-server/contracts/users";
import { Separator } from "@/src/modules/common/components/separator";
import { SidebarTrigger } from "@/src/modules/common/components/sidebar";
import { UserMenu } from "@/src/modules/layout/components/user-menu";

export const AppBar = ({ user }: { user: UserDto }) => {
  const pathname = usePathname();
  const sectionTitle =
    pathname === "/"
      ? "Dashboard"
      : pathname.startsWith("/stats")
        ? "Estadísticas"
        : pathname.startsWith("/localtube")
          ? "LocalTube"
          : pathname.startsWith("/gallery")
            ? "Gallery"
            : pathname.startsWith("/downloads")
              ? "Descargas"
              : pathname.startsWith("/users")
                ? "Usuarios"
                : "Home Server";

  return (
    <header className="border-border bg-background/95 sticky top-0 z-20 flex h-16 items-center border-b backdrop-blur">
      <div className="flex min-w-0 items-center gap-2 px-4">
        <SidebarTrigger aria-label="Alternar menú lateral" className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <span className="text-foreground truncate text-[15px] font-semibold">{sectionTitle}</span>
      </div>

      <div className="ml-auto px-3 sm:px-4">
        <UserMenu user={user} />
      </div>
    </header>
  );
};
