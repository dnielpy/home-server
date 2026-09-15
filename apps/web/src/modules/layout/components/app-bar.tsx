"use client";

import Link from "next/link";
import { Server } from "lucide-react";
import { UserMenu } from "@/src/modules/layout/components/user-menu";
import type { UserDto } from "@home-server/contracts/users";

export const AppBar = ({ user }: { user: UserDto }) => {
  return (
    <header className="border-border bg-background/95 sticky top-0 z-20 flex h-[66px] items-center border-b px-4 backdrop-blur sm:px-7 lg:px-4">
      <Link
        aria-label="Home Server: ir al dashboard"
        className="text-foreground flex items-center gap-2.5 text-lg font-bold tracking-tight"
        href="/"
      >
        <span className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-lg shadow-sm">
          <Server aria-hidden="true" className="size-[18px]" />
        </span>
        Home Server
      </Link>

      <div className="ml-auto">
        <UserMenu user={user} />
      </div>
    </header>
  );
};
