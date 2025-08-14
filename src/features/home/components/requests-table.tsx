"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Eye, Trash2, AlertCircle, Edit, Star, User, Truck } from "lucide-react"
import { transformRequestForDisplay, assignDistributorToRequest, assignApplicantToRequest } from "../utils/request"
import type { RequestFilters, Request, AssignmentModalData } from "../types/request"
import { useRequestsQuery } from "../hooks/use-request-query"
import { useDeleteRequestMutation } from "../hooks/use-request-mutations"
import { RequestDetailModal } from "./request-detail-modal"
import { AssignDistributorModal } from "./assign-distributor-modal"
import { AssignApplicantModal } from "./assign-applicant-modal"
import { EditRequestModal } from "./edit-request-modal"
import { TableSkeleton } from "./skeletons/table-skeleton"
import { EmptyState } from "./empty-state"

interface RequestsTableProps {
  filters?: RequestFilters
  onRefresh?: () => void
  onCreateNew?: () => void
}

export function RequestsTable({ filters = {}, onCreateNew }: RequestsTableProps) {
  const [deleteRequestId, setDeleteRequestId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  
  // Estados para los modales - inicializados como false
  const [modals, setModals] = useState({
    detail: false,
    assignDistributor: false,
    assignApplicant: false,
    edit: false
  })
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [assignmentData, setAssignmentData] = useState<AssignmentModalData | null>(null)
  const [editingRequest, setEditingRequest] = useState<Request | null>(null)

  const { data, isLoading, error, refetch } = useRequestsQuery({
    ...filters,
    page: currentPage, limit: 10,
  })

  const deleteRequestMutation = useDeleteRequestMutation()

  // Función para limpiar todos los estados de modales
  const clearAllModalStates = useCallback(() => {
    setModals({
      detail: false,
      assignDistributor: false,
      assignApplicant: false,
      edit: false
    })
    setSelectedRequest(null)
    setAssignmentData(null)
    setEditingRequest(null)
    setDeleteRequestId(null)
  }, [])

  // Limpiar estados cuando cambie la página
  useEffect(() => {
    clearAllModalStates()
  }, [currentPage, clearAllModalStates])

  // Limpieza al desmontar el componente
  useEffect(() => {
    return () => {
      clearAllModalStates()
    }
  }, [clearAllModalStates])

  // Transformar solicitudes con manejo de errores mejorado
  const displayRequests = useMemo(() => {
    if (!data?.data || !Array.isArray(data.data)) {
      return []
    }

    return data.data.map((request) => {
      try {
        return transformRequestForDisplay(request, data?.included)
      } catch (error) {
        console.error("Error transforming request:", request.id, error)
        // Retornar un objeto básico si hay error en la transformación
        return {
          id: request.id,
          number: request.attributes?.field_application_number || "Sin número",
          title: request.attributes?.title || "Sin título",
          applicantName: "Error en datos",
          applicantId: request.relationships?.field_applicant?.data?.id || "",
          subserviceName: "Error en datos",
          subserviceId: request.relationships?.field_subservice?.data?.id || "",
          distributorName: "Error en datos",
          distributorId: request.relationships?.field_distributor_data?.data?.id || "",
          statusName: "Error en datos",
          statusId: request.relationships?.field_application_statuses?.data?.id || "",
          serviceStatusName: "Error en datos",
          serviceStatusId: request.relationships?.field_service_status?.data?.id || "",
          score: request.attributes?.field_application_score || 0,
          entryDate: request.attributes?.field_entry_date || "",
          estimatedHours: request.attributes?.field_estimated_application_hour || 0,
          logisticsCosts: request.attributes?.field_logistics_costs || 0,
          serviceValue: request.attributes?.field_service_value || 0,
          status: request.attributes?.status || false,
        }
      }
    })
  }, [data?.data, data?.included])

 

  const handleDeleteRequest = async () => {
    if (!deleteRequestId) return
    
    try {
      await deleteRequestMutation.mutateAsync(deleteRequestId)
      setDeleteRequestId(null)
      await refetch()
    } catch (error) {
      console.error("Error deleting request:", error)
    }
  }

  // Handlers optimizados para modales
  const handleViewDetail = useCallback((request: Request) => {
    clearAllModalStates()
    setTimeout(() => {
      setSelectedRequest(request)
      setModals(prev => ({ ...prev, detail: true }))
    }, 0)
  }, [clearAllModalStates])

  const handleAssignDistributor = useCallback((request: Request) => {
    clearAllModalStates()
    setTimeout(() => {
      setAssignmentData({
        requestId: request.id,
        requestNumber: request.attributes?.field_application_number || "Sin número",
        currentDistributor: request.relationships?.field_distributor_data?.data?.id,
      })
      setModals(prev => ({ ...prev, assignDistributor: true }))
    }, 0)
  }, [clearAllModalStates])

  const handleAssignApplicant = useCallback((request: Request) => {
    clearAllModalStates()
    setTimeout(() => {
      setAssignmentData({
        requestId: request.id,
        requestNumber: request.attributes?.field_application_number || "Sin número",
        currentApplicant: request.relationships?.field_applicant?.data?.id,
      })
      setModals(prev => ({ ...prev, assignApplicant: true }))
    }, 0)
  }, [clearAllModalStates])

  const handleEditRequest = useCallback((request: Request) => {
    clearAllModalStates()
    setTimeout(() => {
      setEditingRequest(request)
      setModals(prev => ({ ...prev, edit: true }))
    }, 0)
  }, [clearAllModalStates])

  const handlePageChange = useCallback((newPage: number) => {
    if (newPage === currentPage) return
    
    clearAllModalStates()
    // Usar setTimeout para asegurar que la limpieza se complete antes del cambio de página
    setTimeout(() => {
      setCurrentPage(newPage)
    }, 0)
  }, [currentPage, clearAllModalStates])

  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1)
    }
  }, [currentPage, handlePageChange])

  const handleNextPage = useCallback(() => {
    const totalPages = Math.ceil((data?.meta?.count || 0) / 10)
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1)
    }
  }, [currentPage, data?.meta?.count, handlePageChange])

  // Handlers para cerrar modales
  const handleCloseModal = useCallback((modalName: keyof typeof modals) => {
    setModals(prev => ({ ...prev, [modalName]: false }))
    
    // Limpiar datos relacionados después de un pequeño delay
    setTimeout(() => {
      if (modalName === 'detail') setSelectedRequest(null)
      if (modalName === 'assignDistributor' || modalName === 'assignApplicant') setAssignmentData(null)
      if (modalName === 'edit') setEditingRequest(null)
    }, 300)
  }, [])

  if (isLoading) {
    return <TableSkeleton />
  }

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
          <Button 
            onClick={() => refetch()} 
            className="mt-4"
            variant="outline"
          >
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Verificar que los datos sean válidos antes de renderizar
  if (!data || !Array.isArray(data.data)) {
    return (
      <EmptyState
        title="Sin datos"
        description="No hay solicitudes disponibles en el sistema"
        showRefreshButton={false}
        onCreateNew={onCreateNew}
      />
    )
  }

  const totalItems = data?.meta?.count || 0
  const totalPages = Math.ceil(totalItems / 10)

  // Validar que displayRequests sea un array válido
  if (!Array.isArray(displayRequests)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error en los datos</CardTitle>
          <CardDescription>
            Ha ocurrido un error al procesar las solicitudes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">
            Error al transformar los datos de las solicitudes
          </div>
        </CardContent>
      </Card>
    )
  }

  // Mostrar estado vacío cuando no hay resultados
  if (displayRequests.length === 0) {
    return (
      <EmptyState
        title="No se encontraron resultados"
        description="No hay solicitudes que coincidan con los filtros aplicados"
        onRefresh={refetch}
        onCreateNew={onCreateNew}
      />
    )
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
              <TableHead>Número</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Subservicio</TableHead>
              <TableHead>Repartidor</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Calificación</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRequests.map((displayRequest) => {
              const request = data.data.find(r => r.id === displayRequest.id)
              if (!request) return null
              
              return (
                <TableRow key={displayRequest.id}>
                  <TableCell className="font-mono text-sm">
                    {displayRequest.number}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {displayRequest.title}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{displayRequest.applicantName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{displayRequest.subserviceName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{displayRequest.distributorName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{displayRequest.statusName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span>{displayRequest.score}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetail(request)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditRequest(request)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAssignApplicant(request)}
                        className="h-8 w-8 p-0"
                      >
                        <User className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAssignDistributor(request)}
                        className="h-8 w-8 p-0"
                      >
                        <Truck className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteRequestId(request.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {/* Paginación simple */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Modales */}
      <RequestDetailModal
        isOpen={modals.detail}
        onClose={() => handleCloseModal('detail')}
        request={selectedRequest}
        included={data?.included}
      />

      <AssignDistributorModal
        isOpen={modals.assignDistributor}
        onClose={() => handleCloseModal('assignDistributor')}
        data={assignmentData}
        onAssign={async (distributorId: string) => {
          try {
            if (assignmentData) {
              await assignDistributorToRequest(assignmentData.requestId, distributorId)
              await refetch()
            }
            handleCloseModal('assignDistributor')
          } catch (error) {
            console.error("Error al asignar repartidor:", error)
          }
        }}
      />

      <AssignApplicantModal
        isOpen={modals.assignApplicant}
        onClose={() => handleCloseModal('assignApplicant')}
        data={assignmentData}
        onAssign={async (applicantId: string) => {
          try {
            if (assignmentData) {
              await assignApplicantToRequest(assignmentData.requestId, applicantId)
              await refetch()
            }
            handleCloseModal('assignApplicant')
          } catch (error) {
            console.error("Error al asignar solicitante:", error)
          }
        }}
      />

      <EditRequestModal
        isOpen={modals.edit}
        onClose={() => handleCloseModal('edit')}
        request={editingRequest}
      />

      {/* Modal de confirmación de eliminación */}
      <AlertDialog open={!!deleteRequestId} onOpenChange={() => setDeleteRequestId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la solicitud.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRequest} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}