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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

import { updateRequest, fetchApplicants } from "@/features/home/utils/request";
import { uploadServiceFieldFile } from "@/features/home/utils/evidence";
import { API_BASE_URL } from "@/features/auth/constants";
import {
  useDistributorsQuery,
  useServicesQuery,
} from "@/features/home/hooks/use-request-query";
import type {
  EditRequestFormData,
  Applicant,
  Distributor,
} from "@/features/home/types/request";
import type { CompleteRequest } from "../utils/complete-request";

interface EditRequestModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  request: CompleteRequest | null;
}

function parseDateFromString(value: string): Date | undefined {
  const parts = value.split("-");
  if (parts.length !== 3) return undefined;
  const [yearStr, monthStr, dayStr] = parts;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function EditRequestModal({
  isOpen,
  onOpenChange,
  request,
}: EditRequestModalProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [uploadingFieldId, setUploadingFieldId] = useState<string | null>(null);

  // Obtener datos para las opciones del formulario
  const { data: distributorsData } = useDistributorsQuery();
  const { data: servicesData } = useServicesQuery();

  // Transform data to match our interface with safety checks
  const distributors: Distributor[] = Array.isArray(distributorsData)
    ? (distributorsData as any[]).map((item: any) => ({
        id: item.id as string,
        title: (item.title as string) || "",
        documentNumber: (item.documentNumber as string) || "",
        documentType: item.documentType?.name || "",
        phone: (item.phoneNumber as string) || "",
        email: (item.email as string) || "",
        status: item.currentAvailability ? "Disponible" : "No disponible",
      }))
    : [];

  const services = Array.isArray(servicesData?.services)
    ? servicesData.services
    : [];

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
              documentType: "",
              birthDate: "",
              gender: "",
              phone: "",
              email: "",
            };
          }
        );
        setApplicants(applicantsData as Applicant[]);
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
      dataValues: {},
      paymentMethod: "",
      isPrioritized: false,

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

  const currentServiceId =
    form.watch("serviceId") || request?.subservice?.id || "";
  const currentService =
    services.find((service: any) => service.id === currentServiceId) || null;
  const serviceFields: any[] = Array.isArray((currentService as any)?.fields)
    ? (currentService as any).fields
    : [];

  useEffect(() => {
    const loadRequestData = async () => {
      if (request && isOpen) {
        form.reset({
          // Campos del solicitante
          applicantId: request.applicant?.id || "",

          // Campos de la solicitud
          title: request.title || "",
          applicationNumber: request.field_application_number || "",
          applicationScore: request.field_application_score || 4,
          entryDate: request.field_entry_date || "",
          categoryId: "",
          serviceId: request.subservice?.id || "",
          subserviceId: "",
          serviceCode: "", // TODO: Implementar cuando esté disponible en la API
          serviceValue: request.field_service_value || 0,
          priorityValue: request.field_priority_value || 0,
          paymentStatus: request.field_payment_status_id || "",
          usedChannel: request.field_used_channel || "",
          estimatedHours: request.field_estimated_application_hour || 0,
          priorityEstimatedHours: request.field_estimated_prioritized_hour || 0,
          logisticsCosts: request.field_logistics_costs || 0,
          isRecurring: request.field_is_recurring || false,
          paymentMethod: request.paymentMethod || "",
          isPrioritized: request.isPrioritized || false,
          dataValues:
            Array.isArray(request.data)
              ? Object.fromEntries(
                  request.data.map((d) => [d.fieldId, d.value])
                )
              : {},

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

      }
    };

    loadRequestData();
  }, [request, isOpen, form]);

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
            field_is_recurring: data.isRecurring,
            field_observations: data.observations || null,
            serviceId: data.serviceId || undefined,
            status: data.status,
            promote: data.promote,
            sticky: data.sticky,
          },
          relationships: relationships,
        },
        serviceData: Object.entries(data.dataValues || {}).map(
          ([fieldId, value]) => ({ fieldId, value })
        ),
        paymentMethod: data.paymentMethod || null,
        isPrioritized: data.isPrioritized ?? false,
      };

      await updateRequest(request.id, requestData);

      onOpenChange(false);

      requestAnimationFrame(() => {
        toast.success("Solicitud actualizada correctamente");
        queryClient.invalidateQueries({ queryKey: ["complete-requests"] });
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
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="serviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Servicio *</FormLabel>
                      <Select
                        key={`service-${isOpen}`}
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="max-w-[260px]">
                            <SelectValue placeholder="Seleccionar servicio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-w-[320px]">
                          {services.map((service: any) => (
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

              {/* Datos del Servicio (campos dinámicos del servicio) */}
              {Array.isArray(serviceFields) && serviceFields.length > 0 && (
                <div className="space-y-4 mt-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                    <CreditCard className="h-5 w-5" />
                    {currentService?.name || "Datos del Servicio"}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {serviceFields
                      .slice()
                      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                      .map((fieldMeta) => {
                        const fieldType = fieldMeta.type || "Text";
                        const name = `dataValues.${fieldMeta.id}`;
                        if (fieldType === "Select") {
                          const optionsRaw = (fieldMeta.options as any) || {};
                          const items: { label: string; value: string }[] =
                            Array.isArray(optionsRaw.items)
                              ? optionsRaw.items
                              : [];
                          return (
                            <FormField
                              key={fieldMeta.id}
                              control={form.control}
                              name={name as any}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    {fieldMeta.name || "Campo"}
                                  </FormLabel>
                                  <FormControl>
                                    <Select
                                      onValueChange={field.onChange}
                                      value={
                                        (field.value as string | undefined) ??
                                        ""
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {items.map((opt) => (
                                          <SelectItem
                                            key={opt.value}
                                            value={opt.value}
                                          >
                                            {opt.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          );
                        }
                        if (fieldType === "File") {
                          return (
                            <FormField
                              key={fieldMeta.id}
                              control={form.control}
                              name={name as any}
                              render={({ field }) => {
                                const rawUrl = field.value as string | undefined;
                                const href =
                                  rawUrl && rawUrl.startsWith("http")
                                    ? rawUrl
                                    : rawUrl
                                    ? `${API_BASE_URL}${rawUrl}`
                                    : "";
                                const isUploading =
                                  uploadingFieldId === fieldMeta.id;
                                return (
                                  <FormItem>
                                    <FormLabel>
                                      {fieldMeta.name || "Archivo"}
                                    </FormLabel>
                                    <FormControl>
                                      <div className="flex flex-col gap-2">
                                        <Input
                                          type="file"
                                          disabled={isUploading}
                                          onChange={async (e) => {
                                            const file =
                                              e.target.files?.[0] || null;
                                            if (!file) return;
                                            try {
                                              setUploadingFieldId(fieldMeta.id);
                                              const url =
                                                await uploadServiceFieldFile(
                                                  file
                                                );
                                              field.onChange(url);
                                              toast.success(
                                                "Archivo subido correctamente"
                                              );
                                            } catch {
                                              toast.error(
                                                "Error al subir el archivo"
                                              );
                                            } finally {
                                              setUploadingFieldId(null);
                                              e.target.value = "";
                                            }
                                          }}
                                        />
                                        {href && (
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              window.open(href, "_blank");
                                            }}
                                          >
                                            Ver archivo
                                          </Button>
                                        )}
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                );
                              }}
                            />
                          );
                        }
                        if (fieldType === "Boolean") {
                          return (
                            <FormField
                              key={fieldMeta.id}
                              control={form.control}
                              name={name as any}
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-base">
                                      {fieldMeta.name || "Campo"}
                                    </FormLabel>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={!!field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          );
                        }
                        if (fieldType === "Number") {
                          return (
                            <FormField
                              key={fieldMeta.id}
                              control={form.control}
                              name={name as any}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    {fieldMeta.name || "Campo"}
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      value={field.value as number | string | undefined}
                                      onChange={(e) =>
                                        field.onChange(
                                          Number(e.target.value || 0)
                                        )
                                      }
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          );
                        }
                        if (fieldType === "Date") {
                          return (
                            <FormField
                              key={fieldMeta.id}
                              control={form.control}
                              name={name as any}
                              render={({ field }) => {
                                const valueString =
                                  typeof field.value === "string"
                                    ? field.value
                                    : "";
                                const dateValue = valueString
                                  ? parseDateFromString(valueString)
                                  : undefined;
                                return (
                                  <FormItem className="flex flex-col">
                                    <FormLabel>
                                      {fieldMeta.name || "Campo"}
                                    </FormLabel>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <FormControl>
                                          <Button
                                            variant="outline"
                                            className={cn(
                                              "w-full justify-start text-left font-normal",
                                              !dateValue && "text-muted-foreground"
                                            )}
                                          >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateValue
                                              ? dateValue.toLocaleDateString()
                                              : "Seleccionar fecha"}
                                          </Button>
                                        </FormControl>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0">
                                        <Calendar
                                          mode="single"
                                          selected={dateValue}
                                          onSelect={(date) => {
                                            if (date) {
                                              const formatted = formatDateToString(
                                                date
                                              );
                                              field.onChange(formatted);
                                            } else {
                                              field.onChange("");
                                            }
                                          }}
                                        />
                                      </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                  </FormItem>
                                );
                              }}
                            />
                          );
                        }
                        return (
                          <FormField
                            key={fieldMeta.id}
                            control={form.control}
                            name={name as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  {fieldMeta.name || "Campo"}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    value={(field.value as string) ?? ""}
                                    onChange={(e) => field.onChange(e.target.value)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        );
                      })}
                  </div>
                </div>
              )}
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

              <p className="text-sm text-muted-foreground">
                Seleccione los ajustes de su solicitud
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel>Método de pago</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione un método" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="tarjeta">
                              Tarjeta de crédito/débito
                            </SelectItem>
                            <SelectItem value="online">
                              Pago en línea
                            </SelectItem>
                            <SelectItem value="transferencia">
                              Transferencia bancaria
                            </SelectItem>
                            <SelectItem value="efectivo">
                              Efectivo
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isPrioritized"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel>Solicitud prioritaria</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                          <span className="text-xs text-gray-500">
                            ¿Es una solicitud prioritaria?
                          </span>
                        </div>
                      </FormControl>
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
