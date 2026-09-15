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
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const isDark = mounted && resolvedTheme === "dark";

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/login");
    router.refresh();
  };

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Abrir menú de usuario"
        className="border-border bg-background hover:bg-muted focus-visible:ring-ring/50 grid size-10 place-items-center rounded-full border p-1 shadow-sm transition outline-none focus-visible:ring-2"
      >
        {user.photoUrl ? (
          <Image
            unoptimized
            src={user.photoUrl}
            alt=""
            width={32}
            height={32}
            className="size-8 rounded-full object-cover"
          />
        ) : (
          <span className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-full">
            <UserRound className="size-4" />
          </span>
        )}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={8} className="z-50">
          <Menu.Popup className="border-border bg-popover text-popover-foreground min-w-60 rounded-xl border p-1.5 shadow-xl outline-none">
            <div className="px-3 py-2.5">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="text-muted-foreground text-xs">{user.isAdmin ? "Administrador" : "Usuario"}</p>
            </div>
            <Menu.Separator className="bg-border my-1 h-px" />
            <Menu.CheckboxItem
              checked={isDark}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              className="data-[highlighted]:bg-muted flex h-10 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm outline-none"
            >
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              Tema oscuro
              <Menu.CheckboxItemIndicator className="ml-auto">{isDark ? "✓" : ""}</Menu.CheckboxItemIndicator>
            </Menu.CheckboxItem>
            <Menu.Item
              onClick={() => void logout()}
              className="text-destructive data-[highlighted]:bg-destructive/10 flex h-10 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm outline-none"
            >
              <LogOut className="size-4" /> Cerrar sesión
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
