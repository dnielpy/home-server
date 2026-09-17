import type { ReactNode } from "react";
import { AlertTriangle, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/src/modules/common/components/card";

type ErrorStateProps = {
  title: ReactNode;
  description: ReactNode;
  icon?: LucideIcon;
  className?: string;
};

export const ErrorState = ({ title, description, icon: Icon = AlertTriangle, className }: ErrorStateProps) => {
  return (
    <Card className={className ?? "mx-auto max-w-2xl rounded-2xl border-amber-500/30 shadow-sm"}>
      <CardContent className="p-8 text-center">
        <Icon aria-hidden="true" className="mx-auto size-8 text-amber-500" />
        <h1 className="mt-3 text-lg font-semibold">{title}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{description}</p>
      </CardContent>
    </Card>
  );
};
