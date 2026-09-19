"use client";

import { ChartNoAxesCombined, Clapperboard, Download, Images, LayoutDashboard, Server, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import type { UserDto } from "@home-server/contracts/users";
import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/src/modules/common/components/sidebar";

const navigation = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/stats", label: "Server", icon: ChartNoAxesCombined },
  { href: "/localtube", label: "LocalTube", icon: Clapperboard },
  { href: "/gallery", label: "Gallery", icon: Images },
  { href: "/downloads", label: "Descargas", icon: Download },
];

type SidebarProps = {
  user: UserDto;
};

type NavigationItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string; fill?: string; strokeWidth?: number }>;
};

const isNavigationItemActive = (pathname: string, href: string) => {
  return href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
};

export const Sidebar = ({ user }: SidebarProps) => {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const items: NavigationItem[] = user.isAdmin
    ? [...navigation, { href: "/users", label: "Usuarios", icon: Users }]
    : navigation;

  return (
    <SidebarPrimitive collapsible="icon">
      <SidebarHeader className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              aria-label="Home Server: ir al dashboard"
              className="text-sm font-semibold tracking-tight"
              render={<Link href="/" />}
              size="lg"
              tooltip="Home Server"
            >
              <span className="bg-primary text-primary-foreground grid size-7 shrink-0 place-items-center rounded-md shadow-sm">
                <Server aria-hidden="true" className="size-4" />
              </span>
              <span className="truncate group-data-[collapsible=icon]:hidden">Home Server</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="p-2 pt-0">
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(({ href, label, icon: Icon }) => {
                const active = isNavigationItemActive(pathname, href);

                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      isActive={active}
                      render={
                        <Link
                          aria-current={active ? "page" : undefined}
                          href={href}
                          onClick={() => setOpenMobile(false)}
                        />
                      }
                      tooltip={label}
                    >
                      <Icon
                        aria-hidden="true"
                        className="size-[18px]"
                        fill={active ? "currentColor" : "none"}
                        strokeWidth={2}
                      />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </SidebarPrimitive>
  );
};
