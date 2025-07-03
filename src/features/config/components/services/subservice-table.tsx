import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import type { Subservice } from "../../types";

interface Props {
  subservices: Subservice[];
  onEdit: (sub: Subservice) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

export function SubserviceTable({ subservices, onEdit, onDelete, isLoading }: Props) {
  if (isLoading) return <div className="py-12 text-center">Cargando subservicios...</div>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Servicio</TableHead>
          <TableHead>Código</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead>Valor Prioridad</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {subservices.map((sub) => (
          <TableRow key={sub.id}>
            <TableCell>{sub.nombre}</TableCell>
            <TableCell>{sub.servicioNombre}</TableCell>
            <TableCell>{sub.codigo}</TableCell>
            <TableCell>${Number(sub.valor).toLocaleString()}</TableCell>
            <TableCell>${Number(sub.valorPrioridad).toLocaleString()}</TableCell>
            <TableCell>
              <Badge variant={sub.estado === "activo" ? "default" : "secondary"}>
                {sub.estado === "activo" ? "Activo" : "Inactivo"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end space-x-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(sub)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => onDelete(sub.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
