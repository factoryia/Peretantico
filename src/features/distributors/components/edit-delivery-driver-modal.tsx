import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DeliveryDriver } from "../types";

interface EditDeliveryDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: DeliveryDriver | null;
  onSave: (driver: DeliveryDriver) => void;
}

export function EditDeliveryDriverModal({
  isOpen,
  onClose,
  driver,
  onSave,
}: EditDeliveryDriverModalProps) {
  console.log("Modal", driver)
  const [formData, setFormData] = useState<DeliveryDriver>({
    id: driver?.id || 0,
    nombre: driver?.nombre || "",
    identificacion: driver?.identificacion || "",
    telefono: driver?.telefono || "",
    email: driver?.email || "",
    zona: driver?.zona || "",
    vehiculo: driver?.vehiculo || "",
    placa: driver?.placa || "",
    estado: driver?.estado || "Activo",
  });

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const handleInputChange = (field: keyof DeliveryDriver, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              Editar Repartidor
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nombre completo */}
            <div className="space-y-2">
              <Label htmlFor="nombre" className="text-sm font-medium">
                Nombre completo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => handleInputChange("nombre", e.target.value)}
                placeholder="Ingrese el nombre completo"
              />
            </div>

            {/* Documento */}
            <div className="space-y-2">
              <Label htmlFor="documento" className="text-sm font-medium">
                Documento <span className="text-red-500">*</span>
              </Label>
              <Input
                id="documento"
                value={formData.identificacion}
                onChange={(e) =>
                  handleInputChange("identificacion", e.target.value)
                }
                placeholder="Número de documento"
              />
            </div>

            {/* Teléfono */}
            <div className="space-y-2">
              <Label htmlFor="telefono" className="text-sm font-medium">
                Teléfono <span className="text-red-500">*</span>
              </Label>
              <Input
                id="telefono"
                value={formData.telefono}
                onChange={(e) => handleInputChange("telefono", e.target.value)}
                placeholder="Número de teléfono"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="Correo electrónico"
              />
            </div>

            {/* Zona */}
            <div className="space-y-2">
              <Label htmlFor="zona" className="text-sm font-medium">
                Zona <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.zona}
                onValueChange={(value) => handleInputChange("zona", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar zona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Norte">Norte</SelectItem>
                  <SelectItem value="Centro">Centro</SelectItem>
                  <SelectItem value="Sur">Sur</SelectItem>
                  <SelectItem value="Oriente">Oriente</SelectItem>
                  <SelectItem value="Occidente">Occidente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Transporte */}
            <div className="space-y-2">
              <Label htmlFor="transporte" className="text-sm font-medium">
                Transporte <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.vehiculo}
                onValueChange={(value) => handleInputChange("vehiculo", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de transporte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Motocicleta">Motocicleta</SelectItem>
                  <SelectItem value="Bicicleta">Bicicleta</SelectItem>
                  <SelectItem value="Automóvil">Automóvil</SelectItem>
                  <SelectItem value="A pie">A pie</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Placa */}
            <div className="space-y-2">
              <Label htmlFor="placa" className="text-sm font-medium">
                Placa
              </Label>
              <Input
                id="placa"
                value={formData.placa}
                onChange={(e) => handleInputChange("placa", e.target.value)}
                placeholder="Número de placa"
              />
            </div>

            {/* Estado */}
            <div className="space-y-2">
              <Label htmlFor="estado" className="text-sm font-medium">
                Estado <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.estado}
                onValueChange={(value) => handleInputChange("estado", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Estado del repartidor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Activo">Activo</SelectItem>
                  <SelectItem value="Inactivo">Inactivo</SelectItem>
                  <SelectItem value="Suspendido">Suspendido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="mr-2 h-4 w-4" />
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
