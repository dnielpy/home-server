"use client";

import type { FC, ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import type { UserDto } from "@home-server/contracts/users";
import { MiniPlayer } from "@/src/modules/localtube/components/mini-player";
import { PersistentPlayerProvider } from "@/src/modules/localtube/contexts/persistent-player-context";
import { Sidebar } from "@/src/modules/layout/components/sidebar";
import { AppBar } from "@/src/modules/layout/components/app-bar";
import { SidebarInset, SidebarProvider } from "@/src/modules/common/components/sidebar";
import { TooltipProvider } from "@/src/modules/common/components/tooltip";

type AppLayoutViewProps = {
  children: ReactNode;
  user: UserDto;
};

export const AppLayoutView: FC<AppLayoutViewProps> = ({ children, user }) => {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
      storageKey="home-server-theme"
    >
      <PersistentPlayerProvider>
        <TooltipProvider>
          <SidebarProvider>
            <Sidebar user={user} />
            <SidebarInset>
              <AppBar user={user} />
              <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
            </SidebarInset>
          </SidebarProvider>
        </TooltipProvider>
        <MiniPlayer />
      </PersistentPlayerProvider>
    </ThemeProvider>
  );
};
