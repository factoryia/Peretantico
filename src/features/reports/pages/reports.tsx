import {
  Package,
  CheckCircle,
  Users,
  Download,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SidebarHeader } from "@/components/navigation/sidebar-header";
import { useCoverageAreasQuery } from "@/features/distributors/hooks/taxonomies";
import { type TaxonomyTerm } from "@/types/global";

const reportStats = [
  {
    title: "Total Solicitudes",
    value: 3,
    Icon: <MessageSquare className="h-6 w-6 text-blue-600" />,
    valueClass: "",
    iconBackground: "bg-blue-100",
  },
  {
    title: "En Proceso",
    value: 1,
    Icon: <Package className="h-6 w-6 text-amber-500" />,
    valueClass: "text-amber-500",
    iconBackground: "bg-amber-100",
  },
  {
    title: "Finalizadas",
    value: 1,
    Icon: <CheckCircle className="h-6 w-6 text-green-500" />,
    valueClass: "text-green-500",
    iconBackground: "bg-green-100",
  },
  {
    title: "Repartidores Activos",
    value: 3,
    Icon: <Users className="h-6 w-6 text-purple-500" />,
    valueClass: "text-purple-500",
    iconBackground: "bg-purple-100",
  },
];

export function Reports() {
  const { data: coverageAreasData } = useCoverageAreasQuery();
  return (
    <div className=" overflow-y-auto h-full">
      <SidebarHeader title="Gestión de reportes" />
      <div className="flex flex-1 flex-col gap-6 p-6 bg-gray-50">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {reportStats.map(
            ({ title, value, Icon, valueClass, iconBackground }) => (
              <Card>
                <CardContent className="flex items-center justify-between px-6">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <h3 className={cn("text-3xl font-bold mt-1", valueClass)}>
                      {value}
                    </h3>
                  </div>
                  <div className={cn("p-3 rounded-full", iconBackground)}>
                    {Icon}
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>

        {/* Generate Reports Section */}
        <Card>
          <CardContent className="px-6">
            <h2 className="text-xl font-semibold mb-6 border-b pb-3">
              Generar Reportes
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Report of Requests */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Reporte de Solicitudes</h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Periodo
                    </label>
                    <Select defaultValue="7dias">
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar periodo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7dias">Últimos 7 días</SelectItem>
                        <SelectItem value="30dias">Últimos mes</SelectItem>
                        <SelectItem value="90dias">Últimos 3 meses</SelectItem>
                        <SelectItem value="personalizado">
                          Personalizado
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Estado
                    </label>
                    <Select defaultValue="todos">
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos los estados</SelectItem>
                        <SelectItem value="nuevo">Nuevo</SelectItem>
                        <SelectItem value="en-proceso">En proceso</SelectItem>
                        <SelectItem value="en-tránsito">En tránsito</SelectItem>
                        <SelectItem value="finalizado">Finalizado</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    <Download className="mr-2 h-4 w-4" /> Descargar Excel
                  </Button>
                </div>
              </div>

              {/* Report of Delivery Drivers */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Reporte de Repartidores</h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Zona
                    </label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione zona" />
                      </SelectTrigger>

                      <SelectContent>
                        {coverageAreasData?.map((area: TaxonomyTerm) => (
                          <SelectItem key={area.id} value={area.id}>
                            {area.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Estado
                    </label>
                    <Select defaultValue="todos">
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="activo">Activos</SelectItem>
                        <SelectItem value="inactivo">Inactivos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    <Download className="mr-2 h-4 w-4" /> Descargar PDF
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
