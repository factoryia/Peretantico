// components/distributors-table.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Eye, Calculator } from "lucide-react";
import type { Distributor } from "../types";

interface DistributorsTableProps {
  distributors: Distributor[];
  onViewRequests: (distributor: Distributor) => void;
  onCalculatePayment: (distributor: Distributor) => void;
}

export function DistributorsTable({
  distributors,
  onViewRequests,
  onCalculatePayment,
}: DistributorsTableProps) {
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table className="w-full min-w-[800px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px] min-w-[150px]">Nombre</TableHead>
            <TableHead className="w-[120px] min-w-[100px]">N° de Documento</TableHead>
            <TableHead className="w-[100px] min-w-[80px]">Estado</TableHead>
            <TableHead className="w-[100px] min-w-[80px]">
              Zona de cobertura
            </TableHead>
            <TableHead className="w-[120px] min-w-[100px]">
              Disponibilidad
            </TableHead>
            <TableHead className="w-[250px] min-w-[200px] text-center">
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {distributors.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center py-8 text-muted-foreground"
              >
                No hay distribuidores registrados.
              </TableCell>
            </TableRow>
          ) : (
            distributors.map((distributor) => (
              <TableRow key={distributor.id} className="hover:bg-muted/50">
                <TableCell
                  className="font-medium truncate"
                  title={distributor.title}
                >
                  {distributor.title}
                </TableCell>
                <TableCell
                  className="truncate"
                  title={distributor.documentNumber}
                >
                  {distributor.documentNumber}
                </TableCell>

                <TableCell>
                  <Badge
                    variant={distributor.status ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {distributor.status ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell
                  className="truncate"
                  title={distributor.coverageArea?.name}
                >
                  {distributor.coverageArea?.name}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      distributor.currentAvailability ? "default" : "secondary"
                    }
                    className={`text-xs ${
                      distributor.currentAvailability
                        ? "bg-green-100 text-green-800 hover:bg-green-100"
                        : "bg-red-100 text-red-800 hover:bg-red-100"
                    }`}
                  >
                    {distributor.currentAvailability
                      ? "Disponible"
                      : "No disponible"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewRequests(distributor)}
                      className="flex items-center gap-1 text-xs px-2 py-1 h-7"
                    >
                      <Eye className="h-3 w-3" />
                      <span className="hidden sm:inline">Ver Solicitudes</span>
                      <span className="sm:hidden">Ver</span>
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => onCalculatePayment(distributor)}
                      className="flex items-center gap-1 text-xs px-2 py-1 h-7"
                    >
                      <Calculator className="h-3 w-3 " />
                      <span className="hidden sm:inline">Calcular Pago</span>
                      <span className="sm:hidden">Calcular</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
