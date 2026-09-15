"use client";

import { Menu } from "@base-ui/react/menu";
import { LogOut, Moon, Sun, UserRound } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import type { UserDto } from "@home-server/contracts/users";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function UserMenu({ user }: { user: UserDto }) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const isDark = mounted && resolvedTheme === "dark";

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/login");
    router.refresh();
  };

  return (
    <Menu.Root>
      <Menu.Trigger aria-label="Abrir menú de usuario" className="grid size-10 place-items-center rounded-full border border-border bg-background p-1 shadow-sm outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50">
        {user.photoUrl ? <Image unoptimized src={user.photoUrl} alt="" width={32} height={32} className="size-8 rounded-full object-cover" /> : <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground"><UserRound className="size-4" /></span>}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={8} className="z-50">
          <Menu.Popup className="min-w-60 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl outline-none">
            <div className="px-3 py-2.5">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.isAdmin ? "Administrador" : "Usuario"}</p>
            </div>
            <Menu.Separator className="my-1 h-px bg-border" />
            <Menu.CheckboxItem checked={isDark} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} className="flex h-10 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm outline-none data-[highlighted]:bg-muted">
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              Tema oscuro
              <Menu.CheckboxItemIndicator className="ml-auto">{isDark ? "✓" : ""}</Menu.CheckboxItemIndicator>
            </Menu.CheckboxItem>
            <Menu.Item onClick={() => void logout()} className="flex h-10 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm text-destructive outline-none data-[highlighted]:bg-destructive/10">
              <LogOut className="size-4" /> Cerrar sesión
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
