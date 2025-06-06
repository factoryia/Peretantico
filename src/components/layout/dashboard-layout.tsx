import { Outlet } from "react-router";

import { AppSidebar } from "@/components/navigation/app-sidebar";
import { SidebarHeader } from "@/components/navigation/sidebar-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export function DashboardLayout() {
  return (
    <SidebarProvider className="h-full overflow-hidden">
      <AppSidebar />
      <SidebarInset className="overflow-y-hidden h-screen">
        <SidebarHeader />
        <main className="p-6 overflow-y-auto h-full bg-[#f3f4f6]">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
