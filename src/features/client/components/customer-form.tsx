"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Upload,
  X,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { type Customer, type FormMode, type Attachment } from "../types";
import { customerSchema } from "../schema";
import {
  createProfile,
  updateProfile,
  fetchDocumentTypeTaxonomy,
  uploadIdentityDocument,
  fetchProfileById,
  deleteAttachment,
} from "../utils/customer";
import { DOCUMENT_TYPE_TAXONOMY_KEY, PROFILE_QUERY_KEY } from "../constants";
import { RequiredDot } from "@/components/common/required-dot";
import { departamento } from "../constants/colombia";
import { API_BASE_URL } from "@/features/auth/constants";

// --- Normalización de datos opcionales ---
function normalizeCustomerData(customer?: Customer) {
  if (!customer) return undefined;
  return {
    ...customer,
    email: customer.email || "",
    photo_document: customer.photo_document || undefined,
  };
}

interface CustomerFormProps {
  customer?: Customer;
  mode: FormMode;
  onCancel: () => void;
}

export function CustomerForm({ customer, mode, onCancel }: CustomerFormProps) {
  const queryClient = useQueryClient();
  const [selectedDepto, setSelectedDepto] = useState<string>("");
  const [attachments, setAttachments] = useState<Attachment[]>(
    customer?.attachments ?? []
  );

  const form = useForm<z.infer<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer
      ? normalizeCustomerData(customer)
      : {
          fullName: "",
          documentType: "",
          documentNumber: "",
          phoneNumber: "",
          email: "",
          department: "",
          municipality: "",
          address: "",
          photo_document: undefined,
        },
  });

  // Pre-cargar valores al editar/ver
  useEffect(() => {
    if (customer && mode !== "create") {
      const normalizedCustomer = normalizeCustomerData(customer);
      form.reset(normalizedCustomer);
      if (normalizedCustomer?.department) {
        setSelectedDepto(normalizedCustomer.department);
      }
      setAttachments(customer.attachments ?? []);
    } else if (mode === "create") {
      form.reset();
      setSelectedDepto("");
      setAttachments([]);
    }
  }, [customer, mode, form]);

  const isFieldDisabled = () => mode === "view";

  // --- Envío de formulario ---
  const handleSubmit = async (values: z.infer<typeof customerSchema>) => {
    const cleanValues = { ...values };
    const files =
      Array.isArray(cleanValues.photo_document) &&
      cleanValues.photo_document.length > 0
        ? cleanValues.photo_document
        : [];

    if (!cleanValues.email) delete cleanValues.email;
    delete cleanValues.photo_document;

    try {
      let profileId = customer?.id ?? "";

      if (mode === "create") {
        const response = await createProfile(cleanValues);
        profileId =
          (response?.data as { id?: string } | undefined)?.id ?? profileId;
        toast.success("Cliente creado correctamente");
      } else if (mode === "edit" && customer?.id) {
        await updateProfile(customer.id, cleanValues);
        profileId = customer.id;
        toast.success("Cliente actualizado correctamente");
      }

      if (mode === "create" && profileId && files.length > 0) {
        await uploadIdentityDocument(profileId, files[0] as File);
        toast.success("Documento de identidad cargado");
      }

      queryClient.invalidateQueries({ queryKey: [PROFILE_QUERY_KEY] });
      onCancel();
      form.reset();
    } catch {
      toast.error("Ocurrió un error al enviar el formulario");
    }
  };

  const { isSubmitting, isValid } = form.formState;

  // Obtener tipos de documento
  const { data: documentTypeOptions = [] } = useQuery({
    queryKey: [DOCUMENT_TYPE_TAXONOMY_KEY],
    queryFn: fetchDocumentTypeTaxonomy,
  });

  const sectionHeader = (icon: any, title: string) => {
    const Icon = icon;
    return (
      <div className="flex items-center gap-2.5 pb-2 mb-4 border-b border-gray-100">
        <Icon className="size-5 text-blue-600" />
        <h3 className="text-[#6B7280] text-[12.8px] uppercase font-bold tracking-wide">
          {title}
        </h3>
      </div>
    );
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-8 animate-in fade-in duration-500 font-['Poppins',sans-serif]"
      >
        <div className="grid grid-cols-1 gap-10">
          {/* PERSONAL SECTION */}
          <div className="space-y-6">
            {sectionHeader(User, "Datos de Identificación")}

            <div className="space-y-5">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Nombre Completo <RequiredDot />
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Juan Pérez"
                        className="h-10 bg-slate-50/50 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm"
                        disabled={isFieldDisabled()}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-[10px] font-bold" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="documentType"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Tipo Doc. <RequiredDot />
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isFieldDisabled()}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 bg-slate-50/50 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 transition-all font-medium text-sm">
                            <SelectValue placeholder="Tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                          {documentTypeOptions.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="documentNumber"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Número <RequiredDot />
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="12345..."
                          className="h-10 bg-slate-50/50 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono font-bold text-slate-700 text-sm"
                          disabled={isFieldDisabled()}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* COMMUNICATION & LOCATION SECTION (STACKED) */}
          <div className="space-y-10">
            <div className="space-y-6">
              {sectionHeader(Phone, "Comunicación")}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Teléfono / Celular <RequiredDot />
                      </FormLabel>
                      <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 p-1 bg-white rounded-md border border-gray-100 shadow-2xs">
                          <Phone className="h-3 w-3 text-blue-500 group-focus-within:text-blue-600 transition-colors" />
                        </div>
                        <FormControl>
                          <Input
                            placeholder="Ej: 3101234567"
                            className="pl-11 h-10 bg-slate-50/50 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm"
                            disabled={isFieldDisabled()}
                            {...field}
                          />
                        </FormControl>
                      </div>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Correo Electrónico
                      </FormLabel>
                      <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 p-1 bg-white rounded-md border border-gray-100 shadow-2xs">
                          <Mail className="h-3 w-3 text-blue-500 group-focus-within:text-blue-600 transition-colors" />
                        </div>
                        <FormControl>
                          <Input
                            placeholder="cliente@ejemplo.com"
                            className="pl-11 h-10 bg-slate-50/50 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm"
                            disabled={isFieldDisabled()}
                            {...field}
                          />
                        </FormControl>
                      </div>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-6">
              {sectionHeader(MapPin, "Ubicación")}
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Dpto <RequiredDot />
                        </FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedDepto(value);
                            form.setValue("municipality", "");
                          }}
                          disabled={isFieldDisabled()}
                        >
                          <FormControl>
                            <SelectTrigger className="h-10 bg-slate-50/50 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 transition-all font-medium text-sm">
                              <SelectValue placeholder="Dpto" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl border-gray-100 shadow-xl max-h-[250px]">
                            {departamento.map((d) => (
                              <SelectItem key={d.id} value={d.departamento}>
                                {d.departamento}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[10px] font-bold" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="municipality"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Municipio <RequiredDot />
                        </FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={!selectedDepto || isFieldDisabled()}
                        >
                          <FormControl>
                            <SelectTrigger className="h-10 bg-slate-50/50 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 transition-all font-medium text-sm">
                              <SelectValue placeholder="Muni" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl border-gray-100 shadow-xl max-h-[250px]">
                            {departamento
                              .find((d) => d.departamento === selectedDepto)
                              ?.ciudades.map((ciudad) => (
                                <SelectItem key={ciudad} value={ciudad}>
                                  {ciudad}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[10px] font-bold" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Dirección Exacta <RequiredDot />
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: Calle 123 #45-67..."
                          className="h-10 bg-slate-50/50 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm"
                          disabled={isFieldDisabled()}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* DOCUMENTATION SECTION */}
          <div className="space-y-6">
            {sectionHeader(FileText, "Documentación Soporte")}

            <FormField
              control={form.control}
              name="photo_document"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <FormControl>
                    <div className="group relative">
                      <label
                        htmlFor="photo_document"
                        className={`flex items-center gap-5 border border-dashed rounded-xl p-5 transition-all duration-300 ${
                          isFieldDisabled()
                            ? "bg-slate-50 border-slate-200 cursor-not-allowed"
                            : "bg-slate-50/50 border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer"
                        }`}
                      >
                        <div className="p-3 bg-white rounded-lg shadow-2xs text-blue-500 border border-slate-100 group-hover:scale-105 transition-transform">
                          <Upload className="w-5 h-5" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-xs font-bold text-slate-700 mb-0.5 uppercase tracking-tight">
                            {field.value && field.value.length > 0
                              ? "Añadir más archivos"
                              : "Cargar Documento de Identidad"}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium">
                            Formatos permitidos: JPG, PNG, PDF. Imagen por ambas
                            caras.
                          </p>
                        </div>

                        <Input
                          id="photo_document"
                          type="file"
                          className="hidden"
                          multiple
                          accept="image/*,application/pdf"
                          disabled={isFieldDisabled()}
                          onChange={async (e) => {
                            const files = e.target.files
                              ? Array.from(e.target.files)
                              : [];
                            field.onChange(files);
                            if (files.length > 0) {
                              const first = files[0] as File;
                              if (mode !== "create" && customer?.id) {
                                try {
                                  await uploadIdentityDocument(customer.id, first);
                                  toast.success("Documento de identidad cargado");
                                  try {
                                    const refreshed = await fetchProfileById(customer.id);
                                    if (Array.isArray(refreshed?.attachments)) {
                                      setAttachments(refreshed.attachments);
                                    }
                                  } catch {}
                                } catch {
                                  toast.error("Error al subir el documento");
                                }
                              } else {
                                toast.info(
                                  "El documento se subirá al crear el cliente"
                                );
                              }
                            }
                          }}
                        />
                      </label>
                    </div>
                  </FormControl>

                  {/* File List */}
                  {field.value &&
                    Array.isArray(field.value) &&
                    field.value.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {field.value.map((file: File, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 p-2.5 bg-white border border-slate-200 rounded-lg shadow-3xs group hover:border-blue-200 transition-colors"
                          >
                            <div className="p-2 bg-blue-50 rounded text-blue-600">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-bold text-slate-800 truncate">
                                {file.name}
                              </p>
                              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                            {!isFieldDisabled() && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newFiles = [...field.value];
                                  newFiles.splice(idx, 1);
                                  field.onChange(newFiles);
                                }}
                                className="text-slate-300 hover:text-red-500 transition-colors p-1"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                  <FormMessage className="text-[10px] font-bold" />
                </FormItem>
              )}
            />
            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map((att) => {
                  const url =
                    att.url.startsWith("http")
                      ? att.url
                      : `${API_BASE_URL}${att.url}`;
                  return (
                    <div
                      key={att.id}
                      className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <FileText className="w-5 h-5 text-blue-600 mr-3" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {att.fileName || "Documento"}
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">
                          {att.mimeType || "Archivo"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 font-bold text-xs uppercase"
                        onClick={() => {
                          if (url) window.open(url, "_blank");
                        }}
                      >
                        Ver
                      </Button>
                      {mode === "edit" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 font-bold text-xs uppercase"
                          onClick={async () => {
                            if (!customer?.id) return;
                            try {
                              await deleteAttachment(customer.id, att.id);
                              setAttachments((prev) =>
                                prev.filter((a) => a.id !== att.id)
                              );
                              toast.success("Adjunto eliminado");
                            } catch {
                              toast.error("Error al eliminar el adjunto");
                            }
                          }}
                        >
                          Eliminar
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 mt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-10 px-6 rounded-lg text-slate-500 font-bold text-[11px] uppercase tracking-widest hover:bg-slate-100 transition-all"
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting || !isValid}
            className={`h-10 px-8 rounded-lg font-bold text-[11px] uppercase tracking-widest transition-all shadow-sm ${
              mode === "create"
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-slate-900 hover:bg-slate-800 text-white"
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enviando...
              </span>
            ) : mode === "create" ? (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Crear Cliente
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Guardar Cambios
              </span>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
