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
import { useQuery } from "@tanstack/react-query";
import {
  fetchGenderTaxonomy,
} from "../utils/customer";
import { getNameFromId } from "../utils/customer";
import { GENDER_TAXONOMY_KEY } from "../constants";

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
  const { data: genderOptions = [] } = useQuery({
    queryKey: [GENDER_TAXONOMY_KEY],
    queryFn: fetchGenderTaxonomy,
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre completo</TableHead>
            <TableHead>Número de documento</TableHead>
            <TableHead>Sexo</TableHead>
            <TableHead>Departamento</TableHead>
            <TableHead>Municipio</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
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
                <TableCell className="font-medium">
                  {customer.fullName}
                </TableCell>
                <TableCell>{customer.documentNumber}</TableCell>
                <TableCell>
                  {getNameFromId(customer.gender, genderOptions)}
                </TableCell>
                <TableCell>{customer.department}</TableCell>
                <TableCell>{customer.municipality}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
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
