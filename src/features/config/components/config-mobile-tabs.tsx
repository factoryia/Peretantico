import { Calendar, FileText, Layers, Settings } from "lucide-react";
import { ServicesTab } from "@/features/config/components/services-tab";
import { CategoriesTab } from "@/features/config/components/categories-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpecialDatesTab } from "@/features/config/components/dates/especial-dates-tab";

export function ConfigMobileTabs() {
  return (
    <>
      {/* Tabs de configuración */}
      <Tabs defaultValue="categorias" className="space-y-4">
        <div className="border-b">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto bg-white p-1.5">
            <TabsTrigger
              value="categorias"
              className="flex items-center gap-2 py-3"
            >
              <Settings className="h-4 w-4" />
              <span>Categorías</span>
            </TabsTrigger>
            <TabsTrigger
              value="servicios"
              className="flex items-center gap-2 py-3"
            >
              <Layers className="h-4 w-4" />
              <span>Servicios</span>
            </TabsTrigger>
            <TabsTrigger
              value="subservicios"
              className="flex items-center gap-2 py-3"
            >
              <FileText className="h-4 w-4" />
              <span>Subservicios</span>
            </TabsTrigger>
            <TabsTrigger
              value="fechas"
              className="flex items-center gap-2 py-3"
            >
              <Calendar className="h-4 w-4" />
              <span>Fechas</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="categorias" className="space-y-4">
          <CategoriesTab />
        </TabsContent>

        <TabsContent value="servicios" className="space-y-4">
          <ServicesTab />
        </TabsContent>

        <TabsContent value="subservicios" className="space-y-4">
          <ServicesTab />
        </TabsContent>

        <TabsContent value="fechas" className="space-y-4">
          <SpecialDatesTab />
        </TabsContent>
      </Tabs>
    </>
  );
}
