"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, FileText, Layers, BarChart3, Calendar } from "lucide-react";

interface ConfigSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const menuItems = [
  {
    id: "categorias",
    title: "Categorías",
    description: "Gestionar categorías de servicios",
    icon: Settings,
    count: 12,
  },
  {
    id: "servicios",
    title: "Servicios",
    description: "Administrar tipos de servicios",
    icon: Layers,
    count: 45,
  },
  {
    id: "subservicios",
    title: "Subservicios",
    description: "Configurar subservicios específicos",
    icon: FileText,
    count: 128,
  },
  {
    id: "fechas",
    title: "Fechas especiales",
    description: "Gestionar fechas para notificaciones",
    icon: Calendar,
    count: 128,
  },
];

export function ConfigSidebar({
  activeSection,
  onSectionChange,
  open, // <-- recibe este prop para controlar visibilidad en mobile
  onClose, // <-- recibe este prop para cerrar en mobile
}: ConfigSidebarProps & { open?: boolean; onClose?: () => void }) {
  const isMobile = useIsMobile();

  // Sidebar content
  const sidebarContent = (
    <Card className="size-full border-none rounded-none">
      <CardHeader className="pb-3 flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" />
          Panel de Configuración
        </CardTitle>
        {isMobile && (
          <button onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        )}
      </CardHeader>
      <CardContent className="space-y-2 py-0">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start h-auto p-3 text-left",
                  isActive && "bg-primary text-primary-foreground"
                )}
                onClick={() => onSectionChange(item.id)}
              >
                <div className="flex items-start gap-3 w-full">
                  <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{item.title}</span>
                    </div>
                    <p
                      className={cn(
                        "text-xs leading-relaxed",
                        isActive
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground"
                      )}
                    >
                      {item.description}
                    </p>
                  </div>
                </div>
              </Button>
            );
          })}
        </CardContent>
    </Card>
  );

  if (isMobile) {
    // Overlay modal en mobile
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-40 flex">
        <div className="fixed inset-0 bg-black/40" onClick={onClose} />
        <div className="relative w-4/5 max-w-xs bg-white h-full shadow-lg z-50">
          {sidebarContent}
        </div>
      </div>
    );
  }

  // Sidebar fijo en desktop
  return (
    <div className="w-80 border-r bg-muted/10 h-full">
      {sidebarContent}
    </div>
  );
}
