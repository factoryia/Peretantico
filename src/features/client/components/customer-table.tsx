"use client";

import { Eye, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Customer } from "../types";

interface CustomerTableProps {
  customers: Customer[];
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
}

export function CustomerTable({
  customers,
  onView,
  onEdit,
}: CustomerTableProps) {
  return (
    <div className="border bg-white overflow-hidden">
      <Table className="w-full">
        <TableHeader className="bg-gray-100">
          <TableRow>
            <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground py-4 px-6">
              Nombre completo
            </TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground py-4 px-6">
              Teléfono
            </TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground py-4 px-6">
              Correo electrónico
            </TableHead>
            <TableHead className="text-center font-semibold text-xs uppercase tracking-wider text-muted-foreground py-4 px-6">
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-center py-8 text-muted-foreground"
              >
                No hay clientes para mostrar.
              </TableCell>
            </TableRow>
          ) : (
            customers.map((customer) => (
              <TableRow
                key={customer.id}
                className="hover:bg-muted/30 transition-colors even:bg-gray-100"
              >
                <TableCell className="font-bold text-gray-900 py-4 px-6">
                  {customer.fullName ? customer.fullName : "Sin agregar"}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm py-4 px-6">
                  {customer.phoneNumber ? customer.phoneNumber : "Sin agregar"}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm py-4 px-6">
                  {customer.email ? customer.email : "Sin agregar"}
                </TableCell>
                <TableCell className="py-4 px-6">
                  <div className="flex justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onView(customer)}
                      className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                      title="Ver detalle"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(customer)}
                      className="h-8 w-8 text-muted-foreground hover:text-amber-600 hover:bg-amber-50"
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
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
