import type { ReactNode } from "react";
import { AppLayoutContainer } from "@/src/modules/layout/components/app-layout-container";

export const dynamic = "force-dynamic";

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return <AppLayoutContainer>{children}</AppLayoutContainer>;
}
