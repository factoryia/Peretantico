import { ChevronsUpDown, LogOut } from "lucide-react";
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
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { data } from "@/constants";
import { Link, useLocation } from "react-router";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function AppSidebar() {
  const { pathname } = useLocation();
  const { logout, authUser } = useAuthStore();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b bg-white">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground py-6 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center! group-data-[collapsible=icon]:items-center! group-data-[collapsible=icon]:min-h-12"
            >
              <Logo className="size-10 transition-all group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:object-contain" />
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium text-lg">
                  Pere Tantico
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="bg-white p-4">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              <SidebarGroupLabel className="uppercase text-muted-foreground font-semibold px-4 group-data-[collapsible=icon]:hidden">
                Plataforma
              </SidebarGroupLabel>
              {data.navMain.map((item) => {
                const isActive = pathname === item.url;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      className={cn(
                        "py-2 px-3 h-auto hover:bg-[#EFF6FF] hover:text-blue-600 ml-2 border-l-2 border-transparent transition-all group-data-[collapsible=icon]:ml-0 group-data-[collapsible=icon]:border-none group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:mx-auto",
                        isActive &&
                          "bg-[#EFF6FF] border-blue-600 text-blue-600 hover:text-blue-600 shadow-sm"
                      )}
                    >
                      <Link to={item.url} className="">
                        <item.icon className="min-w-5 min-h-5" />
                        <span className="ml-1 text-[15px] group-data-[collapsible=icon]:hidden">
                          {item.title}
                        </span>
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
          <SidebarMenuItem className="group-data-[collapsible=icon]:mx-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    {authUser?.name ? (
                      <AvatarFallback className="rounded-lg bg-blue-100 text-blue-700 font-medium">
                        {authUser.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    ) : (
                      <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                    )}
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold uppercase">
                      {authUser?.name || "Usuario"}
                    </span>
                    <span className="truncate text-xs">
                      {authUser?.roles?.[0] || "Rol"}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="right"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      {authUser?.name ? (
                        <AvatarFallback className="rounded-lg bg-blue-100 text-blue-700 font-medium">
                          {authUser.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      ) : (
                        <AvatarFallback className="rounded-lg">
                          CN
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold uppercase">
                        {authUser?.name || "Usuario"}
                      </span>
                      <span className="truncate text-xs">
                        {authUser?.roles?.[0] || "Rol"}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-red-600 focus:text-red-600 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4 text-red-600" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
