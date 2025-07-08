import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Eye } from "lucide-react";
import type { SpecialDate } from "../../types";

interface Props {
    specialDates: SpecialDate[];
    onEdit: (date: SpecialDate) => void;
    onView: (date: SpecialDate) => void;
    isLoading?: boolean;
}

export const SpecialDateTable = ({ specialDates, onEdit, onView }: Props) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Repetir</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {specialDates.map(fecha => (
                <TableRow key={fecha.id}>
                    <TableCell className="font-medium">{fecha.title}</TableCell>
                    <TableCell>{new Date(fecha.field_date).toLocaleDateString("es-ES")}</TableCell>
                    <TableCell>
                        <Badge variant={fecha.field_is_annual ? "default" : "outline"}>
                            {fecha.field_is_annual ? "Sí" : "No"}
                        </Badge>
                    </TableCell>
                    <TableCell>
                        <Badge variant={fecha.status ? "default" : "secondary"}>
                            {fecha.status ? "Activo" : "Inactivo"}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                            <Button variant="outline" size="sm" onClick={() => onView(fecha)}>
                                <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => onEdit(fecha)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                        </div>
                    </TableCell>
                </TableRow>
            ))}
        </TableBody>
    </Table>
);
