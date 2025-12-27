import { Separator } from "@/components/ui/separator";
import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ChevronsLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarHeaderProps {
  title: string;
}

export function SidebarHeader({ title }: SidebarHeaderProps) {
  const { open, toggleSidebar } = useSidebar();

  return (
    <header className="sticky top-0 z-10 w-full bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b flex items-center h-[64.8px] px-4 lg:px-6 shrink-0 gap-2">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-7 w-7"
        >
          <ChevronsLeft
            className={cn(
              "h-4 w-4 transition-transform",
              !open && "rotate-180"
            )}
          />
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-base font-medium leading-none text-foreground/90 tracking-tight">
          {title}
        </h1>
      </div>
    </header>
  );
}
