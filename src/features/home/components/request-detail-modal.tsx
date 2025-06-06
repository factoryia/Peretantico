import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { RequestDetail } from "../types";

interface RequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: RequestDetail | null;
}

export function RequestDetailModal({
  isOpen,
  onClose,
  request,
}: RequestDetailModalProps) {
  const [estado, setEstado] = useState(request?.gestion.estado || "En proceso");
  const [observaciones, setObservaciones] = useState(
    request?.gestion.observaciones || ""
  );

  if (!request) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              Detalle de Solicitud
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">
                Número de Solicitud
              </Label>
              <p className="text-sm font-medium mt-1">{request.id}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Fecha</Label>
              <p className="text-sm font-medium mt-1">{request.fecha}</p>
            </div>
          </div>

          {/* Datos del Solicitante */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold">Datos del Solicitante</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Nombre
                </Label>
                <p className="text-sm mt-1">{request.solicitante.nombre}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Documento
                </Label>
                <p className="text-sm mt-1">{request.solicitante.documento}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Teléfono
                </Label>
                <p className="text-sm mt-1">{request.solicitante.telefono}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Dirección
                </Label>
                <p className="text-sm mt-1">{request.solicitante.direccion}</p>
              </div>
            </div>
          </div>

          {/* Detalle del Servicio */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold">Detalle del Servicio</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Categoría
                </Label>
                <p className="text-sm mt-1">{request.servicio.categoria}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Servicio
                </Label>
                <p className="text-sm mt-1">{request.servicio.servicio}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">EPS</Label>
                <p className="text-sm mt-1">{request.servicio.eps}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Orden Médica
                </Label>
                <p className="text-sm mt-1">{request.servicio.ordenMedica}</p>
              </div>
            </div>
          </div>

          {/* Gestión */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold">Gestión</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Repartidor
                </Label>
                <p className="text-sm mt-1">{request.gestion.repartidor}</p>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="estado"
                  className="text-sm font-medium text-gray-600"
                >
                  Estado
                </Label>
                <Select value={estado} onValueChange={setEstado}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nuevo">Nuevo</SelectItem>
                    <SelectItem value="En proceso">En proceso</SelectItem>
                    <SelectItem value="Finalizado">Finalizado</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="observaciones"
                className="text-sm font-medium text-gray-600"
              >
                Observaciones
              </Label>
              <Textarea
                id="observaciones"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Agregar observaciones..."
                className="min-h-[100px] resize-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
