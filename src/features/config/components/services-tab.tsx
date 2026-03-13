import { toast } from "sonner";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertModal } from "@/components/common/alert-modal";
import type { Service, ServiceField } from "@/features/config/types";
import { ServiceTable } from "@/features/config/components/services/services-table";
import { ServiceDialog } from "@/features/config/components/services/service-dialog";
import { SearchInput } from "@/components/common/search-input";
import { Paginator } from "@/components/common/paginator";

export const ServicesTab = () => {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [serviceId, setServiceId] = useState<string>("");
  const [editingService, setEditingService] = useState<Service | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Convex Query
  const rawServices = useQuery(api.services.listAll);
  const removeServiceMutation = useMutation(api.services.remove);

  // Map Convex services to frontend Service type
  const mappedServices: Service[] = (rawServices || []).map((s: any) => {
    const fields: ServiceField[] = (s.fields || []).map((f: any) => ({
      id: f._id,
      name: f.name,
      code: f.code ?? null,
      description: f.description ?? null,
      type: f.type,
      required: !!f.required,
      multiple: !!f.multiple,
      order: typeof f.order === "number" ? f.order : 0,
      options: f.options ?? null,
      status: !!f.status,
      settings: f.settings ?? null,
    }));

    return {
      id: s._id,
      categoryId: "",
      categoryName: "",
      name: s.name,
      description: s.description ?? undefined,
      price: s.price ?? 0,
      status: s.status ? "activo" : "inactivo",
      creationDate: s._creationTime ? new Date(s._creationTime).toISOString().split('T')[0] : "",
      fields,
    };
  });

  // Client-side filtering and pagination
  const filteredServices = searchTerm
    ? mappedServices.filter((svc) =>
        svc.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : mappedServices;

  const totalPages = Math.max(1, Math.ceil(filteredServices.length / pageSize));
  const start = (currentPage - 1) * pageSize;
  const services = filteredServices.slice(start, start + pageSize);
  const isLoadingServices = rawServices === undefined;

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await removeServiceMutation({
        id: serviceId as Id<"services">,
      });

      toast.success("Servicio eliminado", {
        description: "El servicio fue eliminado correctamente.",
      });
    } catch (error: any) {
      toast.error("Error al eliminar el servicio", {
        description: error?.message ?? "Ocurrió un error inesperado.",
      });
    } finally {
      setIsDeleting(false);
      setServiceId("");
      setIsAlertOpen(false);
    }
  };

  return (
    <>
      <AlertModal
        description="Esta acción eliminará permanentemente el servicio y sus campos. No se puede deshacer."
        isSubmitting={isDeleting}
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
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="w-full grid items-end gap-4 ">
              <div className="grid gap-4 rounded-lg border bg-muted border-dashed border-border p-4">
                <div>
                  <h3 className="text-lg font-semibold">
                    Crear nuevo servicio
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Define el tipo de servicio y su estado.
                  </p>
                </div>
                <div className="grid items-end gap-4 md:grid-cols-2">
                  <ServiceDialog
                    open={isDialogOpen}
                    editingService={editingService}
                    onOpenChange={(open) => {
                      setIsDialogOpen(open);
                      if (!open && editingService) {
                        setEditingService(null);
                      }
                    }}
                    setEditingService={setEditingService}
                    setIsDialogOpen={setIsDialogOpen}
                  />
                </div>
              </div>
            </div>
            <div>
              <div className="flex flex-wrap flex-col sm:flex-row sm:items-center justify-between space-y-2">
                <SearchInput
                  placeholder="Buscar servicios..."
                  value={searchTerm}
                  onValueChange={(value) => setSearchTerm(value)}
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
                ? "Cargando servicios..."
                : `${filteredServices.length} servicio(s) encontrado(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </>
  );
};
