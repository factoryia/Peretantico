import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import type { SpecialDate } from "../../types";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    viewingDate: SpecialDate | null;
}

export function SpecialDateDetailDialog({ open, onOpenChange, viewingDate }: Props) {
    if (!viewingDate) return null;

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString("es-ES");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Detalle de Fecha Especial
                    </DialogTitle>
                    <DialogDescription>Información completa de la fecha especial seleccionada.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium">Nombre</label>
                        <div className="p-2 bg-muted rounded-md text-sm">{viewingDate.title}</div>
                    </div>
                    <div>
                        <label className="text-sm font-medium">Descripción</label>
                        <div className="p-2 bg-muted rounded-md text-sm">{viewingDate.field_description || "Sin descripción"}</div>
                    </div>
                    <div>
                        <label className="text-sm font-medium">Fecha</label>
                        <div className="p-2 bg-muted rounded-md text-sm">{formatDate(viewingDate.field_date)}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Repetir cada año</label>
                            <div className="p-2 bg-muted rounded-md text-sm">
                                <Badge variant={viewingDate.field_is_annual ? "default" : "outline"}>
                                    {viewingDate.field_is_annual ? "Sí" : "No"}
                                </Badge>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Estado</label>
                            <div className="p-2 bg-muted rounded-md text-sm">
                                <Badge variant={viewingDate.status ? "default" : "secondary"}>
                                    {viewingDate.status ? "Activo" : "Inactivo"}
                                </Badge>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium">Fecha de creación</label>
                        <div className="p-2 bg-muted rounded-md text-sm">
                            {formatDate(viewingDate.created ?? "")}
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cerrar
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
