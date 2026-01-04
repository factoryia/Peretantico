"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus, Search, Filter } from "lucide-react";
import type { RequestFilters } from "../types/request";
import {
  useSubservicesQuery,
  useDistributorsQuery,
  useApplicationStatusesQuery,
} from "../hooks/use-request-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FiltersSectionProps {
  filters: RequestFilters;
  onFiltersChange: (filters: RequestFilters) => void;
  onNewRequest: () => void;
}

export function FiltersSection({
  filters,
  onFiltersChange,
  onNewRequest,
}: FiltersSectionProps) {
  const { data: subservicesData, isLoading: isLoadingSubservices } =
    useSubservicesQuery();
  const { data: distributorsData, isLoading: isLoadingDistributors } =
    useDistributorsQuery();
  const { data: statusesData, isLoading: isLoadingStatuses } =
    useApplicationStatusesQuery();

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters: RequestFilters = {
      status: "all",
      subservice: "all",
      assignedDistributor: "all",
      requestNumber: "",
      applicantName: "",
    };
    onFiltersChange(emptyFilters);
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== "" && value !== "all"
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 border rounded-3xl">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 rounded-md">
            <Filter className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
              Filtros
            </h2>
            <p className="text-sm text-muted-foreground">
              refina tu búsqueda de solicitudes
            </p>
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="h-9 bg-white hover:bg-gray-50 border-gray-200 text-gray-700 w-full sm:w-auto"
            >
              <X className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          )}
          <Button
            onClick={onNewRequest}
            size="sm"
            className="h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-sm w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Solicitud
          </Button>
        </div>
      </div>

      <div className="bg-white p-8 border rounded-3xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {/* Estado de la solicitud */}
          <div className="space-y-1.5">
            <Label
              htmlFor="status"
              className="text-xs font-semibold text-gray-500 uppercase tracking-wide"
            >
              Estado
            </Label>
            <Select
              value={filters.status || "all"}
              onValueChange={(value) => handleFilterChange("status", value)}
              disabled={isLoadingStatuses}
            >
              <SelectTrigger
                id="status"
                className="bg-gray-50/50 border-gray-200 h-10"
              >
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {isLoadingStatuses ? "Cargando..." : "Todos"}
                </SelectItem>
                {statusesData?.data?.map((status: any) => (
                  <SelectItem key={status.id} value={status.id}>
                    {status.attributes?.name || "Sin nombre"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subservicio */}
          <div className="space-y-1.5">
            <Label
              htmlFor="subservice"
              className="text-xs font-semibold text-gray-500 uppercase tracking-wide"
            >
              Subservicio
            </Label>
            <Select
              value={filters.subservice || "all"}
              onValueChange={(value) => handleFilterChange("subservice", value)}
              disabled={isLoadingSubservices}
            >
              <SelectTrigger
                id="subservice"
                className="bg-gray-50/50 border-gray-200 h-10"
              >
                <SelectValue placeholder="Subservicio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {isLoadingSubservices ? "Cargando..." : "Todos"}
                </SelectItem>
                {subservicesData?.data?.map((subservice: any) => (
                  <SelectItem key={subservice.id} value={subservice.id}>
                    {subservice.attributes?.name ||
                      subservice.attributes?.title ||
                      "Sin nombre"}
                  </SelectItem>
                )) || []}
              </SelectContent>
            </Select>
          </div>

          {/* Repartidor asignado */}
          <div className="space-y-1.5">
            <Label
              htmlFor="assignedDistributor"
              className="text-xs font-semibold text-gray-500 uppercase tracking-wide"
            >
              Repartidor
            </Label>
            <Select
              value={filters.assignedDistributor || "all"}
              onValueChange={(value) =>
                handleFilterChange("assignedDistributor", value)
              }
              disabled={isLoadingDistributors}
            >
              <SelectTrigger
                id="assignedDistributor"
                className="bg-gray-50/50 border-gray-200 h-10"
              >
                <SelectValue placeholder="Repartidor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {isLoadingDistributors ? "Cargando..." : "Todos"}
                </SelectItem>
                {distributorsData?.data?.map((distributor: any) => (
                  <SelectItem key={distributor.id} value={distributor.id}>
                    {distributor.attributes?.title ||
                      distributor.attributes?.name ||
                      "Sin nombre"}
                  </SelectItem>
                )) || []}
              </SelectContent>
            </Select>
          </div>

          {/* Número de solicitud */}
          <div className="space-y-1.5">
            <Label
              htmlFor="requestNumber"
              className="text-xs font-semibold text-gray-500 uppercase tracking-wide"
            >
              N° Solicitud
            </Label>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <Input
                id="requestNumber"
                placeholder="Buscar..."
                value={filters.requestNumber || ""}
                onChange={(e) =>
                  handleFilterChange("requestNumber", e.target.value)
                }
                className="pl-9 pr-3 py-2.5 h-10 bg-gray-50/50 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:bg-gray-50 shadow-none"
              />
            </div>
          </div>

          {/* Nombre del solicitante */}
          <div className="space-y-1.5">
            <Label
              htmlFor="applicantName"
              className="text-xs font-semibold text-gray-500 uppercase tracking-wide"
            >
              Solicitante
            </Label>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <Input
                id="applicantName"
                placeholder="Buscar..."
                value={filters.applicantName || ""}
                onChange={(e) =>
                  handleFilterChange("applicantName", e.target.value)
                }
                className="pl-9 pr-3 py-2.5 h-10 bg-gray-50/50 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:bg-gray-50 shadow-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
