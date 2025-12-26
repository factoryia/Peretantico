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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { RequestsTablePagination } from "./requests-table-pagination";

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
    limit: 10,
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
  const totalPages = Math.ceil(totalItems / 10);

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
    <Card>
      <CardHeader>
        <CardTitle>Solicitudes</CardTitle>
        <CardDescription>
          Gestiona todas las solicitudes del sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table className="rounded-md border">
          <TableHeader>
            <TableRow>
              <TableHead>Número de solicitud</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Subservicio</TableHead>
              <TableHead>Repartidor</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {completeRequestsData?.data.map((requestData) => {
              return (
                <TableRow key={requestData.id}>
                  <TableCell className="max-w-[200px] truncate">
                    {requestData.field_application_number}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {requestData.applicant?.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>
                        {requestData.subservice
                          ? requestData.subservice?.name
                          : "Sin asignar"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>
                        {requestData.distributor?.name
                          ? requestData.distributor?.name
                          : "Sin asignar"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>
                        {requestData.applicationStatus?.name
                          ? requestData.applicationStatus?.name
                          : "Sin asignar"}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetail(requestData)}
                        className="h-8 w-8 p-0"
                        disabled={isFetching}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditRequest(requestData)}
                        className="h-8 w-8 p-0"
                        disabled={isFetching}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAssignDistributor(requestData)}
                        className="h-8 w-8 p-0"
                        disabled={isFetching}
                      >
                        <Truck className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteRequestId(requestData.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
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

        <RequestsTablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          isFetching={isFetching}
        />
      </CardContent>

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
    </Card>
  );
}
