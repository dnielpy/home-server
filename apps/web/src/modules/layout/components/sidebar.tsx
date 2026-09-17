"use client";

import { Drawer } from "@base-ui/react/drawer";
import {
  ChartNoAxesCombined,
  Clapperboard,
  Download,
  Images,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type { UserDto } from "@home-server/contracts/users";

const navigation = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/stats", label: "Server", icon: ChartNoAxesCombined },
  { href: "/localtube", label: "LocalTube", icon: Clapperboard },
  { href: "/gallery", label: "Gallery", icon: Images },
  { href: "/downloads", label: "Descargas", icon: Download },
];

type SidebarProps = {
  user: UserDto;
  collapsed: boolean;
  mobileOpen: boolean;
  onCollapsedToggle: () => void;
  onMobileOpenChange: (open: boolean) => void;
};

export const Sidebar = ({ user, collapsed, mobileOpen, onCollapsedToggle, onMobileOpenChange }: SidebarProps) => {
  const pathname = usePathname();
  const items = user.isAdmin ? [...navigation, { href: "/users", label: "Usuarios", icon: Users }] : navigation;

  useEffect(() => {
    onMobileOpenChange(false);
  }, [onMobileOpenChange, pathname]);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (query.matches) onMobileOpenChange(false);
    };
    closeOnDesktop();
    query.addEventListener("change", closeOnDesktop);
    return () => query.removeEventListener("change", closeOnDesktop);
  }, [onMobileOpenChange]);

  const links = (compact = false, onNavigate?: () => void) =>
    items.map(({ href, label, icon: Icon }) => {
      const active =
        href === "/localtube" || href === "/gallery" || href === "/downloads"
          ? pathname.startsWith(href)
          : pathname === href;

      return (
        <Link
          key={href}
          aria-current={active ? "page" : undefined}
          title={compact ? label : undefined}
          onClick={onNavigate}
          className={`hover:bg-accent focus-visible:ring-ring flex min-w-0 items-center rounded-[10px] text-sm font-semibold transition focus-visible:ring-2 focus-visible:outline-none ${
            compact ? "justify-center px-2" : "gap-3 px-3.5"
          } ${active ? "bg-muted text-foreground" : "text-muted-foreground"}`}
          href={href}
        >
          <Icon aria-hidden="true" className="size-[18px] shrink-0" fill={active ? "currentColor" : "none"} strokeWidth={2.2} />
          <span className={compact ? "sr-only" : "truncate"}>{label}</span>
        </Link>
      );
    });

  return (
    <>
      <aside
        className={`border-border bg-background sticky top-[66px] hidden h-[calc(100vh-66px)] shrink-0 self-start border-r py-3 transition-[width,padding] duration-200 lg:flex lg:flex-col ${
          collapsed ? "w-[72px] px-2" : "w-[220px] px-3"
        }`}
      >
        <nav aria-label="Navegación principal" className="grid gap-1 [&_a]:h-11">
          {links(collapsed)}
        </nav>
        <button
          type="button"
          title={collapsed ? "Expandir menú lateral" : "Contraer menú lateral"}
          aria-label={collapsed ? "Expandir menú lateral" : "Contraer menú lateral"}
          aria-pressed={collapsed}
          onClick={onCollapsedToggle}
          className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring mt-auto grid h-11 w-full place-items-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
        </button>
      </aside>

      <Drawer.Root open={mobileOpen} onOpenChange={onMobileOpenChange} swipeDirection="left">
        <Drawer.Portal>
          <Drawer.Backdrop className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[1px] transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 lg:hidden" />
          <Drawer.Viewport className="pointer-events-none fixed inset-0 z-50 flex lg:hidden">
            <Drawer.Popup
              initialFocus
              className="border-border bg-background pointer-events-auto flex h-full w-[min(18rem,calc(100vw-2.5rem))] flex-col border-r shadow-2xl outline-none transition-transform duration-200 data-[ending-style]:-translate-x-full data-[starting-style]:-translate-x-full"
            >
              <Drawer.Content className="flex min-h-0 flex-1 flex-col">
                <div className="border-border flex h-[66px] shrink-0 items-center justify-between border-b px-4">
                  <span className="font-semibold">Navegación</span>
                  <Drawer.Close
                    aria-label="Cerrar navegación"
                    className="hover:bg-muted focus-visible:ring-ring grid size-10 place-items-center rounded-lg focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <X className="size-5" />
                  </Drawer.Close>
                </div>
                <nav id="mobile-main-navigation" aria-label="Navegación principal" className="grid gap-1 overflow-y-auto p-3 [&_a]:h-11">
                  {links(false, () => onMobileOpenChange(false))}
                </nav>
              </Drawer.Content>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
};
