import type { ComponentProps, ReactNode } from "react";
import { CircleCheckBig, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  titleId?: string;
  className?: string;
};

export const PageHeader = ({ eyebrow, title, description, aside, titleId, className }: PageHeaderProps) => {
  return (
    <header className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div>
        {eyebrow && <p className="text-primary text-sm font-medium">{eyebrow}</p>}
        <h1 id={titleId} className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {description && <p className="text-muted-foreground mt-2 text-sm">{description}</p>}
      </div>
      {aside}
    </header>
  );
};

type PageHeaderStatusProps = Omit<ComponentProps<"div">, "children"> & {
  children: ReactNode;
  icon?: LucideIcon;
};

export const PageHeaderStatus = ({
  children,
  icon: Icon = CircleCheckBig,
  className,
  ...props
}: PageHeaderStatusProps) => {
  return (
    <div
      className={cn(
        "bg-card text-muted-foreground flex items-center gap-2 rounded-full border px-3 py-2 text-xs shadow-sm",
        className,
      )}
      {...props}
    >
      <Icon aria-hidden="true" className="size-4 text-emerald-500" />
      {children}
    </div>
  );
};
