"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Plus, Search, Filter } from "lucide-react"
import type { RequestFilters } from "../types/request"
import { useSubservicesQuery, useDistributorsQuery } from "../hooks/use-request-query"

interface FiltersSectionProps {
  filters: RequestFilters
  onFiltersChange: (filters: RequestFilters) => void
  onNewRequest: () => void
}

export function FiltersSection({ filters, onFiltersChange, onNewRequest }: FiltersSectionProps) {
  const { data: subservicesData, isLoading: isLoadingSubservices } = useSubservicesQuery()
  const { data: distributorsData, isLoading: isLoadingDistributors } = useDistributorsQuery()

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    onFiltersChange(newFilters)
  }

  const clearFilters = () => {
    const emptyFilters: RequestFilters = {
      status: "all",
      subservice: "all",
      assignedDistributor: "all",
      requestNumber: "",
      applicantName: "",
    }
    onFiltersChange(emptyFilters)
  }

  const hasActiveFilters = Object.values(filters).some((value) => value !== "" && value !== "all")

  // Estados predefinidos para los filtros
  const statusOptions = [
    { value: "all", label: "Todos los estados" },
    { value: "Pendiente", label: "Pendiente" },
    { value: "En proceso", label: "En proceso" },
    { value: "Asignada", label: "Asignada" },
    { value: "Completada", label: "Completada" },
    { value: "Cancelada", label: "Cancelada" },
    { value: "Registrada", label: "Registrada" },
  ]

  return (
    <Card className="border-2 border-gray-100 shadow-sm">
      <CardHeader   >
        <div className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg font-semibold text-gray-800">Filtros de Búsqueda</CardTitle>
          </div>
          <div className="flex gap-2">
            {hasActiveFilters && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearFilters} 
                className="h-8 bg-white hover:bg-gray-50 border-gray-300 text-gray-700"
              >
                <X className="h-4 w-4 mr-1" />
                Limpiar filtros
              </Button>
            )}
            <Button 
              onClick={onNewRequest} 
              size="sm" 
              className="h-8 bg-blue-600 hover:bg-blue-700 text-white shadow-md"
            >
              <Plus className="h-4 w-4 mr-1" />
              Nueva Solicitud
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {/* Estado de la solicitud */}
          <div className="space-y-2">
            <Label htmlFor="status" className="text-sm font-medium text-gray-700">
              Estado de la solicitud
            </Label>
            <select
              id="status"
              value={filters.status || "all"}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all duration-200 hover:border-gray-400"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Subservicio */}
          <div className="space-y-2">
            <Label htmlFor="subservice" className="text-sm font-medium text-gray-700">
              Subservicio
            </Label>
            <select
              id="subservice"
              value={filters.subservice || "all"}
              onChange={(e) => handleFilterChange("subservice", e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all duration-200 hover:border-gray-400"
              disabled={isLoadingSubservices}
            >
              <option value="all">
                {isLoadingSubservices ? "Cargando..." : "Todos los subservicios"}
              </option>
              {subservicesData?.data?.map((subservice: any) => (
                <option key={subservice.id} value={subservice.id}>
                  {subservice.attributes?.name || subservice.attributes?.title || "Sin nombre"}
                </option>
              )) || []}
            </select>
          </div>

          {/* Repartidor asignado */}
          <div className="space-y-2">
            <Label htmlFor="assignedDistributor" className="text-sm font-medium text-gray-700">
              Repartidor asignado
            </Label>
            <select
              id="assignedDistributor"
              value={filters.assignedDistributor || "all"}
              onChange={(e) => handleFilterChange("assignedDistributor", e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all duration-200 hover:border-gray-400"
              disabled={isLoadingDistributors}
            >
              <option value="all">
                {isLoadingDistributors ? "Cargando..." : "Todos los repartidores"}
              </option>
              {distributorsData?.data?.map((distributor: any) => (
                <option key={distributor.id} value={distributor.id}>
                  {distributor.attributes?.title || distributor.attributes?.name || "Sin nombre"}
                </option>
              )) || []}
            </select>
          </div>

          {/* Número de solicitud */}
          <div className="space-y-2">
            <Label htmlFor="requestNumber" className="text-sm font-medium text-gray-700">
              Número de solicitud
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="requestNumber"
                placeholder="Buscar por número"
                value={filters.requestNumber || ""}
                onChange={(e) => handleFilterChange("requestNumber", e.target.value)}
                className="pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all duration-200 hover:border-gray-400"
              />
            </div>
          </div>

          {/* Nombre del solicitante */}
          <div className="space-y-2">
            <Label htmlFor="applicantName" className="text-sm font-medium text-gray-700">
              Nombre del solicitante
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="applicantName"
                placeholder="Buscar por nombre"
                value={filters.applicantName || ""}
                onChange={(e) => handleFilterChange("applicantName", e.target.value)}
                className="pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all duration-200 hover:border-gray-400"
              />
            </div>
          </div>
        </div>

      
      </CardContent>
    </Card>
  )
}
