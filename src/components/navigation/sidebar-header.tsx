import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "../ui/button";
import { Bell, User } from "lucide-react";

interface SidebarHeaderProps {
  title: string;
}

export function SidebarHeader({ title }: SidebarHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 md:ml-[256px] group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear h-[64.8px] bg-background z-20">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <div className="flex flex-1 items-center justify-between">
          <h1 className="text-xl font-semibold">{title}</h1>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full">
                <User className="h-4 w-4" />
              </div>
              <span className="font-medium">Admin</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
