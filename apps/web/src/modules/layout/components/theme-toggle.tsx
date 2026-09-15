"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/src/modules/common/components/button";

const subscribe = () => () => {};

export const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <Button
        aria-label="Cambiar tema"
        className="size-9 rounded-full"
        title="Cambiar tema"
        type="button"
        variant="outline"
        size="icon"
      >
        <Moon aria-hidden="true" className="size-4" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";
  const label = isDark ? "Activar tema claro" : "Activar tema oscuro";

  return (
    <Button
      aria-label={label}
      aria-pressed={isDark}
      className="size-9 rounded-full"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={label}
      type="button"
      variant="outline"
      size="icon"
    >
      {isDark ? <Sun aria-hidden="true" className="size-4" /> : <Moon aria-hidden="true" className="size-4" />}
    </Button>
  );
};
