"use client";

import Link from "next/link";
import { Server } from "lucide-react";
import { ThemeToggle } from "@/src/modules/layout/components/theme-toggle";

export const AppBar = () => {
  return (
    <header className="sticky top-0 z-20 flex h-[66px] items-center border-b border-border bg-background/95 px-4 backdrop-blur sm:px-7 lg:px-4">
      <Link
        aria-label="Home Server: ir al dashboard"
        className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-foreground"
        href="/"
      >
        <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Server aria-hidden="true" className="size-[18px]" />
        </span>
        Home Server
      </Link>

      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  );
};
