"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

import { Switch } from "@/components/ui/switch"
import { Loader2, Plus, Star, Clock, DollarSign, Truck, Settings, Pin, TrendingUp } from "lucide-react"
import { fetchApplicants, fetchDistributors, fetchSubservices } from "../utils/request"
import { useCreateRequestMutation } from "../hooks/use-request-mutations"
import type { CreateRequestPayload } from "../types/request"
import { toast } from "sonner"

interface NewRequestModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface Applicant {
  id: string
  fullName: string
  documentNumber: string
}

interface Distributor {
  id: string
  title: string
  documentNumber: string
}

interface Subservice {
  id: string
  name: string
}

export function NewRequestModal({
  isOpen,
  onClose,
  onSuccess,
}: NewRequestModalProps) {
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [distributors, setDistributors] = useState<Distributor[]>([])
  const [subservices, setSubservices] = useState<Subservice[]>([])
  const [error, setError] = useState<string | null>(null)
  
  // Usar el hook de mutación para crear solicitudes
  const createRequestMutation = useCreateRequestMutation()
  
  const [formData, setFormData] = useState({
    title: "",
    applicationNumber: "",
    applicantId: "",
    distributorId: "",
    subserviceId: "",
    estimatedHours: "",
    logisticsCosts: "",
    serviceValue: "",
    entryDate: new Date().toISOString().split('T')[0],
    promote: false,
    sticky: false,
    applicationScore: "1",
  })

  // Cargar datos para los selects
  useEffect(() => {
    if (isOpen) {
      setError(null);
      loadFormData();
    }
  }, [isOpen]);

  // Cleanup effect para limpiar el estado cuando el modal se cierre
  useEffect(() => {
    if (!isOpen) {
      // Resetear el estado cuando el modal se cierre
      const timer = setTimeout(() => {
        resetForm();
        setError(null);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const loadFormData = async () => {
    try {
      setError(null);
      
      const [applicantsData, distributorsData, subservicesData] = await Promise.all([
        fetchApplicants(),
        fetchDistributors(),
        fetchSubservices(),
      ])

      // Verificar que el componente siga montado antes de actualizar el estado
      if (applicantsData?.data) {
        setApplicants(applicantsData.data.map((item: any) => ({
          id: item.id,
          fullName: item.attributes.field_full_name,
          documentNumber: item.attributes.field_document_number,
        })))
      }

      if (distributorsData?.data) {
        setDistributors(distributorsData.data.map((item: any) => ({
          id: item.id,
          title: item.attributes.title,
          documentNumber: item.attributes.field_document_number,
        })))
      }

      if (subservicesData?.data) {
        setSubservices(subservicesData.data.map((item: any) => ({
          id: item.id,
          name: item.attributes.name,
        })))
      }
    } catch (error) {
      console.error("Error loading form data:", error)
      setError("Error al cargar los datos del formulario");
      toast.error("Error al cargar los datos del formulario")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (createRequestMutation.isPending) return; // Prevenir múltiples submits

    try {
      const payload: CreateRequestPayload = {
        data: {
          type: "node--request",
          attributes: {
            title: formData.title,
            field_application_number: formData.applicationNumber,
            field_application_score: parseInt(formData.applicationScore) || 1,
            field_entry_date: formData.entryDate,
            field_estimated_application_hour: parseInt(formData.estimatedHours) || 0,
            field_logistics_costs: parseFloat(formData.logisticsCosts) || 0,
            field_service_value: parseFloat(formData.serviceValue) || 0,
            status: true,
            promote: formData.promote,
            sticky: formData.sticky,
          },
          relationships: {
            field_applicant: {
              data: { type: "node--profile", id: formData.applicantId }
            },
            field_application_statuses: {
              data: { type: "taxonomy_term--application_statuses", id: "24d38208-a645-4cca-a0c8-a460bce4453a" }
            },
            field_service_status: {
              data: { type: "taxonomy_term--application_statuses", id: "2aa93128-20bb-4262-bf30-f53d7e9af052" }
            },
            ...(formData.distributorId && {
              field_distributor_data: {
                data: { type: "node--distributor", id: formData.distributorId }
              }
            }),
            ...(formData.subserviceId && {
              field_subservice: {
                data: { type: "taxonomy_term--category", id: formData.subserviceId }
              }
            }),
          }
        }
      }

      console.log("Sending payload:", JSON.stringify(payload, null, 2))
      console.log("Application score value:", formData.applicationScore, "Parsed:", parseInt(formData.applicationScore) || 1)

      await createRequestMutation.mutateAsync(payload)
      
      // Solo cerrar si el componente sigue montado
      if (isOpen) {
        onSuccess()
        onClose()
        resetForm()
      }
    } catch (error: any) {
      console.error("Error creating request:", error)
      toast.error(error.message || "Error al crear la solicitud")
    }
  }

  const resetForm = () => {
    setFormData({
      title: "",
      applicationNumber: "",
      applicantId: "",
      distributorId: "",
      subserviceId: "",
      estimatedHours: "",
      logisticsCosts: "",
      serviceValue: "",
      entryDate: new Date().toISOString().split('T')[0],
      promote: false,
      sticky: false,
      applicationScore: "1",
    })
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px] p-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nueva Solicitud
          </DialogTitle>
          <DialogDescription>
            Completa la información para crear una nueva solicitud de servicio
          </DialogDescription>
          {error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
          {/* Campos del formulario */}
          {(() => {
            try {
              return (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        Título *
                      </Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Título de la solicitud"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="applicationNumber" className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-blue-500" />
                        Número de solicitud *
                      </Label>
                      <Input
                        id="applicationNumber"
                        value={formData.applicationNumber}
                        onChange={(e) => setFormData({ ...formData, applicationNumber: e.target.value })}
                        placeholder="APP-001"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="applicantId" className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-green-500" />
                        Cliente *
                      </Label>
                      <select
                        id="applicantId"
                        value={formData.applicantId}
                        onChange={(e) => setFormData({ ...formData, applicantId: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Seleccionar cliente</option>
                        {applicants.map((applicant) => (
                          <option key={applicant.id} value={applicant.id}>
                            {applicant.fullName} - {applicant.documentNumber}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="distributorId" className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-orange-500" />
                        Repartidor
                      </Label>
                      <select
                        id="distributorId"
                        value={formData.distributorId}
                        onChange={(e) => setFormData({ ...formData, distributorId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Seleccionar repartidor (opcional)</option>
                        {distributors.map((distributor) => (
                          <option key={distributor.id} value={distributor.id}>
                            {distributor.title} - {distributor.documentNumber}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="subserviceId" className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-purple-500" />
                        Subservicio
                      </Label>
                      <select
                        id="subserviceId"
                        value={formData.subserviceId}
                        onChange={(e) => setFormData({ ...formData, subserviceId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Seleccionar subservicio (opcional)</option>
                        {subservices.map((subservice) => (
                          <option key={subservice.id} value={subservice.id}>
                            {subservice.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="entryDate" className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-indigo-500" />
                        Fecha de entrada *
                      </Label>
                      <Input
                        id="entryDate"
                        type="date"
                        value={formData.entryDate}
                        onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="applicationScore" className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        Calificación inicial
                      </Label>
                      <Input
                        id="applicationScore"
                        type="number"
                        min="1"
                        max="5"
                        value={formData.applicationScore}
                        onChange={(e) => setFormData({ ...formData, applicationScore: e.target.value })}
                        placeholder="1-5"
                        className={parseInt(formData.applicationScore) < 1 ? "border-red-500" : ""}
                      />
                      <p className="text-xs text-gray-500">Valor mínimo: 1</p>
                      {parseInt(formData.applicationScore) < 1 && (
                        <p className="text-xs text-red-600">La calificación debe ser al menos 1</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="estimatedHours" className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-indigo-500" />
                        Horas estimadas
                      </Label>
                      <Input
                        id="estimatedHours"
                        type="number"
                        value={formData.estimatedHours}
                        onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                        placeholder="2"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="logisticsCosts" className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-orange-500" />
                        Costos de logística
                      </Label>
                      <Input
                        id="logisticsCosts"
                        type="number"
                        value={formData.logisticsCosts}
                        onChange={(e) => setFormData({ ...formData, logisticsCosts: e.target.value })}
                        placeholder="50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="serviceValue" className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        Valor del servicio
                      </Label>
                      <Input
                        id="serviceValue"
                        type="number"
                        value={formData.serviceValue}
                        onChange={(e) => setFormData({ ...formData, serviceValue: e.target.value })}
                        placeholder="150"
                      />
                    </div>
                  </div>

                  {/* Campos de configuración */}
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Configuración de la solicitud</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="promote" className="flex items-center gap-2 text-sm">
                            <TrendingUp className="h-4 w-4 text-blue-500" />
                            Promocionar
                          </Label>
                          <p className="text-xs text-gray-500">Destacar esta solicitud en la lista principal</p>
                        </div>
                        <Switch
                          id="promote"
                          checked={formData.promote}
                          onCheckedChange={(checked) => setFormData({ ...formData, promote: checked })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="sticky" className="flex items-center gap-2 text-sm">
                            <Pin className="h-4 w-4 text-orange-500" />
                            Fijar
                          </Label>
                          <p className="text-xs text-gray-500">Mantener esta solicitud siempre visible</p>
                        </div>
                        <Switch
                          id="sticky"
                          checked={formData.sticky}
                          onCheckedChange={(checked) => setFormData({ ...formData, sticky: checked })}
                        />
                      </div>
                    </div>
                  </div>
                </>
              );
            } catch (renderError) {
              console.error("Error rendering form:", renderError);
              return (
                <div className="p-4 text-center">
                  <p className="text-red-600">Error al renderizar el formulario. Por favor, recarga la página.</p>
                </div>
              );
            }
          })()}
        </form>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createRequestMutation.isPending || !formData.title || !formData.applicationNumber || !formData.applicantId || parseInt(formData.applicationScore) < 1}
            className="min-w-[120px]"
          >
            {createRequestMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              "Crear Solicitud"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
