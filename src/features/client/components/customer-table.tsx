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
    <div className="rounded-md border ">
      <Table className="table-fixed w-full">
        <TableHeader>
          <TableRow>
            <TableHead>Nombre completo</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Correo electrónico</TableHead>
            <TableHead className="text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center py-4 text-muted-foreground"
              >
                No hay clientes para mostrar.
              </TableCell>
            </TableRow>
          ) : (
            customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium text-left">
                  {customer.fullName ? customer.fullName : "Sin agregar"}
                </TableCell>
                <TableCell>
                  {customer.phoneNumber ? customer.phoneNumber : "Sin agregar"}
                </TableCell>
                <TableCell>
                  {customer.email ? customer.email : "Sin agregar"}
                </TableCell>
                <TableCell>
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onView(customer)}
                    >
                      Ver detalle
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(customer)}
                    >
                      Editar
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
