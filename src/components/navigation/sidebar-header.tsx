import { Separator } from "@/components/ui/separator";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { User } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface SidebarHeaderProps {
  title: string;
}

export function SidebarHeader({ title }: SidebarHeaderProps) {
  const { open } = useSidebar();
  const isMobile = useIsMobile();

  // En móvil, el sidebar debe estar sobrepuesto, en desktop desplazado
  const sidebarWidth = isMobile ? 0 : (open ? 256 : 0);

  return (
    <header
      style={{
        left: sidebarWidth,
        width: isMobile ? "100%" : `calc(100% - ${sidebarWidth}px)`,
      }}
      className="fixed top-0 z-20 h-[64.8px] bg-background border-b flex items-center transition-all duration-300"
    >
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <div className="flex flex-1 items-center justify-between">
          <h1 className="text-xl font-semibold">{title}</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full">
                <User className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
