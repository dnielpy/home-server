import type { ReactNode } from "react";
import { AppLayoutView } from "@/src/modules/layout/components/app-layout-view";
import { requireCurrentUser } from "@/src/modules/auth/server/session";

type AppLayoutContainerProps = {
  children: ReactNode;
};

export const AppLayoutContainer = async ({ children }: AppLayoutContainerProps) => {
  const user = await requireCurrentUser();
  return <AppLayoutView user={user}>{children}</AppLayoutView>;
};
