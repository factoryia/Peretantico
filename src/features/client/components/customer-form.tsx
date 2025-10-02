"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload } from "lucide-react";

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

import { type Customer, type FormMode } from "../types";
import { customerSchema } from "../schema";
import {
  createProfile,
  updateProfile,
  fetchDocumentTypeTaxonomy,
} from "../utils/customer";
import { DOCUMENT_TYPE_TAXONOMY_KEY, PROFILE_QUERY_KEY } from "../constants";
import { RequiredDot } from "@/components/common/required-dot";
import { departamento } from "../constants/colombia";

// --- Normalización de datos opcionales ---
function normalizeCustomerData(customer?: Customer) {
  if (!customer) return undefined;
  return {
    ...customer,
    email: customer.email || "",
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
    } else if (mode === "create") {
      form.reset();
      setSelectedDepto("");
    }
  }, [customer, mode, form]);

  const isFieldDisabled = () => mode === "view";

  // --- Envío de formulario ---
  const handleSubmit = async (values: z.infer<typeof customerSchema>) => {
    const cleanValues = { ...values };

    if (!cleanValues.email) delete cleanValues.email;

    try {
      if (mode === "create") {
        await createProfile(cleanValues);
        toast.success("Cliente creado correctamente");
      } else if (mode === "edit" && customer?.id) {
        await updateProfile(customer.id, cleanValues);
        toast.success("Cliente actualizado correctamente");
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

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4"
      >
        {/* Nombre */}
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Nombre completo <RequiredDot />
              </FormLabel>
              <p className="text-xs text-gray-500">
                Ingrese su nombre y apellido.
              </p>
              <FormControl>
                <Input
                  placeholder="Ej: Juan Pérez"
                  maxLength={100}
                  disabled={isFieldDisabled()}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tipo de documento */}
        <FormField
          control={form.control}
          name="documentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Tipo de documento <RequiredDot />
              </FormLabel>
              <p className="text-xs text-gray-500">
                Seleccione el tipo de documento.
              </p>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isFieldDisabled()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione tipo de documento" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {documentTypeOptions.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Número de documento */}
        <FormField
          control={form.control}
          name="documentNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Número de documento <RequiredDot />
              </FormLabel>
              <p className="text-xs text-gray-500">
                Ingrese su número de documento del seleccionado.
              </p>
              <FormControl>
                <Input
                  placeholder="Ej: 1234567890"
                  maxLength={15}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  disabled={isFieldDisabled()}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Teléfono */}
        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Teléfono de contacto <RequiredDot />
              </FormLabel>
              <p className="text-xs text-gray-500">
                Ingrese su teléfono de contacto.
              </p>
              <FormControl>
                <Input
                  placeholder="Ej: 3101234567"
                  maxLength={15}
                  pattern="[0-9]*"
                  inputMode="tel"
                  disabled={isFieldDisabled()}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Departamento */}
        <FormField
          control={form.control}
          name="department"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Departamento <RequiredDot />
              </FormLabel>
              <p className="text-xs text-gray-500">
                Seleccione el departamento de su residencia.
              </p>
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
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un departamento" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {departamento.map((d) => (
                    <SelectItem key={d.id} value={d.departamento}>
                      {d.departamento}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Municipio */}
        <FormField
          control={form.control}
          name="municipality"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Municipio <RequiredDot />
              </FormLabel>
              <p className="text-xs text-gray-500">
                Seleccione el municipio de su residencia.
              </p>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={!selectedDepto || isFieldDisabled()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un municipio" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {departamento
                    .find((d) => d.departamento === selectedDepto)
                    ?.ciudades.map((ciudad) => (
                      <SelectItem key={ciudad} value={ciudad}>
                        {ciudad}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Dirección */}
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>
                Dirección residencia <RequiredDot />
              </FormLabel>
              <p className="text-xs text-gray-500">
                Ingrese su dirección de residencia.
              </p>
              <FormControl>
                <Input
                  placeholder="Ej: Calle 123 #45-67, Bogotá"
                  maxLength={200}
                  disabled={isFieldDisabled()}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="photo_document"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>
                Documento de identidad <RequiredDot />
              </FormLabel>
              <p className="text-xs text-gray-500">
                Cargue una imagen o PDF de su documento de identidad por ambas
                caras.
              </p>

              <FormControl>
                <label
                  htmlFor="photo_document"
                  className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 cursor-pointer transition"
                  onDragOver={(e) => {
                    e.preventDefault(); // necesario para permitir drop
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const files = Array.from(e.dataTransfer.files);
                    field.onChange(files); // guardamos los archivos arrastrados
                  }}
                >
                  <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2 text-center">
                    Haga clic para subir o arrastre el archivo aquí
                  </p>

                  <Input
                    id="photo_document"
                    type="file"
                    className="hidden"
                    multiple
                    accept="image/*,application/pdf"
                    disabled={isFieldDisabled()}
                    onChange={(e) => {
                      const files = e.target.files
                        ? Array.from(e.target.files)
                        : [];
                      field.onChange(files);
                    }}
                  />
                </label>
              </FormControl>

              {/* Lista de archivos seleccionados */}
              {field.value &&
                Array.isArray(field.value) &&
                field.value.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-gray-600">
                    {field.value.map((file: File, idx: number) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between border rounded px-2 py-1"
                      >
                        <span className="truncate max-w-[200px]">
                          {file.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

              <FormMessage />
            </FormItem>
          )}
        />

        {/* Botones */}
        <div className="md:col-span-2 flex justify-end gap-2 mt-4">
          {mode !== "view" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || !isValid}>
                {isSubmitting
                  ? "Guardando..."
                  : mode === "create"
                  ? "Crear Cliente"
                  : "Guardar Cambios"}
              </Button>
            </>
          ) : (
            <Button type="button" onClick={onCancel}>
              Cerrar
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
