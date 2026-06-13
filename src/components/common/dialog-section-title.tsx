import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DialogSectionTitleProps {
  children: ReactNode;
  className?: string;
  description?: string;
}

export function DialogSectionTitle({
  children,
  className,
  description,
}: DialogSectionTitleProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <h3 className="border-l-4 border-blue-600 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-900 rounded-r-md">
        {children}
      </h3>
      {description ? (
        <p className="text-xs text-muted-foreground pl-1">{description}</p>
      ) : null}
    </div>
  );
}
