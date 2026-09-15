"use client";

import type { FC, ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { AppBar } from "@/src/modules/layout/components/app-bar";
import { Sidebar } from "@/src/modules/layout/components/sidebar";
import type { UserDto } from "@home-server/contracts/users";

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
      <div className="min-h-screen bg-background">
        <AppBar user={user} />
        <div className="flex min-h-[calc(100vh-66px)]">
          <Sidebar user={user} />
          <main className="min-w-0 flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-8 lg:pt-8">
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
};
