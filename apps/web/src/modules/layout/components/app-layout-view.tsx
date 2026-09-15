"use client";

import type { FC, ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { AppBar } from "@/src/modules/layout/components/app-bar";
import { Sidebar } from "@/src/modules/layout/components/sidebar";
import type { UserDto } from "@home-server/contracts/users";
import { PersistentPlayerProvider } from "@/src/modules/localtube/contexts/persistent-player-context";
import { MiniPlayer } from "@/src/modules/localtube/components/mini-player";

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
        <div className="bg-background min-h-screen">
          <AppBar user={user} />
          <div className="flex min-h-[calc(100vh-66px)]">
            <Sidebar user={user} />
            <main className="min-w-0 flex-1 px-4 pt-6 pb-24 sm:px-6 lg:px-8 lg:pt-8 lg:pb-8">{children}</main>
          </div>
          <MiniPlayer />
        </div>
      </PersistentPlayerProvider>
    </ThemeProvider>
  );
};
