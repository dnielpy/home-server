"use client";

import Link from "next/link";
import { Menu, Server, X } from "lucide-react";
import { UserMenu } from "@/src/modules/layout/components/user-menu";
import type { UserDto } from "@home-server/contracts/users";

export const AppBar = ({
  user,
  mobileNavigationOpen,
  onMobileNavigationToggle,
}: {
  user: UserDto;
  mobileNavigationOpen: boolean;
  onMobileNavigationToggle: () => void;
}) => {
  return (
    <header className="border-border bg-background/95 sticky top-0 z-20 flex h-[66px] items-center border-b px-4 backdrop-blur sm:px-7 lg:px-4">
      <button
        type="button"
        aria-label={mobileNavigationOpen ? "Cerrar navegación" : "Abrir navegación"}
        aria-expanded={mobileNavigationOpen}
        aria-controls="mobile-main-navigation"
        onClick={onMobileNavigationToggle}
        className="hover:bg-muted focus-visible:ring-ring mr-2 grid size-10 place-items-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none lg:hidden"
      >
        {mobileNavigationOpen ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      <Link
        aria-label="Home Server: ir al dashboard"
        className="text-foreground flex min-w-0 items-center gap-2.5 text-lg font-bold tracking-tight"
        href="/"
      >
        <span className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-lg shadow-sm">
          <Server aria-hidden="true" className="size-[18px]" />
        </span>
        <span className="truncate">Home Server</span>
      </Link>

      <div className="ml-auto">
        <UserMenu user={user} />
      </div>
    </header>
  );
};
