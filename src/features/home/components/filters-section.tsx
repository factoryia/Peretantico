import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function FiltersSection() {
  return (
    <div className="space-y-4 bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Filtros</h3>
        <Button variant="link" className="text-blue-600 p-0 h-auto">
          Limpiar filtros
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Estado</label>
          <Select defaultValue="todos">
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="nuevo">Nuevo</SelectItem>
              <SelectItem value="en-proceso">En proceso</SelectItem>
              <SelectItem value="finalizado">Finalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Categoría</label>
          <Select defaultValue="todas">
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="medicamentos">Medicamentos</SelectItem>
              <SelectItem value="tramites">Trámites</SelectItem>
              <SelectItem value="paquetes">Paquetes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Repartidor</label>
          <Select defaultValue="todos">
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar repartidor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="carlos">Carlos Ruiz</SelectItem>
              <SelectItem value="ana">Ana López</SelectItem>
              <SelectItem value="pedro">Pedro Sánchez</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Búsqueda</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input placeholder="Buscar por nombre o número..." className="pl-10" />
          </div>
        </div>
      </div>
    </div>
  )
}
