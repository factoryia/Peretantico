import {
  User,
  Phone,
  Mail,
  MapPin,
  Truck,
  Edit,
  Plus,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { initialRepartidores } from "@/constants";
import { useState } from "react";
import type { DeliveryDriver } from "../types";
import { EditDeliveryDriverModal } from "../components/edit-delivery-driver-modal";

export function Distributors() {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<DeliveryDriver | null>(
    null
  );

  const handleEditDriver = (driver: DeliveryDriver) => {
    console.log(driver)
    setSelectedDriver(driver);
    setIsEditModalOpen(true);
  };

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 p-6 bg-gray-50 rounded-md border">
        {/* Search and Add Button */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar repartidores..."
              className="pl-10 bg-white"
            />
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> Nuevo Repartidor
          </Button>
        </div>

        {/* Delivery Drivers Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {initialRepartidores.map((repartidor) => (
            <Card key={repartidor.id} className="overflow-hidden py-0">
              <CardContent className="p-0">
                <div className="p-6 space-y-4">
                  {/* Header with avatar and status */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-600 rounded-full">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium">{repartidor.nombre}</h3>
                        <p className="text-sm text-gray-500">
                          {repartidor.identificacion}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`
                        ${
                          repartidor.estado === "Disponible"
                            ? "bg-green-100 text-green-800 border-green-200"
                            : "bg-red-100 text-red-800 border-red-200"
                        }
                      `}
                    >
                      {repartidor.estado}
                    </Badge>
                  </div>

                  {/* Contact and details */}
                  <div className="space-y-2 py-3">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span className="text-sm">{repartidor.telefono}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="h-4 w-4" />
                      <span className="text-sm">{repartidor.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">{repartidor.zona}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Truck className="h-4 w-4" />
                      <span className="text-sm">{repartidor.vehiculo}</span>
                    </div>
                  </div>
                </div>

                {/* Footer with status and edit button */}
                <div className="flex items-center justify-between border-t p-4 bg-gray-50">
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700 border-green-100"
                  >
                    Activo
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-700"
                    onClick={() => handleEditDriver(repartidor)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <EditDeliveryDriverModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        driver={selectedDriver}
        onSave={() => {}}
      />
    </>
  );
}
