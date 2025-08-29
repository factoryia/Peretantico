"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Loader2, Plus } from "lucide-react";
import {
  fetchApplicants,
  fetchDistributors,
  fetchPaymentStatuses,
  fetchUsedChannels,
  fetchApplicationStatuses,
  fetchSubservicesByService,
  fetchServicesByCategory,
} from "../utils/request";
import { fetchCategories } from "@/features/config/utils/category";
import { useCreateRequestMutation } from "../hooks/use-request-mutations";
import type { CreateRequestPayload } from "../types/request";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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

interface Category {
  uuid: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
}

// Schema de validación
const formSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  applicationNumber: z.string().min(1, "El número de solicitud es requerido"),
  applicantId: z.string().min(1, "El cliente es requerido"),
  distributorId: z.string().optional(),
  categoryId: z.string().min(1, "La categoría es requerida"),
  serviceId: z.string().min(1, "El tipo de servicio es requerido"),
  subserviceId: z.string().optional(),
  serviceCode: z.string().optional(),
  serviceValue: z.string().optional(),
  priorityValue: z.string().min(1, "El valor priorizado es requerido").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "El valor debe ser un número mayor a 0"
  ),
  paymentStatus: z.string().min(1, "El estado de pago es requerido"),
  usedChannel: z.string().min(1, "El canal usado es requerido"),
  estimatedHours: z.string().min(1, "El tiempo estimado es requerido"),
  priorityEstimatedHours: z
    .string()
    .min(1, "El tiempo estimado priorizado es requerido")
    .refine(
      (val) => !isNaN(parseInt(val)) && parseInt(val) > 0,
      "El tiempo debe ser un número mayor a 0"
    ),
  logisticsCosts: z.string().optional(),
  applicationScore: z
    .string()
    .min(1, "La calificación es requerida")
    .refine(
      (val) => parseInt(val) >= 1 && parseInt(val) <= 5,
      "La calificación debe estar entre 1 y 5"
    ),
  isRecurring: z.boolean(),
  serviceStatus: z.string().min(1, "El estado del servicio es requerido"),
  requestStatus: z.string().min(1, "El estado de la solicitud es requerido"),
  observations: z
    .string()
    .min(1, "Las observaciones son requeridas")
    .max(100, "Máximo 100 caracteres"),
  entryDate: z.string().min(1, "La fecha de entrada es requerida"),
  promote: z.boolean(),
  sticky: z.boolean(),
});

export function NewRequestModal({
  isOpen,
  onClose,
  onSuccess,
}: NewRequestModalProps) {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [subservices, setSubservices] = useState<Subservice[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Estados para manejar las dependencias entre selects
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");

  // Estados para los nuevos campos
  const [paymentStatuses, setPaymentStatuses] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [serviceStatuses, setServiceStatuses] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [requestStatuses, setRequestStatuses] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [channels, setChannels] = useState<Array<{ id: string; name: string }>>(
    []
  );

  // Usar el hook de mutación para crear solicitudes
  const createRequestMutation = useCreateRequestMutation();

  // Funciones para manejar cambios en selects dependientes
  const handleCategoryChange = (categoryId: string) => {
    console.log("Category changed to:", categoryId);
    setSelectedCategoryId(categoryId);
    setSelectedServiceId("");
    form.setValue("serviceId", "");
    form.setValue("subserviceId", "");
    // Cargar servicios cuando cambie la categoría
    if (categoryId) {
      console.log("Calling loadServicesByCategory with:", categoryId);
      loadServicesByCategory(categoryId);
    } else {
      console.log("No category selected, clearing services");
      setServices([]);
    }
  };

  const handleServiceChange = (serviceId: string) => {
    console.log("Service changed to:", serviceId);
    setSelectedServiceId(serviceId);
    form.setValue("subserviceId", "");
    // Cargar subservicios cuando cambie el servicio
    if (serviceId) {
      console.log("Calling loadSubservicesByService with:", serviceId);
      loadSubservicesByService(serviceId);
    } else {
      console.log("No service selected, clearing subservices");
      setSubservices([]);
    }
  };

  // Función para cargar servicios por categoría
  const loadServicesByCategory = async (categoryId: string) => {
    try {
      console.log("Loading services for category:", categoryId);
      const servicesData = await fetchServicesByCategory(categoryId);
      console.log("Services data received:", servicesData);
      console.log("Services raw structure:", JSON.stringify(servicesData, null, 2));
      
      if (servicesData?.data) {
        const mappedServices = servicesData.data.map((service: any) => {
          console.log("Processing service:", service);
          return {
            id: service.id,
            name: service.attributes?.name || service.name || "Sin nombre",
          };
        });
        console.log("Mapped services:", mappedServices);
        setServices(mappedServices);
      } else {
        console.log("No services data found");
        setServices([]);
      }
    } catch (error) {
      console.error("Error loading services by category:", error);
      setServices([]);
    }
  };

  // Función para cargar subservicios por servicio
  const loadSubservicesByService = async (serviceId: string) => {
    try {
      console.log("Loading subservices for service:", serviceId);

      // Usar la función fetchSubservicesByService que ya existe
      const subservicesData = await fetchSubservicesByService(serviceId);

      console.log("Subservices data received:", subservicesData);
      console.log("Subservices raw structure:", JSON.stringify(subservicesData, null, 2));

      if (subservicesData?.data) {
        const mappedSubservices = subservicesData.data.map(
          (subservice: any) => {
            console.log("Processing subservice:", subservice);
            return {
              id: subservice.id,
              name: subservice.attributes?.name || subservice.name || subservice.nombre || "Sin nombre",
            };
          }
        );
        console.log("Mapped subservices:", mappedSubservices);
        setSubservices(mappedSubservices);
      } else {
        console.log("No subservices data found");
        setSubservices([]);
      }
    } catch (error) {
      console.error("Error loading subservices by service:", error);
      setSubservices([]);
    }
  };

  // Formulario con react-hook-form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      applicationNumber: "",
      applicantId: "",
      distributorId: "",
      categoryId: "",
      serviceId: "",
      subserviceId: "",
      serviceCode: "",
      serviceValue: "",
      priorityValue: "",
      paymentStatus: "",
      usedChannel: "",
      estimatedHours: "",
      priorityEstimatedHours: "",
      logisticsCosts: "",
      applicationScore: "1",
      isRecurring: false,
      serviceStatus: "",
      requestStatus: "",
      observations: "",
      entryDate: new Date().toISOString().split("T")[0],
      promote: false,
      sticky: false,
    },
  });

  // Cargar datos para los selects
  useEffect(() => {
    if (isOpen) {
      console.log("Modal opened, loading form data...");
      setError(null);
      loadFormData();
    }
  }, [isOpen]);

  // Cleanup effect para limpiar el estado cuando el modal se cierre
  useEffect(() => {
    if (!isOpen) {
      // Resetear el estado cuando el modal se cierre
      const timer = setTimeout(() => {
        form.reset();
        setError(null);
        setSelectedCategoryId("");
        setSelectedServiceId("");
        setServices([]);
        setSubservices([]);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isOpen, form]);

  const loadFormData = async () => {
    try {
      console.log("Starting to load form data...");
      setError(null);

      const [
        applicantsData,
        distributorsData,
        categoriesData,
        paymentStatusesData,
        usedChannelsData,
        applicationStatusesData,
      ] = await Promise.all([
        fetchApplicants(),
        fetchDistributors(),
        fetchCategories(),
        fetchPaymentStatuses(),
        fetchUsedChannels(),
        fetchApplicationStatuses(),
      ]);

      // Cargar estados desde la API
      if (paymentStatusesData?.data) {
        setPaymentStatuses(
          paymentStatusesData.data.map((item: any) => ({
            id: item.id,
            name: item.attributes.name,
          }))
        );
      } else {
        console.warn("No payment statuses data found");
        setPaymentStatuses([]);
      }

      if (usedChannelsData?.data) {
        setChannels(
          usedChannelsData.data.map((item: any) => ({
            id: item.id,
            name: item.attributes.name,
          }))
        );
      } else {
        console.warn("No used channels data found");
        setChannels([]);
      }

      if (applicationStatusesData?.data) {
        setServiceStatuses(
          applicationStatusesData.data.map((item: any) => ({
            id: item.id,
            name: item.attributes.name,
          }))
        );

        setRequestStatuses(
          applicationStatusesData.data.map((item: any) => ({
            id: item.id,
            name: item.attributes.name,
          }))
        );
      } else {
        console.warn("No application statuses data found");
        setServiceStatuses([]);
        setRequestStatuses([]);
      }

      // Verificar que el componente siga montado antes de actualizar el estado
      if (applicantsData?.data) {
        setApplicants(
          applicantsData.data.map((item: any) => ({
            id: item.id,
            fullName: item.attributes.field_full_name,
            documentNumber: item.attributes.field_document_number,
          }))
        );
      }

      if (distributorsData?.data) {
        setDistributors(
          distributorsData.data.map((item: any) => ({
            id: item.id,
            title: item.attributes.title,
            documentNumber: item.attributes.field_document_number,
          }))
        );
      }

      if (categoriesData?.categories) {
        console.log("Categories loaded:", categoriesData.categories);
        setCategories(categoriesData.categories);
      } else {
        console.log("No categories data found");
      }

      console.log("Form data loading completed");
    } catch (error) {
      console.error("Error loading form data:", error);
      setError("Error al cargar los datos del formulario");
      toast.error("Error al cargar los datos del formulario");
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (createRequestMutation.isPending) return;

    try {
      // Create a minimal payload first to test
      const payload: CreateRequestPayload = {
        data: {
          type: "node--request",
          attributes: {
            title: values.title,
            field_application_number: values.applicationNumber,
            field_application_score: parseInt(values.applicationScore) || 1,
            field_entry_date: values.entryDate,
            field_estimated_application_hour: values.estimatedHours
              ? parseInt(values.estimatedHours)
              : 1,
            field_estimated_prioritized_hour: values.priorityEstimatedHours && values.priorityEstimatedHours.trim() !== ""
              ? parseInt(values.priorityEstimatedHours)
              : 1,
            field_logistics_costs: values.logisticsCosts && values.logisticsCosts.trim() !== ""
              ? parseFloat(values.logisticsCosts)
              : 0,
            field_service_value: values.serviceValue && values.serviceValue.trim() !== ""
              ? parseFloat(values.serviceValue)
              : 1000,
            field_prioritized_value: values.priorityValue && values.priorityValue.trim() !== ""
              ? parseFloat(values.priorityValue)
              : 1000,
            field_is_recurring: values.isRecurring,
            field_observations: values.observations || "Sin observaciones",
            status: true,
            promote: values.promote,
            sticky: values.sticky,
          },
          relationships: {
            field_applicant: {
              data: { type: "node--profile", id: values.applicantId },
            },
            field_application_statuses: {
              data: {
                type: "taxonomy_term--application_statuses",
                id: values.requestStatus,
              },
            },
            field_service_status: {
              data: {
                type: "taxonomy_term--application_statuses",
                id: values.serviceStatus,
              },
            },
            field_payment_status: {
              data: {
                type: "taxonomy_term--payment_status",
                id: values.paymentStatus,
              },
            },
            field_used_channel: {
              data: {
                type: "taxonomy_term--used_channel",
                id: values.usedChannel,
              },
            },
            ...(values.distributorId && {
              field_distributor_data: {
                data: { type: "node--distributor", id: values.distributorId },
              },
            }),
            ...(values.categoryId && {
              field_category: {
                data: {
                  type: "taxonomy_term--category",
                  id: values.categoryId,
                },
              },
            }),
            ...(values.serviceId && {
              field_service: {
                data: { type: "taxonomy_term--category", id: values.serviceId },
              },
            }),
            ...(values.subserviceId && {
              field_subservice: {
                data: {
                  type: "taxonomy_term--category",
                  id: values.subserviceId,
                },
              },
            }),
          },
        },
      };

      console.log("Form values:", values);
      console.log("Priority values:", {
        priorityValue: values.priorityValue,
        priorityEstimatedHours: values.priorityEstimatedHours
      });
      console.log("Priority fields in payload:", {
        field_estimated_prioritized_hour: payload.data.attributes.field_estimated_prioritized_hour,
        field_prioritized_value: payload.data.attributes.field_prioritized_value
      });
      console.log("Logistics costs in payload:", {
        field_logistics_costs: payload.data.attributes.field_logistics_costs,
        originalValue: values.logisticsCosts
      });
      console.log("Sending payload:", JSON.stringify(payload, null, 2));

      await createRequestMutation.mutateAsync(payload);

      // Solo cerrar si el componente sigue montado
      if (isOpen) {
        onSuccess();
        onClose();
        form.reset();
      }
    } catch (error: any) {
      console.error("Error creating request:", error);
      toast.error(error.message || "Error al crear la solicitud");
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

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

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="px-6 py-4 space-y-6"
          >
            {/* Campos del formulario */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título *</FormLabel>
                    <FormControl>
                      <Input placeholder="Título de la solicitud" {...field} />
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
                name="applicantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="max-w-[200px]">
                          <SelectValue placeholder="Seleccionar cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-w-[300px]">
                        {applicants.map((applicant) => (
                          <SelectItem
                            key={applicant.id}
                            value={applicant.id}
                            className="truncate"
                          >
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
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="max-w-[200px]">
                          <SelectValue placeholder="Seleccionar repartidor (opcional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-w-[300px]">
                        {distributors.map((distributor) => (
                          <SelectItem
                            key={distributor.id}
                            value={distributor.id}
                            className="truncate"
                          >
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

            {/* Campos de categoría, servicio y subservicio */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                Categoría y Servicios
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría *</FormLabel>
                      <Select
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
                      <Select
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
                      <FormLabel>Subservicio</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!selectedServiceId}
                      >
                        <FormControl>
                          <SelectTrigger className="max-w-[200px]">
                            <SelectValue
                              placeholder={
                                selectedServiceId
                                  ? "Seleccionar subservicio (opcional)"
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
            </div>

            {/* Campos de valores y costos */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                Valores y Costos
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="estimatedHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tiempo estimado (horas) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="2"
                          {...field}
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
                      <FormLabel>
                        Tiempo estimado priorizado (horas) *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="1"
                          {...field}
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
                      <FormLabel>Costos logísticos</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="50"
                          {...field}
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
                      <FormLabel>Valor priorizado *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          step="0.01"
                          placeholder="200"
                          {...field}
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
            </div>

            {/* Campos de estado y canal */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                Estado y Canal
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="paymentStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado de pago *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="max-w-[200px]">
                            <SelectValue placeholder="Seleccionar estado de pago" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-w-[300px]">
                          {paymentStatuses.map((status) => (
                            <SelectItem
                              key={status.id}
                              value={status.id}
                              className="truncate"
                            >
                              {status.name}
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
                  name="usedChannel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Canal usado *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="max-w-[200px]">
                            <SelectValue placeholder="Seleccionar canal" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-w-[300px]">
                          {channels.map((channel) => (
                            <SelectItem
                              key={channel.id}
                              value={channel.id}
                              className="truncate"
                            >
                              {channel.name}
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

            {/* Gestión de solicitud */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                Gestión de Solicitud
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="serviceStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado del servicio *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="max-w-[200px]">
                            <SelectValue placeholder="Seleccionar estado del servicio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-w-[300px]">
                          {serviceStatuses.map((status) => (
                            <SelectItem
                              key={status.id}
                              value={status.id}
                              className="truncate"
                            >
                              {status.name}
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
                  name="requestStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado de la solicitud *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="max-w-[200px]">
                            <SelectValue placeholder="Seleccionar estado de la solicitud" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-w-[300px]">
                          {requestStatuses.map((status) => (
                            <SelectItem
                              key={status.id}
                              value={status.id}
                              className="truncate"
                            >
                              {status.name}
                            </SelectItem>
                          ))}
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
                name="applicationScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calificación inicial *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        placeholder="1-5"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Campos de configuración */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Configuración de la solicitud
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="promote"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Promocionar</FormLabel>
                        <p className="text-xs text-gray-500">
                          Destacar esta solicitud en la lista principal
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
                          Mantener esta solicitud siempre visible
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
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={createRequestMutation.isPending}
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
  );
}
