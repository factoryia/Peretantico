"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Subservice } from "../../types";
import { fetchActiveCategories } from "../../utils/category";
import { fetchServicesByCategory } from "../../utils/service";
import { createSubservice, deleteSubservice, fetchSubservicesByService, updateSubservice } from "../../utils/subservice";
import { SubserviceTable } from "./subservice-table";
import { SubserviceDialog } from "./subservice-dialog";
import type { SubserviceFormValues } from "../../schemas";

export function SubservicesTab() {
  const queryClient = useQueryClient();

  // Estados locales
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubservice, setEditingSubservice] = useState<Subservice | null>(null);
  const [selectedCategoriaId, setSelectedCategoriaId] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");

  // Categorías principales (servicios principales)
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchActiveCategories,
    staleTime: 5 * 60 * 1000,
  });

  // Servicios por categoría
  const { data: services = [], isLoading: isLoadingServices } = useQuery({
    queryKey: ["services", selectedCategoriaId],
    queryFn: () => fetchServicesByCategory(selectedCategoriaId),
    enabled: !!selectedCategoriaId,
    staleTime: 5 * 60 * 1000,
  });

  // Subservicios hijos
  const { data: subservices = [], isLoading: isLoadingSubservices } = useQuery({
    queryKey: ["subservices", selectedServiceId],
    queryFn: () => fetchSubservicesByService(selectedServiceId),
    enabled: !!selectedServiceId,
    staleTime: 5 * 60 * 1000,
  });

  // Setear la primera categoría por defecto
  React.useEffect(() => {
    if (categories.length > 0 && !selectedCategoriaId) {
      setSelectedCategoriaId(categories[0].uuid);
    }
  }, [categories]);

  // Setear el primer servicio por defecto cuando cambia la categoría
  React.useEffect(() => {
    if (services.length > 0 && !selectedServiceId) {
      setSelectedServiceId(String(services[0].id));
    } else if (services.length === 0) {
      setSelectedServiceId("");
    }
  }, [services]);

  // Mutaciones
  const createMutation = useMutation({
    mutationFn: (data: SubserviceFormValues) => createSubservice(data, selectedServiceId),
    onSuccess: () => {
      toast.success("Subservicio creado correctamente");
      queryClient.invalidateQueries({ queryKey: ["subservices", selectedServiceId] });
      setDialogOpen(false);
      setEditingSubservice(null);
    },
    onError: () => toast.error("Error al crear el subservicio"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SubserviceFormValues }) => updateSubservice(id, data),
    onSuccess: () => {
      toast.success("Subservicio actualizado correctamente");
      queryClient.invalidateQueries({ queryKey: ["subservices", selectedServiceId] });
      setDialogOpen(false);
      setEditingSubservice(null);
    },
    onError: () => toast.error("Error al actualizar el subservicio"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSubservice,
    onSuccess: () => {
      toast.success("Subservicio eliminado correctamente");
      queryClient.invalidateQueries({ queryKey: ["subservices", selectedServiceId] });
    },
    onError: () => toast.error("Error al eliminar el subservicio"),
  });

  // Filtrado de subservicios
  const filteredSubservices = subservices.filter((sub) =>
    [sub.nombre, sub.servicioNombre, sub.codigo]
      .join(" ")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // Acciones
  const handleEdit = (sub: Subservice) => {
    setEditingSubservice(sub);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleNew = () => {
    setEditingSubservice(null);
    setDialogOpen(true);
  };

  const handleSave = (data: SubserviceFormValues) => {
    const dataWithContext = {
      ...data,
      categoriaId: selectedCategoriaId,
      servicioId: selectedServiceId,
    };
    if (editingSubservice) {
      updateMutation.mutate({ id: String(editingSubservice.id), data: dataWithContext });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Gestión de Subservicios</h2>
        <p className="text-muted-foreground">
          Asocia subservicios a cada tipo de servicio principal para definir con mayor precisión los requerimientos del usuario.
        </p>
      </div>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Gestión de Subservicios</CardTitle>
                <CardDescription>
                  Asocia subservicios a cada tipo de servicio principal.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {/* Select de categorías principales */}
                <select
                  className="border rounded px-3 py-2"
                  value={selectedCategoriaId}
                  onChange={e => {
                    setSelectedCategoriaId(e.target.value);
                    setSelectedServiceId(""); // Reinicia el servicio seleccionado
                  }}
                  disabled={isLoadingCategories}
                >
                  {categories.map((cat) => (
                    <option key={cat.uuid} value={cat.uuid}>{cat.name}</option>
                  ))}
                </select>
                {/* Select de servicios hijos */}
                <select
                  className="border rounded px-3 py-2"
                  value={selectedServiceId}
                  onChange={e => setSelectedServiceId(e.target.value)}
                  disabled={isLoadingServices || services.length === 0}
                >
                  {services.length === 0 && <option value="">Sin servicios</option>}
                  {services.map((srv) => (
                    <option key={String(srv.id)} value={String(srv.id)}>{srv.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="relative w-80">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar subservicios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
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
              {filteredSubservices.length} subservicio(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSubservices ? (
              <div className="py-12 text-center text-muted-foreground">
                Cargando subservicios...
              </div>
            ) : filteredSubservices.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No hay subservicios para mostrar.
              </div>
            ) : (
              <SubserviceTable
                subservices={filteredSubservices}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isLoading={isLoadingSubservices}
              />
            )}
          </CardContent>
        </Card>
      </div>
      <SubserviceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSave}
        isEdit={!!editingSubservice}
        initialData={
          editingSubservice
            ? {
              nombre: editingSubservice.nombre,
              descripcion: editingSubservice.descripcion,
              codigo: editingSubservice.codigo,
              valor: editingSubservice.valor,
              valorPrioridad: editingSubservice.valorPrioridad,
              estado: editingSubservice.estado,
            }
            : undefined
        }
      />
    </div>
  );
}
