"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Trash2, AlertCircle, Edit, Truck } from "lucide-react";
import {
  assignDistributorToRequest,
  assignApplicantToRequest,
  updateRequest,
} from "../utils/request";
import type {
  RequestFilters,
  AssignmentModalData,
  UpdateRequestPayload,
} from "../types/request";
import { useDeleteRequestMutation } from "../hooks/use-request-mutations";
import { TableSkeleton } from "./skeletons/table-skeleton";
import { EmptyState } from "./empty-state";
import {
  useCompleteRequests,
  type CompleteRequest,
} from "../utils/complete-request";
import { RequestsTableDialogs } from "./requests-table-dialogs";
import { Paginator } from "@/components/common/paginator";

interface RequestsTableProps {
  filters?: RequestFilters;
  onRefresh?: () => void;
  onCreateNew?: () => void;
}

export function RequestsTable({
  filters = {},
  onCreateNew,
}: RequestsTableProps) {
  const [deleteRequestId, setDeleteRequestId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Estados para los modales - inicializados como false
  const [modals, setModals] = useState({
    detail: false,
    assignDistributor: false,
    assignApplicant: false,
    edit: false,
  });
  const [selectedRequest, setSelectedRequest] =
    useState<CompleteRequest | null>(null);
  const [assignmentData, setAssignmentData] =
    useState<AssignmentModalData | null>(null);
  const [editingRequest, setEditingRequest] = useState<CompleteRequest | null>(
    null
  );

  const {
    data: completeRequestsData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useCompleteRequests({
    ...filters,
    page: currentPage,
    limit: pageSize,
  });

  console.log(completeRequestsData);

  const deleteRequestMutation = useDeleteRequestMutation();

  // Función para limpiar todos los estados de modales
  const clearAllModalStates = useCallback(() => {
    setModals({
      detail: false,
      assignDistributor: false,
      assignApplicant: false,
      edit: false,
    });
    setSelectedRequest(null);
    setAssignmentData(null);
    setEditingRequest(null);
    setDeleteRequestId(null);
  }, []);

  // Limpiar estados cuando cambie la página
  useEffect(() => {
    clearAllModalStates();
  }, [currentPage, clearAllModalStates]);

  // Limpieza al desmontar el componente
  useEffect(() => {
    return () => {
      clearAllModalStates();
    };
  }, [clearAllModalStates]);

  const handleDeleteRequest = async () => {
    if (!deleteRequestId) return;

    try {
      await deleteRequestMutation.mutateAsync(deleteRequestId);
      setDeleteRequestId(null);
      refetch();
    } catch (error) {
      console.error("Error deleting request:", error);
    }
  };

  // Handlers para la asignación (extraídos de los props inline)
  // Handlers para la asignación (extraídos de los props inline)
  const handleAssignDistributorSubmit = async (distributorId: string) => {
    try {
      const requestId = assignmentData?.requestId || selectedRequest?.id;

      if (requestId) {
        await assignDistributorToRequest(requestId, distributorId);
        await refetch();
      }
      handleCloseModal("assignDistributor");
    } catch (error) {
      console.error("Error al asignar repartidor:", error);
    }
  };

  const handleAssignApplicantSubmit = async (applicantId: string) => {
    try {
      const requestId = assignmentData?.requestId || selectedRequest?.id;

      if (requestId) {
        await assignApplicantToRequest(requestId, applicantId);
        await refetch();
      }
      handleCloseModal("assignApplicant");
    } catch (error) {
      console.error("Error al asignar solicitante:", error);
    }
  };

  const handleUpdateRequest = async (
    requestId: string,
    data: UpdateRequestPayload
  ) => {
    try {
      if (requestId) {
        await updateRequest(requestId, data);
        await refetch();
      }
    } catch (error) {
      console.error("Error al actualizar la solicitud:", error);
    }
  };

  // Handlers optimizados para modales
  const handleViewDetail = useCallback(
    (request: CompleteRequest) => {
      clearAllModalStates();
      setTimeout(() => {
        setSelectedRequest(request);
        setModals((prev) => ({ ...prev, detail: true }));
      }, 0);
    },
    [clearAllModalStates]
  );

  const handleAssignDistributor = useCallback(
    (request: CompleteRequest) => {
      clearAllModalStates();
      setTimeout(() => {
        setAssignmentData({
          requestId: request.id,
          requestNumber: request.field_application_number || "Sin número",
          currentDistributor: request.distributor?.id,
        });
        setModals((prev) => ({ ...prev, assignDistributor: true }));
      }, 0);
    },
    [clearAllModalStates]
  );

  const handleEditRequest = useCallback(
    (request: CompleteRequest) => {
      clearAllModalStates();
      setTimeout(() => {
        setEditingRequest(request);
        setModals((prev) => ({ ...prev, edit: true }));
      }, 0);
    },
    [clearAllModalStates]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage === currentPage) return;

      clearAllModalStates();
      // Usar setTimeout para asegurar que la limpieza se complete antes del cambio de página
      setTimeout(() => {
        setCurrentPage(newPage);
      }, 0);
    },
    [currentPage, clearAllModalStates]
  );

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      setPageSize(newSize);
      setCurrentPage(1);
      clearAllModalStates();
    },
    [clearAllModalStates]
  );

  // Handlers para cerrar modales
  const handleCloseModal = useCallback((modalName: keyof typeof modals) => {
    setModals((prev) => ({ ...prev, [modalName]: false }));

    // Limpiar datos relacionados después de un pequeño delay
    setTimeout(() => {
      if (modalName === "detail") setSelectedRequest(null);
      if (modalName === "assignDistributor" || modalName === "assignApplicant")
        setAssignmentData(null);
      if (modalName === "edit") setEditingRequest(null);
    }, 300);
  }, []);

  const totalItems = completeRequestsData?.meta?.count || 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Estado de carga
  if (isLoading) {
    return <TableSkeleton />;
  }

  // Estado de error
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error al cargar solicitudes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Error: {error.message}</span>
          </div>
          <Button onClick={() => refetch()} className="mt-4" variant="outline">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Estado vacío cuando no hay resultados
  if (completeRequestsData?.data.length === 0) {
    return (
      <EmptyState
        title="No se encontraron resultados"
        description="No hay solicitudes que coincidan con los filtros aplicados"
        onRefresh={refetch}
        onCreateNew={onCreateNew}
      />
    );
  }

  return (
    <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
      <div className="p-6 border-b bg-white">
        <h3 className="text-lg font-semibold leading-none tracking-tight">
          Solicitudes
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {totalItems} solicitud(es) encontrada(s)
        </p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-100">
            <TableRow>
              <TableHead className="w-[150px] font-semibold text-xs uppercase tracking-wider text-muted-foreground py-4 px-6">
                Número
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground py-4 px-6">
                Cliente
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground py-4 px-6">
                Subservicio
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground py-4 px-6">
                Repartidor
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground py-4 px-6">
                Estado
              </TableHead>
              <TableHead className="text-center font-semibold text-xs uppercase tracking-wider text-muted-foreground py-4 px-6">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {completeRequestsData?.data.map((requestData) => {
              const statusName =
                requestData.applicationStatus?.name || "Sin asignar";

              const getStatusVariant = (status: string) => {
                const lowerStatus = status.toLowerCase();
                if (
                  lowerStatus.includes("rechaz") ||
                  lowerStatus.includes("cancel")
                )
                  return "cancelado";
                if (lowerStatus.includes("nuevo")) return "nuevo";
                if (
                  lowerStatus.includes("proceso") ||
                  lowerStatus.includes("asignado") ||
                  lowerStatus.includes("camino") ||
                  lowerStatus.includes("pendiente")
                )
                  return "en-proceso";
                if (
                  lowerStatus.includes("completado") ||
                  lowerStatus.includes("entregado")
                )
                  return "completado";
                return "nuevo";
              };

              const variant = getStatusVariant(statusName);

              const statusStyles = {
                nuevo:
                  "bg-green-100 text-green-900 hover:bg-green-100/80 border-none",
                "en-proceso":
                  "bg-yellow-100 text-yellow-900 hover:bg-yellow-100/80 border-none",
                completado:
                  "bg-gray-200 text-gray-800 hover:bg-gray-200/80 border-none",
                cancelado:
                  "bg-red-100 text-red-900 hover:bg-red-100/80 border-none",
              };

              return (
                <TableRow
                  key={requestData.id}
                  className="hover:bg-muted/30 transition-colors even:bg-gray-100"
                >
                  <TableCell className="font-medium text-sm py-4 px-6">
                    {requestData.field_application_number}
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">
                        {requestData.applicant?.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <span className="text-muted-foreground text-sm">
                      {requestData.subservice
                        ? requestData.subservice?.name
                        : "Sin asignar"}
                    </span>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <span className="text-muted-foreground text-sm">
                      {requestData.distributor?.name
                        ? requestData.distributor?.name
                        : "Sin asignar"}
                    </span>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <Badge
                      variant="outline"
                      className={`rounded-full shadow-none font-medium ${statusStyles[variant]}`}
                    >
                      {statusName}
                    </Badge>
                  </TableCell>

                  <TableCell className="py-4 px-6">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewDetail(requestData)}
                        className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                        title="Ver detalle"
                        disabled={isFetching}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditRequest(requestData)}
                        className="h-8 w-8 text-muted-foreground hover:text-amber-600 hover:bg-amber-50"
                        title="Editar"
                        disabled={isFetching}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleAssignDistributor(requestData)}
                        className="h-8 w-8 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50"
                        title="Asignar repartidor"
                        disabled={isFetching}
                      >
                        <Truck className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteRequestId(requestData.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                        title="Eliminar"
                        disabled={isFetching}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="p-4 border-t">
        <Paginator
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>

      <RequestsTableDialogs
        modals={modals}
        selectedRequest={selectedRequest}
        editingRequest={editingRequest}
        assignmentData={assignmentData}
        deleteRequestId={deleteRequestId}
        onCloseModal={handleCloseModal}
        onAssignDistributor={handleAssignDistributorSubmit}
        onAssignApplicant={handleAssignApplicantSubmit}
        onConfirmDelete={handleDeleteRequest}
        setDeleteRequestId={setDeleteRequestId}
        onUpdateRequest={handleUpdateRequest}
      />
    </div>
  );
}
