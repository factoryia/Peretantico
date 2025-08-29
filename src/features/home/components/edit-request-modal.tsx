import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Loader, Edit, User, Package, CreditCard, MessageSquare } from "lucide-react";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { updateRequest, fetchApplicants} from "@/features/home/utils/request";
import { useSubservicesQuery, useDistributorsQuery, useCategoriesQuery, useServicesByCategoryQuery } from "@/features/home/hooks/use-request-query";
import type { Request, EditRequestFormData, Category, Service, Subservice, Applicant, Distributor } from "@/features/home/types/request";

interface EditRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: Request | null;
}



export function EditRequestModal({ isOpen, onClose, request }: EditRequestModalProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicants, setApplicants] = useState<Applicant[]>([]);

  // Fetch data for form options
  const { data: distributorsData } = useDistributorsQuery();
  const { data: categoriesData } = useCategoriesQuery();
  
  // Get services based on selected category
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const { data: servicesData } = useServicesByCategoryQuery(selectedCategoryId);
  
  // Get subservices based on selected service
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const { data: filteredSubservicesData } = useSubservicesQuery();
  
  // Handle category change
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedServiceId("");
    form.setValue("serviceId", "");
    form.setValue("subserviceId", "");
  };
  
  // Handle service change
  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    form.setValue("subserviceId", "");
  };

  // Transform data to match our interface with safety checks
  const distributors: Distributor[] = Array.isArray(distributorsData?.data) ? distributorsData.data.map((item: any) => ({
    id: item.id,
    title: item.attributes?.title || "",
    documentNumber: item.attributes?.field_document_number || "",
    documentType: item.attributes?.field_document_type || "",
    phone: item.attributes?.field_phone || "",
    email: item.attributes?.field_email || "",
    status: item.attributes?.field_current_availability ? "Disponible" : "No disponible",
  })) : [];

  const categories: Category[] = categoriesData || [];
  const services: Service[] = servicesData || [];
  
  // Filter subservices based on selected service
  const subservices: Subservice[] = Array.isArray(filteredSubservicesData?.data) 
    ? filteredSubservicesData.data
        .filter((item: any) => {
          if (!selectedServiceId) return true;
          return item.relationships?.parent?.data?.some((parent: any) => parent.id === selectedServiceId);
        })
        .map((item: any) => ({
          id: item.id,
          name: item.attributes?.name || "",
          serviceId: item.relationships?.parent?.data?.[0]?.id || "",
        }))
    : [];

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
      // Campos del solicitante
      applicantId: "",
      
      // Campos de la solicitud
      title: "",
      applicationNumber: "",
      applicationScore: 4, // Por defecto 4 según criterios
      entryDate: "",
      categoryId: "",
      serviceId: "",
      subserviceId: "",
      serviceCode: "",
      serviceValue: 0,
      priorityValue: 0,
      paymentStatus: "",
      usedChannel: "",
      estimatedHours: 0,
      priorityEstimatedHours: 0,
      logisticsCosts: 0,
      isRecurring: false,
      
      // Campos del repartidor
      distributorId: "",
      
      // Gestión de solicitud
      serviceStatus: "",
      requestStatus: "",
      observations: "",
      
      // Configuración
      status: true,
      promote: false,
      sticky: false,
    },
  });

  useEffect(() => {
    if (request && isOpen) {
      const subserviceId = request.relationships?.field_subservice?.data?.id || "";
      
      form.reset({
        // Campos del solicitante
        applicantId: request.relationships?.field_applicant?.data?.id || "",
        
        // Campos de la solicitud
        title: request.attributes?.title || "",
        applicationNumber: request.attributes?.field_application_number || "",
        applicationScore: request.attributes?.field_application_score || 4,
        entryDate: request.attributes?.field_entry_date || "",
        categoryId: "", // Se determinará basado en el subservicio
        serviceId: "", // Se determinará basado en el subservicio
        subserviceId: subserviceId,
        serviceCode: "", // TODO: Implementar cuando esté disponible en la API
        serviceValue: request.attributes?.field_service_value || 0,
        priorityValue: 0, // TODO: Implementar cuando esté disponible en la API
        paymentStatus: "", // TODO: Implementar cuando esté disponible en la API
        usedChannel: "", // TODO: Implementar cuando esté disponible en la API
        estimatedHours: request.attributes?.field_estimated_application_hour || 0,
        priorityEstimatedHours: 0, // TODO: Implementar cuando esté disponible en la API
        logisticsCosts: request.attributes?.field_logistics_costs || 0,
        isRecurring: false, // TODO: Implementar cuando esté disponible en la API
        
        // Campos del repartidor
        distributorId: request.relationships?.field_distributor_data?.data?.id || "",
        
        // Gestión de solicitud
        serviceStatus: "", // TODO: Implementar cuando esté disponible en la API
        requestStatus: "", // TODO: Implementar cuando esté disponible en la API
        observations: "", // TODO: Implementar cuando esté disponible en la API
        
        // Configuración
        status: request.attributes?.status ?? true,
        promote: request.attributes?.promote ?? false,
        sticky: request.attributes?.sticky ?? false,
      });
      
      // Si hay subservicio, determinar categoría y servicio
      if (subserviceId) {
        // TODO: Implementar lógica para determinar categoría y servicio basado en subservicio
      }
    }
    }, [request, isOpen, form]);
  
  // Sync form values when selections change
  useEffect(() => {
    if (selectedCategoryId) {
      form.setValue("categoryId", selectedCategoryId);
    }
  }, [selectedCategoryId, form]);
  
  useEffect(() => {
    if (selectedServiceId) {
      form.setValue("serviceId", selectedServiceId);
    }
  }, [selectedServiceId, form]);
  
  const handleSubmit = async (data: EditRequestFormData) => {
    if (!request || isSubmitting) return;

    // Confirmar cambios antes de guardar
    if (!confirm("¿Confirma que desea guardar los cambios?")) {
      return;
    }

    setIsSubmitting(true);
    try {
      console.log("Submitting form data:", data);
      
      // Payload simplificado para evitar errores 500
      const requestData: any = {
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
        },
      };

      // Solo agregar relaciones si tienen valores válidos
      const relationships: any = {};
      
      if (data.applicantId) {
        relationships.field_applicant = {
          data: { type: "node--profile", id: data.applicantId }
        };
      }
      
      if (data.distributorId && data.distributorId !== "none") {
        relationships.field_distributor_data = {
          data: { type: "node--distributor", id: data.distributorId }
        };
      }
      
      if (data.subserviceId) {
        relationships.field_subservice = {
          data: { type: "taxonomy_term--category", id: data.subserviceId }
        };
      }

      // Solo agregar relationships si hay alguna
      if (Object.keys(relationships).length > 0) {
        requestData.data.relationships = relationships;
      }

      console.log("Sending simplified update payload:", JSON.stringify(requestData, null, 2));

      await updateRequest(request.id, requestData);
      
      toast.success("Solicitud actualizada correctamente");
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      
      // Solo cerrar si el componente sigue montado
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
              <div className="p-2 bg-gray-100 rounded-lg">
                <Edit className="h-5 w-5 text-gray-600" />
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
          
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="px-6 py-4 space-y-6">
            {/* Información Principal */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                <Package className="h-5 w-5" />
                Información Principal
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Título de la solicitud"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="applicationNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de solicitud *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="APP-001"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="entryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de entrada *</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="applicationScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calificación</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="5"
                          placeholder="1-5"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Asignaciones */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                <User className="h-5 w-5" />
                Asignaciones
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría *</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value);
                        handleCategoryChange(value);
                      }} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="max-w-[200px]">
                            <SelectValue placeholder="Seleccionar categoría" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-w-[300px]">
                          {categories.map((category) => (
                            <SelectItem key={category.uuid} value={category.uuid} className="truncate">
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="serviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Servicio *</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value);
                        handleServiceChange(value);
                      }} defaultValue={field.value} disabled={!selectedCategoryId}>
                        <FormControl>
                          <SelectTrigger className="max-w-[200px]">
                            <SelectValue placeholder={selectedCategoryId ? "Seleccionar servicio" : "Seleccione categoría primero"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-w-[300px]">
                          {services.map((service) => (
                            <SelectItem key={service.id} value={service.id} className="truncate">
                              {service.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subserviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subservicio *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedServiceId}>
                        <FormControl>
                          <SelectTrigger className="max-w-[200px]">
                            <SelectValue placeholder={selectedServiceId ? "Seleccionar subservicio" : "Seleccione servicio primero"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-w-[300px]">
                          {subservices.map((subservice) => (
                            <SelectItem key={subservice.id} value={subservice.id} className="truncate">
                              {subservice.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="applicantId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {applicants.map((applicant) => (
                            <SelectItem key={applicant.id} value={applicant.id}>
                              {applicant.fullName} - {applicant.documentNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="distributorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repartidor</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sin asignar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {distributors.map((distributor) => (
                            <SelectItem key={distributor.id} value={distributor.id}>
                              {distributor.title} - {distributor.documentNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Valores y Costos */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                <CreditCard className="h-5 w-5" />
                Valores y Costos
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="estimatedHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horas estimadas *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="2"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priorityEstimatedHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horas estimadas priorizadas *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="logisticsCosts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Costos de logística</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="50"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="serviceValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor del servicio</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="150"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priorityValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor priorizado</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="200"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isRecurring"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Recurrente</FormLabel>
                        <p className="text-xs text-gray-500">¿Es una solicitud recurrente?</p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Gestión de Solicitud */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                <MessageSquare className="h-5 w-5" />
                Gestión de Solicitud
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="serviceStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado del servicio *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar estado del servicio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pendiente">Pendiente</SelectItem>
                          <SelectItem value="en_proceso">En Proceso</SelectItem>
                          <SelectItem value="completado">Completado</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requestStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado de la solicitud *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar estado de la solicitud" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="registrada">Registrada</SelectItem>
                          <SelectItem value="asignada">Asignada</SelectItem>
                          <SelectItem value="en_proceso">En Proceso</SelectItem>
                          <SelectItem value="completada">Completada</SelectItem>
                          <SelectItem value="cancelada">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="observations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observaciones *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ingrese las observaciones de la solicitud..."
                        className="resize-none"
                        maxLength={100}
                        {...field}
                      />
                    </FormControl>
                    <div className="text-xs text-gray-500 text-right">
                      {field.value?.length || 0}/100 caracteres
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Configuración */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                Configuración
              </h3>
              <div className="grid grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Estado activo</FormLabel>
                        <p className="text-xs text-gray-500">Activar o desactivar la solicitud</p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="promote"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Promocionar</FormLabel>
                        <p className="text-xs text-gray-500">Destacar en la lista principal</p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="sticky"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Fijar</FormLabel>
                        <p className="text-xs text-gray-500">Mantener siempre visible</p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </form>
        </Form>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={form.handleSubmit(handleSubmit)}
            disabled={isSubmitting}
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
