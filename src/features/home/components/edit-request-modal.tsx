import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import {
  Loader,
  Edit,
  User,
  Package,
  CreditCard,
  MessageSquare,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import {
  updateRequest,
  fetchApplicants,
  fetchSubserviceWithHierarchy,
} from "@/features/home/utils/request";
import {
  useDistributorsQuery,
  useCategoriesQuery,
  useServicesByCategoryQuery,
  useSubservicesByServiceQuery,
} from "@/features/home/hooks/use-request-query";
import type {
  EditRequestFormData,
  Category,
  Service,
  Subservice,
  Applicant,
  Distributor,
} from "@/features/home/types/request";
import type { CompleteRequest } from "../utils/complete-request";

interface EditRequestModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  request: CompleteRequest | null;
}

export function EditRequestModal({
  isOpen,
  onOpenChange,
  request,
}: EditRequestModalProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicants, setApplicants] = useState<Applicant[]>([]);

  // Obtener datos para las opciones del formulario
  const { data: distributorsData } = useDistributorsQuery();
  const { data: categoriesData } = useCategoriesQuery();

  // Obtener servicios basados en la categoría seleccionada
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const { data: servicesData } = useServicesByCategoryQuery(selectedCategoryId);

  // Obtener subservicios basados en el servicio seleccionado
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const { data: filteredSubservicesData } =
    useSubservicesByServiceQuery(selectedServiceId);

  // Manejar cambio de categoría
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedServiceId("");
    form.setValue("serviceId", "");
    form.setValue("subserviceId", "");
  };

  // Manejar cambio de servicio
  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    form.setValue("subserviceId", "");
  };

  // Transform data to match our interface with safety checks
  const distributors: Distributor[] = Array.isArray(
    (distributorsData as { data?: unknown[] })?.data
  )
    ? (distributorsData as { data: unknown[] }).data.map((item: unknown) => {
        const itemRecord = item as Record<string, unknown>;
        const attributes = itemRecord.attributes as Record<string, unknown>;
        return {
          id: itemRecord.id as string,
          title: (attributes?.title as string) || "",
          documentNumber: (attributes?.field_document_number as string) || "",
          documentType: (attributes?.field_document_type as string) || "",
          phone: (attributes?.field_phone as string) || "",
          email: (attributes?.field_email as string) || "",
          status: attributes?.field_current_availability
            ? "Disponible"
            : "No disponible",
        };
      })
    : [];

  const categories: Category[] = categoriesData || [];
  const services: Service[] = servicesData?.services || [];

  // Get subservices from the hook
  const subservices: Subservice[] = filteredSubservicesData?.subservices || [];

  const loadApplicants = useCallback(async () => {
    try {
      const response = await fetchApplicants();
      if (response?.data) {
        const applicantsData = response.data.map(
          (item: Record<string, unknown>) => {
            const attributes = item.attributes as Record<string, unknown>;
            return {
              id: item.id as string,
              fullName: (attributes?.field_full_name as string) || "",
              documentNumber:
                (attributes?.field_document_number as string) || "",
            };
          }
        );
        setApplicants(applicantsData);
      }
    } catch {
      // Manejar error silenciosamente - los solicitantes permanecerán vacíos
    }
  }, []);

  // Cargar solicitantes cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      loadApplicants();
    }
  }, [isOpen, loadApplicants]);

  // Efecto de limpieza
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setIsSubmitting(false);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const form = useForm<EditRequestFormData>({
    defaultValues: {
      // Campos del solicitante
      applicantId: "",

      // Campos de la solicitud
      title: "",
      applicationNumber: "",
      applicationScore: 4,
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
    const loadRequestData = async () => {
      if (request && isOpen) {
        const subserviceId = request.subservice?.id || "";

        form.reset({
          // Campos del solicitante
          applicantId: request.applicant?.id || "",

          // Campos de la solicitud
          title: request.title || "",
          applicationNumber: request.field_application_number || "",
          applicationScore: request.field_application_score || 4,
          entryDate: request.field_entry_date || "",
          categoryId: "", // Se determinará basado en el subservicio
          serviceId: "", // Se determinará basado en el subservicio
          subserviceId: subserviceId,
          serviceCode: "", // TODO: Implementar cuando esté disponible en la API
          serviceValue: request.field_service_value || 0,
          priorityValue: request.field_priority_value || 0,
          paymentStatus: request.field_payment_status_id || "",
          usedChannel: request.field_used_channel || "",
          estimatedHours: request.field_estimated_application_hour || 0,
          priorityEstimatedHours: request.field_estimated_prioritized_hour || 0,
          logisticsCosts: request.field_logistics_costs || 0,
          isRecurring: request.field_is_recurring || false,

          // Campos del repartidor
          distributorId: request.distributor?.id || "",

          // Gestión de solicitud
          serviceStatus: request.field_service_status || "",
          requestStatus: request.field_request_status || "",
          observations: request.field_observations || "",

          // Configuración
          status: request.status ?? true,
          promote: request.promote ?? false,
          sticky: request.sticky ?? false,
        });

        // Si hay subservicio, determinar categoría y servicio
        if (subserviceId) {
          try {
            const hierarchy = await fetchSubserviceWithHierarchy(subserviceId);
            if (hierarchy?.category && hierarchy?.service) {
              setSelectedCategoryId(hierarchy.category.uuid);
              setSelectedServiceId(hierarchy.service.id);
              form.setValue("categoryId", hierarchy.category.uuid);
              form.setValue("serviceId", hierarchy.service.id);
            }
          } catch {
            // Manejar error silenciosamente - el formulario funcionará sin jerarquía
          }
        }
      }
    };

    loadRequestData();
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

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  const handleSubmit = async (data: EditRequestFormData) => {
    if (!request || isSubmitting) return;

    if (!confirm("¿Confirma que desea guardar los cambios?")) {
      return;
    }

    setIsSubmitting(true);
    try {
      const relationships: Record<
        string,
        { data: { type: string; id: string } }
      > = {};

      if (data.applicantId) {
        relationships.field_applicant = {
          data: { type: "node--profile", id: data.applicantId },
        };
      }

      if (data.distributorId && data.distributorId !== "none") {
        relationships.field_distributor_data = {
          data: { type: "node--distributor", id: data.distributorId },
        };
      }

      if (data.subserviceId) {
        relationships.field_subservice = {
          data: { type: "taxonomy_term--category", id: data.subserviceId },
        };
      }

      const requestData = {
        data: {
          type: "node--request" as const,
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
          relationships: relationships,
        },
      };

      await updateRequest(request.id, requestData);

      onOpenChange(false);

      requestAnimationFrame(() => {
        toast.success("Solicitud actualizada correctamente");
        queryClient.invalidateQueries({ queryKey: ["requests"] });
      });
    } catch {
      toast.error("Error al actualizar la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!request || !isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onOpenChange(open);
      }}
    >
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
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="px-6 py-4 space-y-6"
          >
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
                        <Input placeholder="APP-001" {...field} />
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
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
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
                      <Select
                        key={`category-${isOpen}`}
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleCategoryChange(value);
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="max-w-[200px]">
                            <SelectValue placeholder="Seleccionar categoría" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-w-[300px]">
                          {categories.map((category) => (
                            <SelectItem
                              key={category.uuid}
                              value={category.uuid}
                              className="truncate"
                            >
                              {category.name ?? "Sin nombre"}
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
                      <Select
                        key={`service-${isOpen}`}
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleServiceChange(value);
                        }}
                        defaultValue={field.value}
                        disabled={!selectedCategoryId}
                      >
                        <FormControl>
                          <SelectTrigger className="max-w-[200px]">
                            <SelectValue
                              placeholder={
                                selectedCategoryId
                                  ? "Seleccionar servicio"
                                  : "Seleccione categoría primero"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-w-[300px]">
                          {services.map((service) => (
                            <SelectItem
                              key={service.id}
                              value={service.id}
                              className="truncate"
                            >
                              {service.name ?? "Sin servicio"}
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
                      <Select
                        key={`subservice-${isOpen}`}
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!selectedServiceId}
                      >
                        <FormControl>
                          <SelectTrigger className="max-w-[200px]">
                            <SelectValue
                              placeholder={
                                selectedServiceId
                                  ? "Seleccionar subservicio"
                                  : "Seleccione servicio primero"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-w-[300px]">
                          {subservices.map((subservice) => (
                            <SelectItem
                              key={subservice.id}
                              value={subservice.id}
                              className="truncate"
                            >
                              {subservice.name ?? "Sin subservicio"}
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
                      <Select
                        key={`applicant-${isOpen}`}
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {applicants.map((applicant) => (
                            <SelectItem key={applicant.id} value={applicant.id}>
                              {applicant.fullName ?? "Sin nombre"} -{" "}
                              {applicant.documentNumber ??
                                "Sin número de documento"}
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
                      <Select
                        key={`distributor-${isOpen}`}
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sin asignar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {distributors.map((distributor) => (
                            <SelectItem
                              key={distributor.id}
                              value={distributor.id}
                            >
                              {distributor.title ?? "Sin nombre"} -{" "}
                              {distributor.documentNumber ??
                                "Sin número de documento"}
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
              <div className="grid grid-cols-2 gap-4">
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
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
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
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isRecurring"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">Recurrente</FormLabel>
                      <p className="text-xs text-gray-500">
                        ¿Es una solicitud recurrente?
                      </p>
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

            {/* Gestión de Solicitud */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                <MessageSquare className="h-5 w-5" />
                Gestión de Solicitud
              </h3>

              <FormField
                control={form.control}
                name="observations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observaciones</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ingrese las observaciones de la solicitud..."
                        className="resize-none"
                        maxLength={500}
                        {...field}
                      />
                    </FormControl>
                    <div className="text-xs text-gray-500 text-right">
                      {field.value?.length || 0}/500 caracteres
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
                        <p className="text-xs text-gray-500">
                          Activar o desactivar la solicitud
                        </p>
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
                        <p className="text-xs text-gray-500">
                          Destacar en la lista principal
                        </p>
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
                        <p className="text-xs text-gray-500">
                          Mantener siempre visible
                        </p>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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
