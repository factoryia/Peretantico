"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Paginator } from "@/components/common/paginator";
import { TableSkeleton } from "@/components/common/skeletons/table-skeleton";
import { DistributorsTable } from "./distributors-table";
import { RequestsModal } from "./requests-modal";
import { PaymentCalculationModal } from "./payment-calculation-modal";
import { fetchDistributors } from "../utils/costs";
import type { Distributor } from "../types";
import { useCoverageAreasQuery } from "../../distributors/hooks/taxonomies";
import { FilterSelect } from "@/components/common/filter-select";

/**
 * Página principal para la gestión de costos.
 * Permite:
 * - Listar distribuidores con paginación
 * - Filtrar distribuidores por nombre y cobertura
 * - Ver solicitudes asignadas a cada distribuidor
 * - Calcular pagos para solicitudes específicas
 */
export default function CostManagementPage() {
  // --- Interfaces ---
  interface DistributorFilters {
    coverageAreaId: string;
    status: string;
  }

  // --- Estados locales ---
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedDistributor, setSelectedDistributor] =
    useState<Distributor | null>(null);
  const [filterName, setFilterName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [filters, setFilters] = useState<DistributorFilters>({
    coverageAreaId: "all",
    status: "all",
  });

  const updateFilters = (newFilters: Partial<DistributorFilters>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));
  };

  // --- Query de distribuidores ---
  const { data: distributors, isLoading: isLoadingDistributors } = useQuery({
    queryKey: ["distributors", filterName, currentPage, pageSize],
    queryFn: fetchDistributors,
    staleTime: 5 * 60 * 1000, // cache por 5 minutos
  });

  // --- Query de zonas ---
  const {
    data: coverageAreaOptions = [{ id: "all", name: "Todos" }],
    isLoading: isLoadingCoverageAreas,
  } = useCoverageAreasQuery();

  // --- Filtros aplicados ---
  const filteredDistributors =
    distributors?.filter((distributor) => {
      const matchesName = distributor.title
        .toLowerCase()
        .includes(filterName.toLowerCase());

      const matchesCoverage =
        filters.coverageAreaId === "all" ||
        distributor.coverageArea?.id === filters.coverageAreaId;

        const matchesStatus =
        filters.status === "all" ||
        distributor.status === (filters.status === "true");

      return matchesName && matchesCoverage && matchesStatus;
    }) ?? [];

  // --- Paginación ---
  const totalPages = Math.ceil(filteredDistributors.length / pageSize);
  const paginatedDistributors = filteredDistributors.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // --- Acciones ---
  const handleViewRequests = (distributor: Distributor) => {
    setSelectedDistributor(distributor);
    setIsRequestsModalOpen(true);
  };

  const handleCalculatePayment = (distributor: Distributor) => {
    setSelectedDistributor(distributor);
    setIsPaymentModalOpen(true);
  };

  return (
    <>
      <div className="space-y-4">
        {/* --- Filtros --- */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold tracking-tight">
                Gestión de Costos
              </CardTitle>
            </div>
            <CardDescription className="text-base">
              Administre los costos y pagos de los distribuidores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="filterName">Filtrar por nombre</Label>
                <Input
                  id="filterName"
                  placeholder="Buscar distribuidor..."
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coverageArea">Zona de cobertura</Label>
                <FilterSelect
                  placeholder="Zona de cobertura"
                  options={[
                    { id: "all", name: "Todas las zonas" },
                    ...coverageAreaOptions,
                  ]}
                  value={filters.coverageAreaId}
                  onValueChange={(value) =>
                    updateFilters({ coverageAreaId: value })
                  }
                  className={isLoadingCoverageAreas ? "opacity-50" : ""}
                  disabled={isLoadingCoverageAreas}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* --- Listado con tabla y paginación --- */}
        <Card>
          <CardHeader>
            <CardTitle>Listado de Distribuidores</CardTitle>
            <CardDescription>
              {isLoadingDistributors
                ? "Cargando distribuidores..."
                : `${filteredDistributors.length} distribuidor(es) encontrado(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingDistributors ? (
              <TableSkeleton />
            ) : (
              <>
                <DistributorsTable
                  distributors={paginatedDistributors}
                  onViewRequests={handleViewRequests}
                  onCalculatePayment={handleCalculatePayment}
                />
                <Paginator
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  pageSize={pageSize}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* --- Modales --- */}
      <RequestsModal
        open={isRequestsModalOpen}
        onOpenChange={setIsRequestsModalOpen}
        distributor={selectedDistributor}
      />

      <PaymentCalculationModal
        open={isPaymentModalOpen}
        onOpenChange={setIsPaymentModalOpen}
        distributor={selectedDistributor}
      />
    </>
  );
}
