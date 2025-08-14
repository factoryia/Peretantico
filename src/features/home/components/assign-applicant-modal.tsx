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
import { Search, Loader2, MapPin, Phone, Mail, Calendar, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { AssignmentModalData } from "../types/request"
import { fetchApplicants } from "../utils/request"

interface Applicant {
  id: string
  fullName: string
  documentNumber: string
  phoneNumber: string
  email: string
  birthDate: string
  department: string
  municipality: string
  address: string
  documentType: string
  gender: string
  parentStatus: string
}

interface AssignApplicantModalProps {
  isOpen: boolean
  onClose: () => void
  data: AssignmentModalData | null
  onAssign: (applicantId: string) => Promise<void>
}

export function AssignApplicantModal({
  isOpen,
  onClose,
  data,
  onAssign,
}: AssignApplicantModalProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedApplicant, setSelectedApplicant] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [filteredApplicants, setFilteredApplicants] = useState<Applicant[]>([])

  // Cargar clientes desde la API
  useEffect(() => {
    const loadApplicants = async () => {
      try {
        const apiData = await fetchApplicants();
        if (apiData?.data) {
          const apiApplicants: Applicant[] = apiData.data.map((item: any) => ({
            id: item.id,
            fullName: item.attributes.field_full_name,
            documentNumber: item.attributes.field_document_number,
            phoneNumber: item.attributes.field_phone_number,
            email: item.attributes.field_mail,
            birthDate: item.attributes.field_birth_date,
            department: item.attributes.field_department,
            municipality: item.attributes.field_municipality_residence,
            address: item.attributes.field_address,
            documentType: getIncludedEntityName(item.relationships.field_type_document?.data?.id, "taxonomy_term--document_type", apiData.included),
            gender: getIncludedEntityName(item.relationships.field_gender?.data?.id, "taxonomy_term--gender", apiData.included),
            parentStatus: getIncludedEntityName(item.relationships.field_parent_type?.data?.id, "taxonomy_term--parent_type", apiData.included),
          }));
          setApplicants(apiApplicants);
          setFilteredApplicants(apiApplicants);
        } else {
          // Fallback a datos mock si la API falla
          const mockApplicants: Applicant[] = [
            {
              id: "1",
              fullName: "Juan Pérez García",
              documentNumber: "12345678",
              phoneNumber: "3001234567",
              email: "juan.perez@example.com",
              birthDate: "1990-05-15",
              department: "Cundinamarca",
              municipality: "Bogotá",
              address: "Calle 123 #45-67",
              documentType: "Cédula de Ciudadanía",
              gender: "Masculino",
              parentStatus: "Sí",
            },
            {
              id: "2",
              fullName: "María González López",
              documentNumber: "87654321",
              phoneNumber: "3009876543",
              email: "maria.gonzalez@example.com",
              birthDate: "1985-08-22",
              department: "Antioquia",
              municipality: "Medellín",
              address: "Carrera 78 #90-12",
              documentType: "Cédula de Ciudadanía",
              gender: "Femenino",
              parentStatus: "No",
            },
            {
              id: "3",
              fullName: "Carlos Rodríguez Silva",
              documentNumber: "11223344",
              phoneNumber: "3005556666",
              email: "carlos.rodriguez@example.com",
              birthDate: "1992-12-03",
              department: "Valle del Cauca",
              municipality: "Cali",
              address: "Avenida 5 #23-45",
              documentType: "Cédula de Ciudadanía",
              gender: "Masculino",
              parentStatus: "Sí",
            },
          ];
          setApplicants(mockApplicants);
          setFilteredApplicants(mockApplicants);
        }
      } catch (error) {
        console.error("Error loading applicants:", error);
        // Fallback a datos mock
        const mockApplicants: Applicant[] = [
          {
            id: "1",
            fullName: "Juan Pérez García",
            documentNumber: "12345678",
            phoneNumber: "3001234567",
            email: "juan.perez@example.com",
            birthDate: "1990-05-15",
            department: "Cundinamarca",
            municipality: "Bogotá",
            address: "Calle 123 #45-67",
            documentType: "Cédula de Ciudadanía",
            gender: "Masculino",
            parentStatus: "Sí",
          },
          {
            id: "2",
            fullName: "María González López",
            documentNumber: "87654321",
            phoneNumber: "3009876543",
            email: "maria.gonzalez@example.com",
            birthDate: "1985-08-22",
            department: "Antioquia",
            municipality: "Medellín",
            address: "Carrera 78 #90-12",
            documentType: "Cédula de Ciudadanía",
            gender: "Femenino",
            parentStatus: "No",
          },
          {
            id: "3",
            fullName: "Carlos Rodríguez Silva",
            documentNumber: "11223344",
            phoneNumber: "3005556666",
            email: "carlos.rodriguez@example.com",
            birthDate: "1992-12-03",
            department: "Valle del Cauca",
            municipality: "Cali",
            address: "Avenida 5 #23-45",
            documentType: "Cédula de Ciudadanía",
            gender: "Masculino",
            parentStatus: "Sí",
          },
        ];
        setApplicants(mockApplicants);
        setFilteredApplicants(mockApplicants);
      }
    };

    loadApplicants();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = applicants.filter(
        (applicant) =>
          applicant.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          applicant.documentNumber.includes(searchTerm) ||
          applicant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          applicant.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
          applicant.municipality.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredApplicants(filtered)
    } else {
      setFilteredApplicants(applicants)
    }
  }, [searchTerm, applicants])

  const handleAssign = async () => {
    if (!selectedApplicant) return

    setIsLoading(true)
    try {
      await onAssign(selectedApplicant)
      onClose()
    } catch (error) {
      console.error("Error al asignar cliente:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Función helper para obtener nombres de entidades relacionadas
  const getIncludedEntityName = (entityId: string, entityType: string, included: any[]): string => {
    if (!included || !entityId) return "Sin especificar";
    
    const entity = included.find(
      (item) => item.id === entityId && item.type === entityType
    );
    return entity?.attributes?.name || "Sin especificar";
  };

  if (!data) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] p-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold">
            Asignar Cliente
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
              placeholder="Buscar por nombre, documento, email o ubicación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Lista de clientes */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Clientes Disponibles ({filteredApplicants.length})
            </Label>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredApplicants.map((applicant) => (
                <div
                  key={applicant.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedApplicant === applicant.id
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedApplicant(applicant.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{applicant.fullName}</h4>
                        <Badge variant="outline" className="text-xs">
                          {applicant.documentType}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>CC: {applicant.documentNumber}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{applicant.phoneNumber}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>{applicant.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(applicant.birthDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{applicant.department}, {applicant.municipality}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{applicant.address}</span>
                        </div>
                      </div>
                      
                      <div className="mt-2 flex gap-2">
                        <Badge variant="outline" className="text-xs">
                          {applicant.gender}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Padre/Madre: {applicant.parentStatus}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      <input
                        type="radio"
                        name="applicant"
                        value={applicant.id}
                        checked={selectedApplicant === applicant.id}
                        onChange={() => setSelectedApplicant(applicant.id)}
                        className="h-4 w-4 text-primary"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredApplicants.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron clientes que coincidan con la búsqueda
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
            disabled={!selectedApplicant || isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Asignando...
              </>
            ) : (
              "Asignar Cliente"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
