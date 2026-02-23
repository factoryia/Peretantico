"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Search, Loader2, UserCheck, MapPin, Phone, Mail } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { AssignmentModalData } from "../types/request"
import { fetchDistributors } from "../utils/request"

interface Distributor {
  id: string
  title: string
  documentNumber: string
  phoneNumber: string
  email: string
  currentAvailability: boolean
  coverageArea: string
  transportationType: string
}

interface AssignDistributorModalProps {
  isOpen: boolean
  onClose: () => void
  data: AssignmentModalData | null
  onAssign: (distributorId: string) => Promise<void>
}

export function AssignDistributorModal({
  isOpen,
  onClose,
  data,
  onAssign,
}: AssignDistributorModalProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDistributor, setSelectedDistributor] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [distributors, setDistributors] = useState<Distributor[]>([])
  const [filteredDistributors, setFilteredDistributors] = useState<Distributor[]>([])

  // Cargar repartidores desde la API
  useEffect(() => {
    const loadDistributors = async () => {
      try {
        const apiData = await fetchDistributors();
        if (Array.isArray(apiData)) {
          const apiDistributors: Distributor[] = apiData.map((item: any) => ({
            id: item.id,
            title: item.title,
            documentNumber: item.documentNumber,
            phoneNumber: item.phoneNumber,
            email: item.email,
            currentAvailability: item.currentAvailability,
            coverageArea: item.coverageArea?.name || "",
            transportationType: item.transportationType?.name || "",
          }));
          setDistributors(apiDistributors);
          setFilteredDistributors(apiDistributors);
        } else {
          // Fallback a datos mock si la API falla
          const mockDistributors: Distributor[] = [
            {
              id: "1",
              title: "Carlos Rodríguez López",
              documentNumber: "87654321",
              phoneNumber: "3009876543",
              email: "carlos.rodriguez@example.com",
              currentAvailability: true,
              coverageArea: "Zona Norte",
              transportationType: "Moto",
            },
            {
              id: "2",
              title: "Ana María González",
              documentNumber: "12345678",
              phoneNumber: "3001234567",
              email: "ana.gonzalez@example.com",
              currentAvailability: true,
              coverageArea: "Zona Sur",
              transportationType: "Carro",
            },
            {
              id: "3",
              title: "Luis Fernando Pérez",
              documentNumber: "98765432",
              phoneNumber: "3005556666",
              email: "luis.perez@example.com",
              currentAvailability: false,
              coverageArea: "Zona Centro",
              transportationType: "Moto",
            },
          ];
          setDistributors(mockDistributors);
          setFilteredDistributors(mockDistributors);
        }
      } catch (error) {
        console.error("Error loading distributors:", error);
        // Fallback a datos mock
        const mockDistributors: Distributor[] = [
          {
            id: "1",
            title: "Carlos Rodríguez López",
            documentNumber: "87654321",
            phoneNumber: "3009876543",
            email: "carlos.rodriguez@example.com",
            currentAvailability: true,
            coverageArea: "Zona Norte",
            transportationType: "Moto",
          },
          {
            id: "2",
            title: "Ana María González",
            documentNumber: "12345678",
            phoneNumber: "3001234567",
            email: "ana.gonzalez@example.com",
            currentAvailability: true,
            coverageArea: "Zona Sur",
            transportationType: "Carro",
          },
          {
            id: "3",
            title: "Luis Fernando Pérez",
            documentNumber: "98765432",
            phoneNumber: "3005556666",
            email: "luis.perez@example.com",
            currentAvailability: false,
            coverageArea: "Zona Centro",
            transportationType: "Moto",
          },
        ];
        setDistributors(mockDistributors);
        setFilteredDistributors(mockDistributors);
      }
    };

    loadDistributors();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = distributors.filter(
        (distributor) =>
          distributor.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          distributor.documentNumber.includes(searchTerm) ||
          distributor.coverageArea.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredDistributors(filtered)
    } else {
      setFilteredDistributors(distributors)
    }
  }, [searchTerm, distributors])

  const handleAssign = async () => {
    if (!selectedDistributor) return

    setIsLoading(true)
    try {
      await onAssign(selectedDistributor)
      onClose()
    } catch (error) {
      console.error("Error al asignar repartidor:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getAvailabilityBadge = (available: boolean) => {
    return available ? (
      <Badge className="bg-green-100 text-green-800">Disponible</Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">No disponible</Badge>
    )
  }

  if (!data) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] p-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold">
            Asignar Repartidor
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Solicitud: {data.requestNumber}
          </p>
        </DialogHeader>

        <div className="px-6 py-4 space-y-6">
          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nombre, documento o zona..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Lista de repartidores */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Repartidores Disponibles ({filteredDistributors.length})
            </Label>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredDistributors.map((distributor) => (
                <div
                  key={distributor.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedDistributor === distributor.id
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedDistributor(distributor.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{distributor.title}</h4>
                        {getAvailabilityBadge(distributor.currentAvailability)}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4" />
                          <span>CC: {distributor.documentNumber}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{distributor.phoneNumber}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>{distributor.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{distributor.coverageArea}</span>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">
                          {distributor.transportationType}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      <input
                        type="radio"
                        name="distributor"
                        value={distributor.id}
                        checked={selectedDistributor === distributor.id}
                        onChange={() => setSelectedDistributor(distributor.id)}
                        className="h-4 w-4 text-primary"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredDistributors.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron repartidores que coincidan con la búsqueda
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedDistributor || isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Asignando...
              </>
            ) : (
              "Asignar Repartidor"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
