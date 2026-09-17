"use client";

import type { FC, ReactNode } from "react";
import { useState, useSyncExternalStore } from "react";
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

const sidebarPreferenceEvent = "home-server-sidebar-preference";
const subscribeToSidebarPreference = (callback: () => void) => {
  window.addEventListener(sidebarPreferenceEvent, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(sidebarPreferenceEvent, callback);
    window.removeEventListener("storage", callback);
  };
};
const getSidebarPreference = () => window.localStorage.getItem("home-server-sidebar-collapsed") === "true";
const getServerSidebarPreference = () => false;

export const AppLayoutView: FC<AppLayoutViewProps> = ({ children, user }) => {
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const sidebarCollapsed = useSyncExternalStore(
    subscribeToSidebarPreference,
    getSidebarPreference,
    getServerSidebarPreference,
  );

  const toggleSidebar = () => {
    window.localStorage.setItem("home-server-sidebar-collapsed", String(!sidebarCollapsed));
    window.dispatchEvent(new Event(sidebarPreferenceEvent));
  };

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
      storageKey="home-server-theme"
    >
      <PersistentPlayerProvider>
        <div className="bg-background min-h-screen overflow-x-clip">
          <AppBar
            user={user}
            mobileNavigationOpen={mobileNavigationOpen}
            onMobileNavigationToggle={() => setMobileNavigationOpen((current) => !current)}
          />
          <div className="flex min-h-[calc(100vh-66px)]">
            <Sidebar
              user={user}
              collapsed={sidebarCollapsed}
              mobileOpen={mobileNavigationOpen}
              onCollapsedToggle={toggleSidebar}
              onMobileOpenChange={setMobileNavigationOpen}
            />
            <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
          </div>
          <MiniPlayer />
        </div>
      </PersistentPlayerProvider>
    </ThemeProvider>
  );
};
