import type { FC, ReactNode } from "react";
import { AppLayoutView } from "@/src/modules/layout/components/app-layout-view";

type AppLayoutContainerProps = {
  children: ReactNode;
};

export const AppLayoutContainer: FC<AppLayoutContainerProps> = ({ children }) => {
  return <AppLayoutView>{children}</AppLayoutView>;
};
