import { Plus, Users, Search, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useTransition } from "react";
import { SidebarHeader } from "@/components/navigation/sidebar-header";
import { useDistributorsQuery } from "../hooks/distributors";
import {
  useCoverageAreasQuery,
  useDocumentTypesQuery,
  useTransportationTypesQuery,
} from "../hooks/taxonomies";
import { DistributorCard } from "../components/distributor-card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DistributorFilters {
  coverageAreaId: string;
  status: string;
  fullName: string;
  documentNumber: string;
  transportationTypeId: string;
  documentType: string;
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
    transportationTypeId: "all",
    documentType: "all",
    page: 1,
    limit: 10,
  });

  const updateFilters = (newFilters: Partial<DistributorFilters>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: newFilters.page !== undefined ? newFilters.page : 1,
    }));
  };

  const clearFilters = () => {
    setFilters({
      coverageAreaId: "all",
      status: "all",
      fullName: "",
      documentNumber: "",
      transportationTypeId: "all",
      documentType: "all",
      page: 1,
      limit: 10,
    });
  };

  const { data: coverageAreaOptions = [] } = useCoverageAreasQuery();

  const { data: documentTypesOptions = [] } = useDocumentTypesQuery();
  const { data: transportationTypes = [] } = useTransportationTypesQuery();

  const { data, isLoading: isLoadingDistributors } = useDistributorsQuery({
    coverageAreaId:
      filters.coverageAreaId !== "all" ? filters.coverageAreaId : undefined,
    status: filters.status !== "all" ? filters.status === "true" : undefined,
    fullName: filters.fullName || undefined,
    documentNumber: filters.documentNumber || undefined,
    transportationTypeId:
      filters.transportationTypeId !== "all"
        ? filters.transportationTypeId
        : undefined,
    documentType:
      filters.documentType !== "all" ? filters.documentType : undefined,
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
        toast.success("Distribuidor eliminado");
        await queryClient.invalidateQueries({
          queryKey: [DISTRIBUTORS_QUERY_KEY],
          exact: false,
        });
      } catch (error) {
        const err = error as AxiosError<{ message: string }>;
        toast.error(err.response?.data?.message ?? "Error al eliminar");
      } finally {
        setDistributorId("");
        setIsAlertOpen(false);
      }
    });
  };

  const hasActiveFilters =
    filters.fullName ||
    filters.documentNumber ||
    filters.coverageAreaId !== "all" ||
    filters.status !== "all" ||
    filters.transportationTypeId !== "all" ||
    filters.documentType !== "all";

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

      <div className="h-dvh">
        <SidebarHeader title="Configuración" />
        <div className="h-full overflow-y-auto pb-20">
          <div className="space-y-6 font-['Poppins',sans-serif] p-4 md:p-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border relative overflow-hidden border-l-4 border-l-blue-600">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                    Repartidores
                  </h2>
                  <p className="text-sm text-gray-500 font-medium">
                    {isLoadingDistributors
                      ? "Cargando..."
                      : `${
                          data?.distributors?.length || 0
                        } repartidor(es) gestionados`}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="h-10 bg-white hover:bg-gray-50 border-gray-200 text-gray-700 px-4 rounded-lg font-semibold"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Limpiar
                  </Button>
                )}
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  size="sm"
                  className="h-10 bg-blue-600 hover:bg-blue-700 text-white shadow-sm px-4 rounded-lg font-semibold w-full sm:w-auto"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Repartidor
                </Button>
              </div>
            </div>

            {/* Filters Section */}
            <div className="bg-white p-6 rounded-3xl border space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Filter className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Filtrar Búsqueda
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-500 ml-1">
                    NOMBRE COMPLETO
                  </Label>
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <Input
                      placeholder="Ej: Juan Pérez..."
                      value={filters.fullName}
                      onChange={(e) =>
                        updateFilters({ fullName: e.target.value })
                      }
                      className="pl-10 h-11 bg-gray-50/50 border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-500 ml-1">
                    DOCUMENTO
                  </Label>
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <Input
                      placeholder="Número de identificación..."
                      value={filters.documentNumber}
                      onChange={(e) =>
                        updateFilters({ documentNumber: e.target.value })
                      }
                      className="pl-10 h-11 bg-gray-50/50 border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-500 ml-1">
                    COBERTURA
                  </Label>
                  <Select
                    value={filters.coverageAreaId}
                    onValueChange={(value) =>
                      updateFilters({ coverageAreaId: value })
                    }
                  >
                    <SelectTrigger className="h-11 bg-gray-50/50 border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/10 transition-all">
                      <SelectValue placeholder="Todas las zonas" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                      <SelectItem value="all">Todas las zonas</SelectItem>
                      {coverageAreaOptions.map((area) => (
                        <SelectItem key={area.id} value={area.id}>
                          {area.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-500 ml-1">
                    TIPO TRANSPORTE
                  </Label>
                  <Select
                    value={filters.transportationTypeId}
                    onValueChange={(value) =>
                      updateFilters({ transportationTypeId: value })
                    }
                  >
                    <SelectTrigger className="h-11 bg-gray-50/50 border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/10 transition-all">
                      <SelectValue placeholder="Todos los tipos" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      {transportationTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-500 ml-1">
                    TIPO DOCUMENTO
                  </Label>
                  <Select
                    value={filters.documentType}
                    onValueChange={(value) =>
                      updateFilters({ documentType: value })
                    }
                  >
                    <SelectTrigger className="h-11 bg-gray-50/50 border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/10 transition-all">
                      <SelectValue placeholder="Todos los documentos" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                      <SelectItem value="all">Todos los documentos</SelectItem>
                      {documentTypesOptions.map((dt) => (
                        <SelectItem key={dt.id} value={dt.id}>
                          {dt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-500 ml-1">
                    ESTADO
                  </Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => updateFilters({ status: value })}
                  >
                    <SelectTrigger className="h-11 bg-gray-50/50 border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/10 transition-all">
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          {status.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Content Section */}
            {isLoadingDistributors ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <DistributorCardSkeleton key={index} />
                ))}
              </div>
            ) : data?.distributors && data.distributors.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                {data.distributors.map((distributor, index) => (
                  <DistributorCard
                    key={distributor.id}
                    distributor={distributor}
                    index={index}
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
              <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-200">
                <div className="p-4 bg-gray-50 rounded-full w-fit mx-auto mb-4">
                  <Users className="h-12 w-12 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  No se encontraron repartidores
                </h3>
                <p className="text-gray-500 max-w-xs mx-auto mt-2">
                  No hay repartidores registrados que coincidan con los
                  criterios de búsqueda actuales.
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="link"
                    onClick={clearFilters}
                    className="mt-4 text-blue-600 font-bold"
                  >
                    Limpiar todos los filtros
                  </Button>
                )}
              </div>
            )}
          </div>
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
