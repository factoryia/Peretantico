import { toast } from "sonner";
import { Search } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { AlertModal } from "@/components/common/alert-modal";
import type { Category, Service } from "@/features/config/types";
import { fetchActiveCategories } from "@/features/config/utils/category";
import { ServiceTable } from "@/features/config/components/services/services-table";
import { ServiceDialog } from "@/features/config/components/services/service-dialog";
import {
  deleteService,
  fetchServicesByCategory,
} from "@/features/config/utils/service";
import { TableSkeleton } from "@/components/common/skeletons/table-skeleton";

export const ServicesTab = () => {
  const queryClient = useQueryClient();

  const [isPending, startTransition] = useTransition();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [selectedCategoriaId, setSelectedCategoriaId] = useState<string>("");
  const [editingService, setEditingService] = useState<Service | null>(null);

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<
    Category[],
    Error
  >({
    queryKey: ["categories"],
    queryFn: fetchActiveCategories,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Set the first category as default when categories load
  useEffect(() => {
    if (categories.length > 0 && selectedCategoriaId === "") {
      setSelectedCategoriaId(categories[0].uuid);
    }
  }, [categories]);

  const { data: fetchedServices = [], isLoading: isLoadingServices } = useQuery<
    Service[],
    Error
  >({
    queryKey: ["services", selectedCategoriaId],
    queryFn: () => fetchServicesByCategory(selectedCategoriaId),
    enabled: !!selectedCategoriaId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const filteredServices = fetchedServices.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.categoryName.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          queryKey: ["services", selectedCategoriaId],
        });
      } catch (error) {
        const err = error as AxiosError<{ message: string }>;
        toast.error("Error al eliminar el servicio", {
          description:
            err.response?.data?.message ??
            "Ocurrió un error inesperado al eliminar el servicio.",
        });
        console.error("Error al eliminar servicio:", err);
      } finally {
        setServiceId("");
        setIsAlertOpen(false);
      }
    });
  };

  return (
    <>
      <div className="space-y-6">
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
              <div className="flex justify-between pb-2">
                <div className="flex items-center relative">
                  <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar servicios..."
                    className="pl-8 min-w-[300px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
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
                : `${filteredServices.length} servicio(s) encontrado(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingCategories ? (
              <TableSkeleton />
            ) : (
              <ServiceTable
                services={filteredServices}
                onEdit={handleEdit}
                onDelete={(id) => {
                  setServiceId(id);
                  setIsAlertOpen(true);
                }}
                isLoading={isLoadingServices}
              />
            )}
          </CardContent>
        </Card>
      </div>
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
    </>
  );
};
