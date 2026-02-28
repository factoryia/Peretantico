"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, ChevronsUpDown } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

import { fetchApplicants } from "../utils/request";
import { uploadServiceFieldFile } from "../utils/evidence";
import { API_BASE_URL } from "@/features/auth/constants";
import { fetchServices } from "@/features/config/utils/service";
import { useCreateRequestMutation } from "../hooks/use-request-mutations";
import type { CreateRequestDto, RequestDataDto } from "../types/request";
import type { Service } from "@/features/config/types";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CustomerFormDialog } from "@/features/client/components/customer-dialog";
import { RequiredDot } from "@/components/common/required-dot";

interface NewRequestModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
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

interface Applicant {
  id: string;
  fullName: string;
  documentNumber: string;
}

interface ApplicantData {
  id: string;
  attributes: {
    field_full_name: string;
    field_document_number: string;
  };
}

// Schema base de validación
const baseFormSchema = z.object({
  applicationNumber: z.string().optional(),
  applicantId: z.string().min(1, "El cliente es requerido"),
  serviceId: z.string().min(1, "El tipo de servicio es requerido"),
  entryDate: z.string().min(1, "La fecha de entrada es requerida"),
  priorityValue: z.boolean().optional(),
  paymentMethod: z.string().optional(),
  isPrioritized: z.boolean().optional(),
  serviceValue: z.number().optional(),
});

// Función para crear un schema dinámico basado en los campos del servicio
const createDynamicFormSchema = (service: Service | null) => {
  if (!service || !service.fields || service.fields.length === 0) {
    return baseFormSchema;
  }

  const dynamicFields: Record<string, z.ZodTypeAny> = {};

  service.fields.forEach((field) => {
    if (!field.status) return;

    let fieldSchema: z.ZodTypeAny;

    // Mapeo de tipos de campo a validaciones Zod
    switch (field.type) {
      case "Boolean":
        fieldSchema = z.boolean().optional();
        break;
      case "Number":
        // Los inputs numéricos html devuelven strings a veces, o numbers
        // Aquí asumiremos string que se puede parsear, o number directo
        fieldSchema = z.string().or(z.number()).optional();
        if (field.required) {
          fieldSchema = z
            .string()
            .min(1, `${field.name} es requerido`)
            .or(z.number());
        }
        break;
      case "Date":
        fieldSchema = z.string().optional();
        if (field.required) {
          fieldSchema = z.string().min(1, `${field.name} es requerido`);
        }
        break;
      case "File":
        // Para archivos, asumimos que se manejan aparte o suben URL
        // Por simplicidad en este refactor, usaremos string (URL) o File object
        // Ajustar según implementación de upload
        fieldSchema = z.any().optional();
        if (field.required) {
          fieldSchema = z.any().refine((val) => val, {
            message: `${field.name} es requerido`,
          });
        }
        break;
      default: // Text, Select, etc.
        fieldSchema = z.string().optional();
        if (field.required) {
          fieldSchema = z.string().min(1, `${field.name} es requerido`);
        }
    }

    dynamicFields[field.id] = fieldSchema;
  });

  return baseFormSchema.extend(dynamicFields);
};

export function NewRequestModal({
  isOpen,
  onOpenChange,
  onSuccess,
}: NewRequestModalProps) {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para el modal de crear cliente
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [uploadingFieldId, setUploadingFieldId] = useState<string | null>(null);
  
  const [generatedApplicationNumber, setGeneratedApplicationNumber] = useState("");

  const createRequestMutation = useCreateRequestMutation();

  // Formulario con resolver dinámico
  const form = useForm<z.infer<ReturnType<typeof createDynamicFormSchema>>>({
    resolver: async (values, context, options) => {
      const schema = createDynamicFormSchema(selectedService);
      return zodResolver(schema)(values, context, options);
    },
    defaultValues: {
      applicantId: "",
      serviceId: "",
      entryDate: new Date().toISOString().split("T")[0],
      priorityValue: false,
      paymentMethod: "",
      isPrioritized: false,
      serviceValue: 0,
    },
  });

  // Generador de número de solicitud
  const generateRequestId = useCallback((serviceId?: string) => {
    let prefix = "GEN";
    
    // Intentar obtener prefijo del nombre del servicio (lógica legacy simplificada)
    if (serviceId) {
        // Esta lógica podría moverse a una propiedad del servicio en el backend en el futuro
        // Por ahora mantenemos un mapeo simple si es necesario o usamos GEN
        prefix = "REQ"; 
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hour = String(now.getHours()).padStart(2, "0");
    const minute = String(now.getMinutes()).padStart(2, "0");
    const timestamp = `${year}${month}${day}${hour}${minute}`;
    const randomSuffix = String(Math.floor(Math.random() * 10000)).padStart(4, "0");

    return `PER-${prefix}-${timestamp}-${randomSuffix}`;
  }, []);

  // Cargar datos iniciales
  const loadFormData = async () => {
    try {
      setError(null);
      
      const [applicantsResult, servicesResult] = await Promise.allSettled([
        fetchApplicants(),
        fetchServices("", 1, 100)
      ]);

      // Procesar clientes
      if (applicantsResult.status === "fulfilled" && applicantsResult.value?.data) {
        setApplicants(
          applicantsResult.value.data.map((item: ApplicantData) => ({
            id: item.id,
            fullName: item.attributes.field_full_name,
            documentNumber: item.attributes.field_document_number,
          }))
        );
      }

      // Procesar servicios
      if (servicesResult.status === "fulfilled" && servicesResult.value?.services) {
        setServices(servicesResult.value.services);
      }

    } catch (err) {
      console.error("Error loading form data", err);
      setError("Error al cargar los datos del formulario");
      toast.error("Error al cargar los datos iniciales");
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFormData();
      const initialRequestId = generateRequestId();
      setGeneratedApplicationNumber(initialRequestId);
      form.setValue("applicationNumber", initialRequestId);
    } else {
      // Reset form on close
      form.reset();
      setSelectedService(null);
    }
  }, [isOpen, generateRequestId, form]);

  const handleServiceChange = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId) || null;
    setSelectedService(service);
    form.setValue("serviceId", serviceId);
    if (service) {
      form.setValue("serviceValue", service.price || 0);
    }
    
    // Regenerar ID con el nuevo servicio si es necesario
    const newId = generateRequestId(serviceId);
    setGeneratedApplicationNumber(newId);
    form.setValue("applicationNumber", newId);
  };

  const onSubmit = async (values: any) => {
    if (createRequestMutation.isPending) return;

    try {
      // Construir data dinámica
      const requestData: RequestDataDto[] = [];
      
      if (selectedService?.fields) {
        selectedService.fields.forEach(field => {
            if (!field.status) return;
            
            const value = values[field.id];
            if (value !== undefined && value !== null && value !== "") {
                requestData.push({
                    fieldId: field.id,
                    value: value
                });
            }
        });
      }

      const payload: CreateRequestDto = {
        applicantId: values.applicantId,
        serviceId: values.serviceId,
        title: generatedApplicationNumber,
        entryDate: values.entryDate,
        data: requestData,
        paymentMethod: values.paymentMethod || null,
        isPrioritized: values.isPrioritized ?? false,
        requestStatus: "EnProceso",
        serviceValue: values.serviceValue,
      };

      await createRequestMutation.mutateAsync(payload);
      
      onOpenChange(false);
      onSuccess();
      form.reset();
      
    } catch (error: any) {
        // El hook ya maneja el toast de error, pero si necesitamos algo extra:
        console.error("Error submitting form", error);
    }
  };

  const handleOpenChangeWrapper = (open: boolean) => {
    onOpenChange(open);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChangeWrapper}>
      <DialogContent className="sm:max-w-[700px] p-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nueva Solicitud
          </DialogTitle>
          <DialogDescription>
            Completa la información para crear una nueva solicitud.
            Los campos cambiarán según el servicio seleccionado.
          </DialogDescription>
          {error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 px-6 py-4">
            
            {/* Información General */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1 block">
                    Número de Solicitud
                </FormLabel>
                <div className="p-2 bg-muted rounded-md text-sm font-mono">
                    {generatedApplicationNumber}
                </div>
              </div>

              <FormField
                control={form.control}
                name="entryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Entrada <RequiredDot /></FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Selección de Cliente y Servicio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* Cliente */}
               <FormField
                  control={form.control}
                  name="applicantId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Cliente <RequiredDot /></FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={`w-full justify-between ${
                                !field.value && "text-muted-foreground"
                              }`}
                            >
                              {field.value
                                ? applicants.find(
                                    (customer) => customer.id === field.value
                                  )?.fullName
                                : "Seleccionar cliente"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                          <Command>
                            <CommandInput placeholder="Buscar cliente..." />
                            <CommandList>
                              <CommandEmpty>No se encontró cliente.</CommandEmpty>
                              <CommandGroup>
                                {applicants.map((customer) => (
                                  <CommandItem
                                    value={customer.fullName}
                                    key={customer.id}
                                    onSelect={() => {
                                      form.setValue("applicantId", customer.id);
                                    }}
                                  >
                                    <div className="flex flex-col">
                                      <span>{customer.fullName}</span>
                                      <span className="text-xs text-gray-500">
                                        {customer.documentNumber}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <div className="mt-1">
                        <Button
                            type="button"
                            variant="link"
                            className="p-0 h-auto text-xs"
                            onClick={() => setIsCustomerModalOpen(true)}
                        >
                            + Crear nuevo cliente
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Servicio */}
                <FormField
                  control={form.control}
                  name="serviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Servicio <RequiredDot /></FormLabel>
                      <Select
                        onValueChange={handleServiceChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar servicio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {services.map((service) => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            {/* Campos Dinámicos del Servicio */}
            {selectedService && selectedService.fields && selectedService.fields.length > 0 && (
                <div className="space-y-4 border rounded-md p-4 bg-gray-50/50">
                    <h3 className="text-sm font-medium border-b pb-2 mb-4">
                        Información del Servicio: {selectedService.name}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedService.fields
                          .filter((f) => f.status)
                          .sort((a, b) => a.order - b.order)
                          .map((field) => (
                            <FormField
                              key={field.id}
                              control={form.control}
                              name={field.id}
                              render={({ field: formField }) => {
                                const fieldType = field.type;
                                if (fieldType === "Boolean") {
                                  return (
                                    <FormItem>
                                      <FormLabel>
                                        {field.name}
                                        {field.required && <RequiredDot />}
                                      </FormLabel>
                                      <FormControl>
                                        <div className="flex items-center space-x-2">
                                          <Switch
                                            checked={formField.value === true}
                                            onCheckedChange={formField.onChange}
                                          />
                                          <span className="text-sm text-muted-foreground">
                                            {formField.value ? "Sí" : "No"}
                                          </span>
                                        </div>
                                      </FormControl>
                                      {field.description && (
                                        <p className="text-[0.8rem] text-muted-foreground">
                                          {field.description}
                                        </p>
                                      )}
                                      <FormMessage />
                                    </FormItem>
                                  );
                                }

                                if (fieldType === "Select") {
                                  const optionsRaw = (field.options as any) || {};
                                  const items: { label: string; value: string }[] =
                                    Array.isArray(optionsRaw.items)
                                      ? optionsRaw.items
                                      : [];

                                  return (
                                    <FormItem>
                                      <FormLabel>
                                        {field.name}
                                        {field.required && <RequiredDot />}
                                      </FormLabel>
                                      <FormControl>
                                        <Select
                                          onValueChange={formField.onChange}
                                          value={
                                            (formField.value as string | undefined) ??
                                            ""
                                          }
                                        >
                                          <FormControl>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Seleccionar..." />
                                            </SelectTrigger>
                                          </FormControl>
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
                                      {field.description && (
                                        <p className="text-[0.8rem] text-muted-foreground">
                                          {field.description}
                                        </p>
                                      )}
                                      <FormMessage />
                                    </FormItem>
                                  );
                                }

                                if (fieldType === "File") {
                                  const rawUrl =
                                    formField.value as string | undefined;
                                  const href =
                                    rawUrl && rawUrl.startsWith("http")
                                      ? rawUrl
                                      : rawUrl
                                      ? `${API_BASE_URL}${rawUrl}`
                                      : "";
                                  const isUploading =
                                    uploadingFieldId === field.id;

                                  return (
                                    <FormItem>
                                      <FormLabel>
                                        {field.name}
                                        {field.required && <RequiredDot />}
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
                                                setUploadingFieldId(field.id);
                                                const url =
                                                  await uploadServiceFieldFile(
                                                    file
                                                  );
                                                formField.onChange(url);
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
                                      {field.description && (
                                        <p className="text-[0.8rem] text-muted-foreground">
                                          {field.description}
                                        </p>
                                      )}
                                      <FormMessage />
                                    </FormItem>
                                  );
                                }

                                if (fieldType === "Date") {
                                  const valueString =
                                    typeof formField.value === "string"
                                      ? formField.value
                                      : "";
                                  const dateValue = valueString
                                    ? parseDateFromString(valueString)
                                    : undefined;

                                  return (
                                    <FormItem className="flex flex-col">
                                      <FormLabel>
                                        {field.name}
                                        {field.required && <RequiredDot />}
                                      </FormLabel>
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <FormControl>
                                            <Button
                                              variant="outline"
                                              className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !dateValue &&
                                                  "text-muted-foreground"
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
                                                const formatted =
                                                  formatDateToString(date);
                                                formField.onChange(formatted);
                                              } else {
                                                formField.onChange("");
                                              }
                                            }}
                                          />
                                        </PopoverContent>
                                      </Popover>
                                      {field.description && (
                                        <p className="text-[0.8rem] text-muted-foreground">
                                          {field.description}
                                        </p>
                                      )}
                                      <FormMessage />
                                    </FormItem>
                                  );
                                }

                                return (
                                  <FormItem>
                                    <FormLabel>
                                      {field.name}
                                      {field.required && <RequiredDot />}
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        type={
                                          field.type === "Number"
                                            ? "number"
                                            : "text"
                                        }
                                        {...formField}
                                        value={formField.value || ""}
                                      />
                                    </FormControl>
                                    {field.description && (
                                      <p className="text-[0.8rem] text-muted-foreground">
                                        {field.description}
                                      </p>
                                    )}
                                    <FormMessage />
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                    </div>
                </div>
            )}

            {/* Valor del Servicio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        placeholder="0"
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

            {/* Gestión de Solicitud */}
            <div className="space-y-4 border rounded-md p-4 bg-gray-50/50">
              <h3 className="text-sm font-medium border-b pb-2">
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
            </div>
            
            {/* Botones de Acción */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createRequestMutation.isPending}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createRequestMutation.isPending}
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
          </form>
        </Form>
      </DialogContent>
      
      {/* Modal para crear cliente */}
      <CustomerFormDialog
        isOpen={isCustomerModalOpen}
        onOpenChange={setIsCustomerModalOpen}
        mode="create"
        onCancel={() => setIsCustomerModalOpen(false)}
        onSuccess={() => {
          // Recargar lista de clientes
          fetchApplicants().then((res) => {
             if (res?.data) {
                setApplicants(
                  res.data.map((item: ApplicantData) => ({
                    id: item.id,
                    fullName: item.attributes.field_full_name,
                    documentNumber: item.attributes.field_document_number,
                  }))
                );
             }
          });
        }}
      />
    </Dialog>
  );
}
