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

  const getPaymentStatusBadgeVariant = (paymentStatusName: string) => {
    switch (paymentStatusName?.toLowerCase()) {
      case "recibido":
        return "default";
      case "pendiente":
        return "outline";
      case "incompleto":
        return "destructive";
      case "n/a":
        return "secondary";
      default:
        return "secondary"; // N/A por defecto
    }
  };

  const getPaymentStatusLabel = (request: Request) => {
    if (request.paymentStatus?.name) {
      return request.paymentStatus.name;
    }
    return "N/A";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitudes Asignadas</DialogTitle>
          <DialogDescription>
            Solicitudes asignadas al distribuidor {distributor?.title}
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Información del Distribuidor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Nombre:</span>
                <p>{distributor?.title}</p>
              </div>
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
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 md:flex-row md:items-end">
                <div className="flex-1">
                  <label htmlFor="filterDate" className="block text-sm font-medium mb-1">
                    Filtrar por Fecha
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="filterDate"
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearFilters}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Limpiar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de solicitudes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Solicitudes Asignadas ({filteredRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <TableSkeleton />
              ) : filteredRequests && filteredRequests.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número de Solicitud</TableHead>
                        <TableHead>Servicio</TableHead>
                        <TableHead>Estado de Pago</TableHead>
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
                              variant={getPaymentStatusBadgeVariant(request.paymentStatus?.name || "")}
                            >
                              {getPaymentStatusLabel(request)}
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
                  <p>No se encontraron solicitudes asignadas</p>
                  {filterDate && (
                    <p className="text-sm mt-2">
                      para la fecha seleccionada
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}