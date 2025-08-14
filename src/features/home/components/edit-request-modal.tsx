import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Loader, X, Star, Clock, DollarSign, Truck, Settings, Pin, TrendingUp, Edit, User, Package } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";


import { updateRequest, fetchApplicants} from "@/features/home/utils/request";
import { useSubservicesQuery, useDistributorsQuery } from "@/features/home/hooks/use-request-query";
import type { Request } from "@/features/home/types/request";

interface EditRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: Request | null;
}

interface Applicant {
  id: string;
  fullName: string;
  documentNumber: string;
}

interface Distributor {
  id: string;
  title: string;
  documentNumber: string;
}

interface Subservice {
  id: string;
  name: string;
}

interface EditRequestFormData {
  title: string;
  applicationNumber: string;
  applicationScore: number;
  entryDate: string;
  estimatedHours: number;
  logisticsCosts: number;
  serviceValue: number;
  applicantId: string;
  distributorId: string;
  subserviceId: string;
  status: boolean;
  promote: boolean;
  sticky: boolean;
}

export function EditRequestModal({ isOpen, onClose, request }: EditRequestModalProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicants, setApplicants] = useState<Applicant[]>([]);

  // Fetch data for form options
  const { data: distributorsData } = useDistributorsQuery();
  const { data: subservicesData } = useSubservicesQuery();

  // Transform data to match our interface with safety checks
  const distributors: Distributor[] = Array.isArray(distributorsData?.data) ? distributorsData.data.map((item: any) => ({
    id: item.id,
    title: item.attributes?.title || "",
    documentNumber: item.attributes?.field_document_number || "",
  })) : [];

  const subservices: Subservice[] = Array.isArray(subservicesData?.data) ? subservicesData.data.map((item: any) => ({
    id: item.id,
    name: item.attributes?.name || "",
  })) : [];

  // Load applicants when modal opens
  useEffect(() => {
    if (isOpen) {
      loadApplicants();
    }
  }, [isOpen]);

  // Cleanup effect
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setIsSubmitting(false);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const loadApplicants = async () => {
    try {
      const response = await fetchApplicants();
      if (response?.data) {
        const applicantsData = response.data.map((item: any) => ({
          id: item.id,
          fullName: item.attributes?.field_full_name || "",
          documentNumber: item.attributes?.field_document_number || "",
        }));
        setApplicants(applicantsData);
      }
    } catch (error) {
      console.error("Error loading applicants:", error);
    }
  };

  const form = useForm<EditRequestFormData>({
    defaultValues: {
      title: "",
      applicationNumber: "",
      applicationScore: 1,
      entryDate: "",
      estimatedHours: 0,
      logisticsCosts: 0,
      serviceValue: 0,
      applicantId: "",
      distributorId: "",
      subserviceId: "",
      status: true,
      promote: false,
      sticky: false,
    },
  });

  useEffect(() => {
    if (request && isOpen) {
      form.reset({
        title: request.attributes?.title || "",
        applicationNumber: request.attributes?.field_application_number || "",
        applicationScore: request.attributes?.field_application_score || 1,
        entryDate: request.attributes?.field_entry_date || "",
        estimatedHours: request.attributes?.field_estimated_application_hour || 0,
        logisticsCosts: request.attributes?.field_logistics_costs || 0,
        serviceValue: request.attributes?.field_service_value || 0,
        applicantId: request.relationships?.field_applicant?.data?.id || "",
        distributorId: request.relationships?.field_distributor_data?.data?.id || "",
        subserviceId: request.relationships?.field_subservice?.data?.id || "",
        status: request.attributes?.status ?? true,
        promote: request.attributes?.promote ?? false,
        sticky: request.attributes?.sticky ?? false,
      });
    }
  }, [request, isOpen, form]);

  const handleSubmit = async (data: EditRequestFormData) => {
    if (!request || isSubmitting) return;

    setIsSubmitting(true);
    try {


              const requestData = {
          data: {
            type: "node--request",
            id: request.id,
            attributes: {
              title: data.title,
              field_application_number: data.applicationNumber,
              field_application_score: data.applicationScore,
              field_entry_date: data.entryDate,
              field_estimated_application_hour: data.estimatedHours,
              field_logistics_costs: data.logisticsCosts,
              field_service_value: data.serviceValue,
              status: data.status,
              promote: data.promote,
              sticky: data.sticky,
            },
            relationships: {
              field_applicant: data.applicantId ? {
                data: { type: "node--profile", id: data.applicantId }
              } : undefined,
              field_distributor_data: data.distributorId && data.distributorId !== "none" ? {
                data: { type: "node--distributor", id: data.distributorId }
              } : undefined,
              field_subservice: data.subserviceId ? {
                data: { type: "taxonomy_term--category", id: data.subserviceId }
              } : undefined,
            },
          },
        };

        // Remove undefined relationships
        Object.keys(requestData.data.relationships).forEach(key => {
          if (requestData.data.relationships[key as keyof typeof requestData.data.relationships] === undefined) {
            delete requestData.data.relationships[key as keyof typeof requestData.data.relationships];
          }
        });

        await updateRequest(request.id, requestData as any);
      
      toast.success("Solicitud actualizada correctamente");
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      
      // Solo cerrar si el modal sigue abierto
      if (isOpen) {
        onClose();
      }
    } catch (error) {
      console.error("Error updating request:", error);
      toast.error("Error al actualizar la solicitud");
    } finally {
      // Solo actualizar el estado si el modal sigue abierto
      if (isOpen) {
        setIsSubmitting(false);
      }
    }
  };

  if (!request) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] p-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Edit className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  Editar Solicitud
                </DialogTitle>
                <DialogDescription>
                  Modifica la información de la solicitud seleccionada
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-gray-100">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="px-6 py-4 space-y-6">
          {/* Información Principal */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-600 border-b-2 border-blue-200 pb-2">
              <Package className="h-5 w-5" />
              Información Principal
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  Título *
                </Label>
                <Input
                  id="title"
                  {...form.register("title", { required: "El título es obligatorio" })}
                  placeholder="Título de la solicitud"
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-red-600">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="applicationNumber" className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-blue-500" />
                  Número de solicitud *
                </Label>
                <Input
                  id="applicationNumber"
                  {...form.register("applicationNumber", { required: "El número es obligatorio" })}
                  placeholder="APP-001"
                />
                {form.formState.errors.applicationNumber && (
                  <p className="text-sm text-red-600">{form.formState.errors.applicationNumber.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entryDate" className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-indigo-500" />
                  Fecha de entrada *
                </Label>
                <Input
                  id="entryDate"
                  type="date"
                  {...form.register("entryDate", { required: "La fecha es obligatoria" })}
                />
                {form.formState.errors.entryDate && (
                  <p className="text-sm text-red-600">{form.formState.errors.entryDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="applicationScore" className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  Calificación
                </Label>
                <Input
                  id="applicationScore"
                  type="number"
                  min="1"
                  max="5"
                  {...form.register("applicationScore", { 
                    min: { value: 1, message: "La calificación debe ser entre 1 y 5" },
                    max: { value: 5, message: "La calificación debe ser entre 1 y 5" }
                  })}
                  placeholder="1-5"
                />
                {form.formState.errors.applicationScore && (
                  <p className="text-sm text-red-600">{form.formState.errors.applicationScore.message}</p>
                )}
                <p className="text-xs text-gray-500">Valor mínimo: 1</p>
              </div>
            </div>
          </div>

          {/* Asignaciones */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-green-600 border-b-2 border-green-200 pb-2">
              <User className="h-5 w-5" />
              Asignaciones
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="applicantId" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-green-500" />
                  Cliente *
                </Label>
                <select
                  {...form.register("applicantId")}
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
                  {...form.register("distributorId")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sin asignar</option>
                  {distributors.map((distributor) => (
                    <option key={distributor.id} value={distributor.id}>
                      {distributor.title} - {distributor.documentNumber}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subserviceId" className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-purple-500" />
                Subservicio
              </Label>
                              <select
                  {...form.register("subserviceId")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sin especificar</option>
                  {subservices.map((subservice) => (
                    <option key={subservice.id} value={subservice.id}>
                      {subservice.name}
                    </option>
                  ))}
                </select>
            </div>
          </div>

          {/* Valores y Costos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-purple-600 border-b-2 border-purple-200 pb-2">
              <DollarSign className="h-5 w-5" />
              Valores y Costos
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimatedHours" className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-indigo-500" />
                  Horas estimadas
                </Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  min="0"
                  {...form.register("estimatedHours", { min: { value: 0, message: "Las horas deben ser positivas" } })}
                  placeholder="2"
                />
                {form.formState.errors.estimatedHours && (
                  <p className="text-sm text-red-600">{form.formState.errors.estimatedHours.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="logisticsCosts" className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-orange-500" />
                  Costos de logística
                </Label>
                <Input
                  id="logisticsCosts"
                  type="number"
                  min="0"
                  step="0.01"
                  {...form.register("logisticsCosts", { min: { value: 0, message: "Los costos deben ser positivos" } })}
                  placeholder="50"
                />
                {form.formState.errors.logisticsCosts && (
                  <p className="text-sm text-red-600">{form.formState.errors.logisticsCosts.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceValue" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  Valor del servicio
                </Label>
                <Input
                  id="serviceValue"
                  type="number"
                  min="0"
                  step="0.01"
                  {...form.register("serviceValue", { min: { value: 0, message: "El valor debe ser positivo" } })}
                  placeholder="150"
                />
                {form.formState.errors.serviceValue && (
                  <p className="text-sm text-red-600">{form.formState.errors.serviceValue.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Configuración */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-600 border-b-2 border-gray-200 pb-2">
              <Settings className="h-5 w-5" />
              Configuración
            </h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="status" className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    Estado activo
                  </Label>
                  <p className="text-xs text-gray-500">Activar o desactivar la solicitud</p>
                </div>
                <Switch
                  id="status"
                  checked={form.watch("status")}
                  onCheckedChange={(checked) => form.setValue("status", checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="promote" className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    Promocionar
                  </Label>
                  <p className="text-xs text-gray-500">Destacar en la lista principal</p>
                </div>
                <Switch
                  id="promote"
                  checked={form.watch("promote")}
                  onCheckedChange={(checked) => form.setValue("promote", checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sticky" className="flex items-center gap-2 text-sm">
                    <Pin className="h-4 w-4 text-orange-500" />
                    Fijar
                  </Label>
                  <p className="text-xs text-gray-500">Mantener siempre visible</p>
                </div>
                <Switch
                  id="sticky"
                  checked={form.watch("sticky")}
                  onCheckedChange={(checked) => form.setValue("sticky", checked)}
                />
              </div>
            </div>
          </div>
        </form>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={form.handleSubmit(handleSubmit)}
            disabled={isSubmitting || !form.formState.isValid}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Actualizando...
              </>
            ) : (
              "Actualizar Solicitud"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
