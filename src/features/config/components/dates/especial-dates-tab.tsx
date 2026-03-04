"use client";
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
import { SearchInput } from "@/components/common/search-input";
import { Paginator } from "@/components/common/paginator";
import { TableSkeleton } from "@/components/common/skeletons/table-skeleton";
import type { SpecialDate } from "../../types";
import type { SpecialDateFormValues } from "../../schemas";
import { SpecialDateDialog } from "./special-date-dialog";
import { SpecialDateDetailDialog } from "./special-date-detail-dialog";
import { SpecialDateTable } from "./special-date-table";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SpecialDatesTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<SpecialDate | null>(null);
  const [viewingDate, setViewingDate] = useState<SpecialDate | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const rawSpecialDates = useQuery(api.specialDates.list, { searchTerm });
  const createSpecialDate = useMutation(api.specialDates.create);
  const updateSpecialDate = useMutation(api.specialDates.update);

  const isLoading = rawSpecialDates === undefined;

  // Map Convex data to SpecialDate type
  const mappedSpecialDates: SpecialDate[] = (rawSpecialDates || []).map((d) => ({
    id: d._id,
    title: d.title,
    description: d.description,
    date: d.date,
    repeat: d.repeat,
    status: d.status,
    createdAt: new Date(d._creationTime).toISOString(),
    updatedAt: new Date(d._creationTime).toISOString(),
  }));

  const totalItems = mappedSpecialDates.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const specialDates = mappedSpecialDates.slice(startIndex, endIndex);

  const handleEdit = (date: SpecialDate) => {
    setEditingDate(date);
    setIsDialogOpen(true);
  };

  const handleView = (date: SpecialDate) => {
    setViewingDate(date);
    setIsDetailDialogOpen(true);
  };

  const handleCreateOrUpdate = async (formData: SpecialDateFormValues) => {
    try {
      if (editingDate) {
        await updateSpecialDate({
          id: editingDate.id as Id<"specialDates">,
          title: formData.title,
          description: formData.description,
          date: formData.date,
          repeat: formData.repeat === "si",
          status: formData.status === "activo",
        });
        toast.success("Fecha especial actualizada");
      } else {
        await createSpecialDate({
          title: formData.title,
          description: formData.description,
          date: formData.date,
          repeat: formData.repeat === "si",
          status: formData.status === "activo",
        });
        toast.success("Fecha especial creada");
      }
      setIsDialogOpen(false);
      setEditingDate(null);
    } catch {
      toast.error("Error al guardar la fecha especial");
    }
  };

  return (
    <>
      <SpecialDateDialog
        key={editingDate ? editingDate.id : "new"}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleCreateOrUpdate}
        editingDate={editingDate}
      />
      <SpecialDateDetailDialog
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        viewingDate={viewingDate}
      />
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Fechas Especiales
            </CardTitle>
            <CardDescription>
              Gestiona fechas especiales para el sistema de notificaciones.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap flex-col sm:flex-row sm:items-center justify-between space-y-2">
              <SearchInput
                placeholder="Buscar fechas especiales..."
                value={searchTerm}
                onValueChange={setSearchTerm}
              />
              <Button
                onClick={() => {
                  setEditingDate(null);
                  setIsDialogOpen(true);
                }}
              >
                Nueva Fecha
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lista de Fechas Especiales</CardTitle>
            <CardDescription>
              {isLoading
                ? "Cargando..."
                : `${specialDates.length} fecha(s) encontrada(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton />
            ) : (
              <>
                <SpecialDateTable
                  specialDates={specialDates}
                  onEdit={handleEdit}
                  onView={handleView}
                />
                <Paginator
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
