import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { AxiosError } from "axios";
import { useEffect, useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Subservice } from "@/features/config/types";
import { fetchAllActiveCategories } from "@/features/config/utils/category";
import { fetchServicesByCategoryWithoutFilters } from "@/features/config/utils/service";
import {
  deleteSubservice,
  fetchSubservicesByService,
} from "@/features/config/utils/subservice";
import { SubserviceTable } from "@/features/config/components/services/subservice-table";
import { SubserviceDialog } from "@/features/config/components/services/subservice-dialog";
import { SearchInput } from "@/components/common/search-input";
import { TableSkeleton } from "@/components/common/skeletons/table-skeleton";
import { AlertModal } from "@/components/common/alert-modal";
import { SUBSERVICE_QUERY_KEY } from "@/features/config/constants/query-keys";
import { Paginator } from "@/components/common/paginator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SubservicesTab() {
  const queryClient = useQueryClient();

  // Estados locales
  const [isPending, startTransition] = useTransition();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubservice, setEditingSubservice] = useState<Subservice | null>(
    null
  );
  const [subserviceToDelete, setSubserviceToDelete] = useState<string | null>(
    null
  );
  const [selectedCategoriaId, setSelectedCategoriaId] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Categorías principales (servicios principales)
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchAllActiveCategories,
    staleTime: 5 * 60 * 1000,
  });

  // Servicios por categoría
  const { data: services = [], isLoading: isLoadingServices } = useQuery({
    queryKey: ["services", selectedCategoriaId],
    queryFn: () => fetchServicesByCategoryWithoutFilters(selectedCategoriaId),
    enabled: !!selectedCategoriaId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: subservicesData, isLoading: isLoadingSubservices } = useQuery({
    queryKey: [
      SUBSERVICE_QUERY_KEY,
      selectedServiceId,
      searchTerm,
      currentPage,
      pageSize,
    ],
    queryFn: () =>
      fetchSubservicesByService(
        selectedServiceId,
        searchTerm,
        currentPage,
        pageSize
      ),
    enabled: !!selectedServiceId,
    staleTime: 5 * 60 * 1000,
  });

  const subservices = subservicesData?.subservices ?? [];
  const totalPages = subservicesData?.totalPages ?? 1;
  // Setear la primera categoría por defecto
  useEffect(() => {
    if (categories.length > 0 && !selectedCategoriaId) {
      setSelectedCategoriaId(categories[0].uuid);
    }
  }, [categories]);

  // Setear el primer servicio por defecto cuando cambia la categoría
  useEffect(() => {
    if (services.length > 0 && !selectedServiceId) {
      setSelectedServiceId(String(services[0].id));
    } else if (services.length === 0) {
      setSelectedServiceId("");
    }
  }, [services]);

  // Acciones
  const handleEdit = (sub: Subservice) => {
    setEditingSubservice(sub);
    setDialogOpen(true);
  };

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteSubservice(subserviceToDelete!);

        toast.success("Subservicio eliminado", {
          description: "El subservicio fue eliminado correctamente.",
        });

        queryClient.invalidateQueries({
          queryKey: [SUBSERVICE_QUERY_KEY, selectedServiceId],
        });
        setIsAlertOpen(false);
        setSubserviceToDelete(null);
      } catch (error) {
        const err = error as AxiosError<{ message: string }>;
        toast.error("Error al eliminar el subservicio", {
          description:
            err.response?.data?.message ??
            "Ocurrió un error inesperado al eliminar el subservicio.",
        });
        console.error("Error al eliminar el subservicio:", err);
      } finally {
        setSubserviceToDelete(null);
        setIsAlertOpen(false);
      }
    });
  };

  const handleNew = () => {
    setEditingSubservice(null);
    setDialogOpen(true);
  };

  return (
    <>
      <AlertModal
        description="Esta acción no se puede deshacer. Se eliminará permanentemente el subservicio seleccionado."
        isSubmitting={isPending}
        open={isAlertOpen}
        onSubmit={handleDelete}
        onOpenChange={(open) => {
          setSubserviceToDelete(null);
          setIsAlertOpen(open);
        }}
      />
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-bold tracking-tight">
                  Gestión de Subservicios
                </CardTitle>
                <CardDescription className="text-base">
                  Asocia subservicios a cada tipo de servicio principal.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {/* Select de categorías principales */}
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
                <Select
                  value={selectedServiceId || undefined}
                  onValueChange={setSelectedServiceId}
                >
                  <SelectTrigger className="min-w-fit h-auto">
                    <SelectValue placeholder="Sin servicios" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <SearchInput
                placeholder="Buscar subservicios..."
                value={searchTerm}
                onValueChange={(value) => setSearchTerm(value)}
              />
              <Button onClick={handleNew} disabled={!selectedServiceId}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Subservicio
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Subservicios</CardTitle>
            <CardDescription>
              {subservices.length} subservicio(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingCategories ||
            isLoadingServices ||
            isLoadingSubservices ? (
              <TableSkeleton />
            ) : (
              <>
                <SubserviceTable
                  subservices={subservices}
                  onEdit={handleEdit}
                  onDelete={(id) => {
                    setSubserviceToDelete(id);
                    setIsAlertOpen(true);
                  }}
                  isLoading={isLoadingSubservices}
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
        <SubserviceDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open && editingSubservice) {
              setEditingSubservice(null);
            }
          }}
          isEdit={!!editingSubservice}
          editingSubservice={editingSubservice}
          selectedCategoryId={selectedCategoriaId}
          selectedServiceId={selectedServiceId}
          setDialogOpen={setDialogOpen}
          setEditingSubservice={setEditingSubservice}
        />
      </div>
    </>
  );
}
