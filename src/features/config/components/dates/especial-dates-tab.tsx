"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  createSpecialDate,
  fetchSpecialDates,
  updateSpecialDate,
} from "../../utils/special.date";
import type { SpecialDateFormValues } from "../../schemas";
import { SpecialDateDialog } from "./special-date-dialog";
import { SpecialDateDetailDialog } from "./special-date-detail-dialog";
import { SpecialDateTable } from "./special-date-table";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SpecialDatesTab() {
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<SpecialDate | null>(null);
  const [viewingDate, setViewingDate] = useState<SpecialDate | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading } = useQuery({
    queryKey: ["special-dates", searchTerm, currentPage, pageSize],
    queryFn: () => fetchSpecialDates(searchTerm, currentPage, pageSize),
    staleTime: 60_000 * 5,
  });

  const specialDates = data?.specialDates ?? [];
  const totalPages = data?.totalPages ?? 1;

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
        await updateSpecialDate(editingDate.id, formData);
        toast.success("Fecha especial actualizada");
      } else {
        await createSpecialDate(formData);
        toast.success("Fecha especial creada");
      }
      setIsDialogOpen(false);
      setEditingDate(null);
      await queryClient.invalidateQueries({ queryKey: ["special-dates"] });
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
