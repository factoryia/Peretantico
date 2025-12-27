import { LogOut } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { data } from "@/constants";
import { Link, useLocation } from "react-router";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";

export function AppSidebar() {
  const { pathname } = useLocation();
  const { logout } = useAuthStore();

  return (
    <Sidebar>
      <SidebarHeader className="border-b bg-white">
        <SidebarMenu>
          <SidebarMenuItem>
            <div>
              <SidebarMenuSubButton className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground py-6">
                {/* <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-b from-blue-600 to-blue-700 text-sidebar-primary-foreground"> */}
                <Logo className="size-10" />
                {/* </div> */}
                <div className="flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-lg">
                    Pere Tantico
                  </span>
                </div>
              </SidebarMenuSubButton>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="bg-white p-4">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {data.navMain.map((item) => {
                const isActive = pathname === item.url;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={cn(
                        "py-2 px-3 h-auto hover:bg-[#EFF6FF] hover:text-blue-600",
                        isActive &&
                          "bg-[#EFF6FF] border-l-[3px] border-blue-600 text-blue-600 hover:text-blue-600"
                      )}
                    >
                      <Link to={item.url} className="">
                        <item.icon className="min-w-5 min-h-5" />
                        <span className="ml-1 text-base">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 bg-white border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Button
                variant="ghost"
                onClick={logout}
                className="py-2 px-3 h-auto text-red-600 hover:text-red-700 justify-start hover:bg-red-100/50 cursor-pointer"
              >
                <LogOut className="min-w-5 min-h-5" />
                <span className="text-base font-normal">Cerrar Sesión</span>
              </Button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
