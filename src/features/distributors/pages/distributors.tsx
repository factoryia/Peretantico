import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useTransition } from "react";
import { SidebarHeader } from "@/components/navigation/sidebar-header";
import { useDistributorsQuery } from "../hooks/distributors";
import {
  useCoverageAreasQuery,
  useDocumentTypesQuery,
  useTransportationTypesQuery,
} from "../hooks/taxonomies";
import { FilterSelect } from "@/components/common/filter-select";
import { DistributorCard } from "../components/distributor-card";
import { SearchInput } from "@/components/common/search-input";
import { DistributorDetailDialog } from "../components/distributor-detail-dialog";
import type { Distributor } from "../types/distributors";
import { DistributorDialog } from "../components/distributor-dialog";
import { AlertModal } from "@/components/common/alert-modal";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { deleteDistributor } from "../utils/distributors";
import { DISTRIBUTORS_QUERY_KEY } from "../constants/query-keys";
import type { AxiosError } from "axios";
import { DistributorCardSkeleton } from "../components/distributor-card-skeleton";

interface DistributorFilters {
  coverageAreaId: string;
  status: string;
  fullName: string;
  documentNumber: string;
  page: number;
  limit: number;
}

const STATUS_OPTIONS = [
  { name: "Todos los estados", id: "all" },
  { name: "Disponible", id: "true" },
  { name: "No disponible", id: "false" },
];

export function Distributors() {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const [distributorId, setDistributorId] = useState("");
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedDistributor, setSelectedDistributor] =
    useState<Distributor | null>(null);

  const [filters, setFilters] = useState<DistributorFilters>({
    coverageAreaId: "all",
    status: "all",
    fullName: "",
    documentNumber: "",
    page: 1,
    limit: 10,
  });

  const updateFilters = (newFilters: Partial<DistributorFilters>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: newFilters.page !== undefined ? newFilters.page : 1, // Reset to page 1 on filter change
    }));
  };

  // Fetch coverage areas
  const {
    data: coverageAreaOptions = [{ id: "all", name: "Todos" }],
    isLoading: isLoadingCoverageAreas,
  } = useCoverageAreasQuery();

  // Fetch document types and transportation types
  const { data: documentTypesOptions = [{ id: "all", name: "Todos" }] } =
    useDocumentTypesQuery();

  const { data: transportationTypes = [{ id: "all", name: "Todos" }] } =
    useTransportationTypesQuery();

  const {
    data,
    isLoading: isLoadingDistributors,
    error,
  } = useDistributorsQuery({
    coverageAreaId:
      filters.coverageAreaId !== "all" ? filters.coverageAreaId : undefined,
    status: filters.status !== "all" ? filters.status === "true" : undefined,
    fullName: filters.fullName || undefined,
    documentNumber: filters.documentNumber || undefined,
    page: filters.page,
    limit: filters.limit,
  });

  const handleViewDetail = (distributor: Distributor) => {
    setSelectedDistributor(distributor);
    setIsDetailDialogOpen(true);
  };

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteDistributor(distributorId);

        toast.success("Distribuidor eliminado", {
          description: "El distribuidor fue eliminado correctamente.",
        });

        await queryClient.invalidateQueries({
          queryKey: [DISTRIBUTORS_QUERY_KEY],
          exact: false,
        });
      } catch (error) {
        const err = error as AxiosError<{ message: string }>;
        toast.error("Error al eliminar el distribuidor", {
          description:
            err.response?.data?.message ??
            "Ocurrió un error inesperado al eliminar el distribuidor.",
        });
      } finally {
        setDistributorId("");
        setIsAlertOpen(false);
      }
    });
  };

  return (
    <>
      <AlertModal
        description="Esta acción no se puede deshacer. Se eliminará permanentemente el distribuidor seleccionado."
        isSubmitting={isPending}
        open={isAlertOpen}
        onSubmit={handleDelete}
        onOpenChange={(open) => {
          setDistributorId("");
          setIsAlertOpen(open);
        }}
      />
      <div className="h-dvh ">
        <SidebarHeader title="Configuración" />
        <div className="h-full overflow-y-auto p-4 md:px-6">
          {isLoadingDistributors && (
            <div className="text-center">Cargando...</div>
          )}
          {error && (
            <div className="text-center text-red-500">
              Error: {error.message}
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Repartidores</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {data?.distributors.length} repartidor(es) encontrado(s)
                  </p>
                </div>
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  className="w-full sm:w-auto"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Repartidor
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <SearchInput
                  placeholder="Buscar categorías..."
                  value={filters.fullName}
                  onValueChange={(value) => updateFilters({ fullName: value })}
                  className="md:min-w-full"
                />
                <SearchInput
                  placeholder="Buscar por documento..."
                  value={filters.documentNumber}
                  onValueChange={(value) =>
                    updateFilters({ documentNumber: value })
                  }
                  className="md:min-w-full"
                />

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
                <FilterSelect
                  placeholder="Estado"
                  options={STATUS_OPTIONS}
                  value={filters.status}
                  onValueChange={(value) => updateFilters({ status: value })}
                />
              </div>

              {/* Grid de Cards */}
              {isLoadingDistributors ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <DistributorCardSkeleton key={index} />
                  ))}
                </div>
              ) : data?.distributors && data.distributors.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                  {data.distributors.map((distributor) => (
                    <DistributorCard
                      key={distributor.id}
                      distributor={distributor}
                      onEdit={(distributor) => {
                        setSelectedDistributor(distributor);
                        setIsDialogOpen(true);
                      }}
                      onViewDetail={handleViewDetail}
                      onDelete={(distributor) => {
                        setDistributorId(distributor.id);
                        setIsAlertOpen(true);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">
                    No se encontraron repartidores
                  </h3>
                  <p className="text-muted-foreground">
                    No hay repartidores que coincidan con los filtros aplicados.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <DistributorDetailDialog
        open={isDetailDialogOpen}
        onOpenChange={(open) => {
          setIsDetailDialogOpen(open);
          if (!open) {
            setSelectedDistributor(null);
          }
        }}
        distributor={selectedDistributor}
      />

      <DistributorDialog
        coverageAreas={coverageAreaOptions}
        documentTypes={documentTypesOptions}
        transportationTypes={transportationTypes}
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open && selectedDistributor) {
            setSelectedDistributor(null);
          }
        }}
        distributor={selectedDistributor}
      />
    </>
  );
}
