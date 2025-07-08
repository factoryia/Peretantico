import { toast } from "sonner";
import type { AxiosError } from "axios";
import { useState, useEffect, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertModal } from "@/components/common/alert-modal";
import type { Category, Service } from "@/features/config/types";
import { fetchAllActiveCategories } from "@/features/config/utils/category";
import { ServiceTable } from "@/features/config/components/services/services-table";
import { ServiceDialog } from "@/features/config/components/services/service-dialog";
import {
  deleteService,
  fetchServicesByCategory,
} from "@/features/config/utils/service";
import { TableSkeleton } from "@/components/common/skeletons/table-skeleton";
import { CATEGORY_QUERY_KEY, SERVICE_QUERY_KEY } from "../constants/query-keys";
import { SearchInput } from "@/components/common/search-input";
import { Paginator } from "@/components/common/paginator";

export const ServicesTab = () => {
  const queryClient = useQueryClient();

  const [isPending, startTransition] = useTransition();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [selectedCategoriaId, setSelectedCategoriaId] = useState<string>("");
  const [editingService, setEditingService] = useState<Service | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<
    Category[],
    Error
  >({
    queryKey: [CATEGORY_QUERY_KEY],
    queryFn: fetchAllActiveCategories,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Set the first category as default when categories load
  useEffect(() => {
    if (categories.length > 0 && selectedCategoriaId === "") {
      setSelectedCategoriaId(categories[0].uuid);
    }
  }, [categories]);

  const { data: servicesData, isLoading: isLoadingServices } = useQuery({
    queryKey: [
      SERVICE_QUERY_KEY,
      selectedCategoriaId,
      searchTerm,
      currentPage,
      pageSize,
    ],
    queryFn: () =>
      fetchServicesByCategory(
        selectedCategoriaId,
        searchTerm,
        currentPage,
        pageSize
      ),
    enabled: !!selectedCategoriaId,
    staleTime: 5 * 60 * 1000,
  });

  const services = servicesData?.services ?? [];
  const totalPages = servicesData?.totalPages ?? 1;

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setIsDialogOpen(true);
  };

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteService(serviceId);

        toast.success("Servicio eliminado", {
          description: "El servicio fue eliminado correctamente.",
        });

        await queryClient.invalidateQueries({
          queryKey: [
            SERVICE_QUERY_KEY,
            selectedCategoriaId,
            searchTerm,
            currentPage,
            pageSize,
          ],
        });
      } catch (error) {
        const err = error as AxiosError<{ message: string }>;
        toast.error("Error al eliminar el servicio", {
          description:
            err.response?.data?.message ??
            "Ocurrió un error inesperado al eliminar el servicio.",
        });
      } finally {
        setServiceId("");
        setIsAlertOpen(false);
      }
    });
  };

  return (
    <>
      <AlertModal
        description="Esta acción no se puede deshacer. Se eliminará permanentemente el servicio seleccionado."
        isSubmitting={isPending}
        open={isAlertOpen}
        onSubmit={handleDelete}
        onOpenChange={(open) => {
          setServiceId("");
          setIsAlertOpen(open);
        }}
      />
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-bold tracking-tight">
                  Gestión de Servicios
                </CardTitle>
                <CardDescription className="text-base">
                  Mantén un catálogo actualizado de tipos de servicio.
                </CardDescription>
              </div>
              {selectedCategoriaId !== "" && (
                <Select
                  value={selectedCategoriaId || undefined}
                  onValueChange={setSelectedCategoriaId}
                >
                  <SelectTrigger className="min-w-fit h-auto">
                    <SelectValue placeholder="Filtrar por categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((categorie) => (
                      <SelectItem key={categorie.uuid} value={categorie.uuid}>
                        {categorie.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex flex-wrap flex-col sm:flex-row sm:items-center justify-between space-y-2">
                <SearchInput
                  placeholder="Buscar servicios..."
                  value={searchTerm}
                  onValueChange={(value) => setSearchTerm(value)}
                />
                <ServiceDialog
                  open={isDialogOpen}
                  categoryId={selectedCategoriaId}
                  onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open && editingService) {
                      setEditingService(null);
                    }
                  }}
                  setEditingService={setEditingService}
                  setIsDialogOpen={setIsDialogOpen}
                  editingService={editingService}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lista de Servicios</CardTitle>
            <CardDescription>
              {isLoadingServices
                ? "Loading services..."
                : `${services.length} servicio(s) encontrado(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingCategories ? (
              <TableSkeleton />
            ) : (
              <>
                <ServiceTable
                  services={services}
                  onEdit={handleEdit}
                  onDelete={(id) => {
                    setServiceId(id);
                    setIsAlertOpen(true);
                  }}
                  isLoading={isLoadingServices}
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
    </>
  );
};
