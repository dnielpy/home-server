"use client";

import Link from "next/link";
import { ChartNoAxesCombined, LayoutDashboard } from "lucide-react";
import { usePathname } from "next/navigation";
import type { UserDto } from "@home-server/contracts/users";
import { Users } from "lucide-react";

const navigation = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/stats", label: "Estadísticas", icon: ChartNoAxesCombined },
];

export const Sidebar = ({ user }: { user: UserDto }) => {
  const pathname = usePathname();
  const items = user.isAdmin ? [...navigation, { href: "/users", label: "Usuarios", icon: Users }] : navigation;

  const links = items.map(({ href, label, icon: Icon }) => {
    const active = pathname === href;

    return (
      <Link
        key={href}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-3 rounded-[10px] px-3.5 text-sm font-semibold transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-muted text-foreground" : "text-muted-foreground"
          }`}
        href={href}
      >
        <Icon aria-hidden="true" className="size-[18px]" fill={active ? "currentColor" : "none"} strokeWidth={2.2} />
        {label}
      </Link>
    );
  });

  return (
    <>
      <aside className="sticky top-[66px] hidden h-[calc(100vh-66px)] w-[220px] shrink-0 self-start border-r border-border bg-background px-3 pt-3 lg:block">
        <nav aria-label="Navegación principal" className="grid gap-1 [&_a]:h-10">
          {links}
        </nav>
      </aside>
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-30 grid border-t border-border bg-background/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgb(0_0_0/0.06)] backdrop-blur lg:hidden [&_a]:mx-auto [&_a]:h-12 [&_a]:w-full [&_a]:max-w-40 [&_a]:justify-center"
      >
        {links}
      </nav>
    </>
  );
};
