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
import type { Customer } from "@/features/client/types";
import { Eye, Pencil, Trash2 } from "lucide-react";

interface DistributorTableProps {
  distributors: Customer[];
  onEdit: (distributor: Customer) => void;
  onViewDetail: (distributor: Customer) => void;
  onDelete: (distributor: Customer) => void;
}

export function DistributorTable({
  distributors,
  onEdit,
  onViewDetail,
  onDelete,
}: DistributorTableProps) {
  return (
    <div className="rounded-md border bg-card shadow-sm">
      {/* Scroll horizontal en móviles */}
      <div className="overflow-x-auto">
        <Table className="w-fullr">
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Nombre completo</TableHead>
              <TableHead className="whitespace-nowrap">Teléfono</TableHead>
              <TableHead className="whitespace-nowrap">Correo electrónico</TableHead>
              <TableHead className="text-center whitespace-nowrap">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {distributors.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-6 text-muted-foreground text-sm"
                >
                  No hay clientes para mostrar.
                </TableCell>
              </TableRow>
            ) : (
              distributors.map((distributor) => (
                <TableRow
                  key={distributor.id}
                  className="hover:bg-muted/50 transition-colors w-full items-stretch "
                >
                  <TableCell className="font-medium">
                    {distributor.fullName || "Sin agregar"}
                  </TableCell>
                  <TableCell className="truncate">
                    {distributor.phoneNumber || "Sin agregar"}
                  </TableCell>
                  <TableCell className="truncate">
                    {distributor.email || "Sin agregar"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-2 flex-wrap">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Ver detalle"
                        onClick={() => onViewDetail(distributor)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Editar"
                        onClick={() => onEdit(distributor)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Eliminar"
                        onClick={() => onDelete(distributor)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
