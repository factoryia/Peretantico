// components/requests-modal.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/common/skeletons/table-skeleton";
import { Calendar, X } from "lucide-react";
import { fetchAssignedRequests } from "../utils/costs";
import type { Distributor, Request } from "../types";

interface RequestsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  distributor: Distributor | null;
}

export function RequestsModal({
  open,
  onOpenChange,
  distributor,
}: RequestsModalProps) {
  const [distributorId, setDistributorId] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string>("");

  useEffect(() => {
    if (distributor) {
      setDistributorId(distributor.id);
    }
  }, [distributor]);

  // Limpiar filtros cuando se cierre el modal
  useEffect(() => {
    if (!open) {
      setFilterDate("");
    }
  }, [open]);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["assigned-requests", distributorId],
    queryFn: () => fetchAssignedRequests(distributorId!),
    enabled: !!distributorId && open,
  });

  // Filtrar solicitudes por fecha
  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    
    return requests.filter((request: Request) => {
      // Si no hay filtro de fecha, mostrar todas las solicitudes
      if (!filterDate) return true;
      
      // Comparar directamente las fechas en formato YYYY-MM-DD
      // Esto evita problemas de zona horaria
      return request.entryDate === filterDate;
    });
  }, [requests, filterDate]);

  // Función para limpiar filtros
  const clearFilters = () => {
    setFilterDate("");
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "in_progress":
        return "secondary";
      case "pending":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Completada";
      case "in_progress":
        return "En Progreso";
      case "pending":
        return "Pendiente";
      default:
        return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Solicitudes Asignadas - {distributor?.title}
          </DialogTitle>
          <DialogDescription>
            Listado de todas las solicitudes asignadas a este distribuidor.
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Información del Distribuidor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Documento:</span>
                <p>{distributor?.documentNumber}</p>
              </div>
              <div>
                <span className="font-medium">Teléfono:</span>
                <p>{distributor?.phoneNumber}</p>
              </div>
              <div>
                <span className="font-medium">Email:</span>
                <p>{distributor?.email}</p>
              </div>
              <div>
                <span className="font-medium">Vehículo:</span>
                <p>{distributor?.vehicleId}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Solicitudes ({filteredRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filtro de fecha */}
            <div className="mb-6 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">Filtrar por fecha</span>
              </div>
              <div className="flex items-end gap-4">
                <div className="space-y-2 flex-1">
                  <label htmlFor="filterDate" className="text-sm font-medium">
                    Fecha
                  </label>
                  <Input
                    id="filterDate"
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    disabled={!filterDate}
                    className="px-4"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Limpiar
                  </Button>
                </div>
              </div>
            </div>
            {isLoading ? (
              <TableSkeleton />
            ) : filteredRequests && filteredRequests.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número de Solicitud</TableHead>
                      <TableHead>Servicio</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Valor del Servicio</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-mono text-sm">
                          {request.applicationNumber}
                        </TableCell>

                        <TableCell>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {request.subservice.name}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getStatusBadgeVariant(request.status)}
                          >
                            {getStatusLabel(request.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          ${request.serviceValue.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(request.entryDate + 'T00:00:00').toLocaleDateString('es-CO')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {requests && requests.length > 0 
                  ? "No hay solicitudes que coincidan con los filtros de fecha."
                  : "No hay solicitudes asignadas a este distribuidor."
                }
              </div>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
