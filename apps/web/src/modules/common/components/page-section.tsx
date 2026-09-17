import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const PageSection = ({ className, ...props }: ComponentProps<"section">) => {
  return <section className={cn(className)} {...props} />;
};
