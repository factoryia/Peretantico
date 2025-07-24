"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
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
import {
  type Customer,
  type FormMode,
  type CustomerFormValues,
} from "../types"; // Updated imports
import { customerSchema } from "../schema"; // Updated import
import { useQueryClient } from "@tanstack/react-query"; // New import
import { createProfile, updateProfile } from "../utils/customer";
import { useQuery } from "@tanstack/react-query";
import {
  fetchGenderTaxonomy,
  fetchParentTypeTaxonomy,
  fetchDocumentTypeTaxonomy,
} from "../utils/customer";
import { toast } from "sonner"; // o tu sistema de notificaciones
import {
  DOCUMENT_TYPE_TAXONOMY_KEY,
  GENDER_TAXONOMY_KEY,
  PARENT_TYPE_TAXONOMY_KEY,
  PROFILE_QUERY_KEY,
} from "../constants";
import { RequiredDot } from "@/components/common/required-dot";
import { RequiredFormMessage } from "@/components/common/form-message";

interface CustomerFormProps {
  customer?: Customer;
  mode: FormMode;
  onCancel: () => void;
}

export function CustomerForm({ customer, mode, onCancel }: CustomerFormProps) {
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer || {
      fullName: "",
      documentType: "",
      documentNumber: "",
      phoneNumber: "",
      email: undefined,
      department: "",
      municipality: "",
      birthDate: undefined, // Changed from dateOfBirth to birthDate
      gender: undefined,
      parentStatus: undefined,
    },
  });

  // Set form data when customer prop changes (for edit/view mode)
  useEffect(() => {
    if (customer && mode !== "create") {
      form.reset(customer);
    } else if (mode === "create") {
      form.reset();
    }
  }, [customer, mode, form]);

  const isFieldDisabled = (fieldName: keyof CustomerFormValues) => {
    if (mode === "view") return true;
    if (mode === "edit" && fieldName === "documentNumber") return true;
    return false;
  };
  const handleSubmit = async (values: z.infer<typeof customerSchema>) => {
    try {
      if (mode === "create") {
        await createProfile(values);
        toast.success("Cliente creado correctamente");
      } else if (mode === "edit" && customer?.id) {
        await updateProfile(customer.id, values);
        toast.success("Cliente actualizado correctamente");
      }

      queryClient.invalidateQueries({ queryKey: [PROFILE_QUERY_KEY] });
      onCancel();
      form.reset();
    } catch (error) {
      toast.error("Ocurrió un error al enviar el formulario");
    }
  };
  const { isSubmitting, isValid } = form.formState;

  const { data: genderOptions = [] } = useQuery({
    queryKey: [GENDER_TAXONOMY_KEY],
    queryFn: fetchGenderTaxonomy,
  });

  const { data: parentTypeOptions = [] } = useQuery({
    queryKey: [PARENT_TYPE_TAXONOMY_KEY],
    queryFn: fetchParentTypeTaxonomy,
  });

  const { data: documentTypeOptions = [] } = useQuery({
    queryKey: [DOCUMENT_TYPE_TAXONOMY_KEY],
    queryFn: fetchDocumentTypeTaxonomy,
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4x"
      >
        <FormField
          control={form.control}
          name="fullName"
          disabled={isFieldDisabled("fullName")}
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel htmlFor="fullName">
                Nombre completo <RequiredDot />
              </FormLabel>
              <FormControl>
                <Input
                  id="fullName"
                  placeholder="Ej: Juan Pérez"
                  maxLength={100}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="documentType"
          disabled={isFieldDisabled("documentType")}
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel htmlFor="documentType">
                Tipo de documento <RequiredDot />
              </FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={field.disabled}
              >
                <FormControl>
                  <SelectTrigger id="documentType" className="w-full h-10">
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
        <FormField
          control={form.control}
          name="documentNumber"
          disabled={isFieldDisabled("documentNumber")}
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel htmlFor="documentNumber">
                Número de documento <RequiredDot />
              </FormLabel>
              <FormControl>
                <Input
                  id="documentNumber"
                  placeholder="Ej: 1234567890"
                  maxLength={15}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="birthDate" // Changed from dateOfBirth
          disabled={isFieldDisabled("birthDate")}
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel htmlFor="birthDate">Fecha de nacimiento</FormLabel>
              {/* <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full h-10 justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                      disabled={field.disabled}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? (
                        format(new Date(field.value), "dd/MM/yyyy")
                      ) : (
                        <span>DD/MM/AAAA</span>
                      )}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={(date) =>
                      field.onChange(
                        date ? format(date, "yyyy-MM-dd") : undefined
                      )
                    }
                    initialFocus
                    captionLayout="dropdown-buttons"
                    fromYear={1900}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover> */}
              <Input type="date" {...field} />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="gender"
          disabled={isFieldDisabled("gender")}
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel htmlFor="gender">Sexo</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={field.disabled}
              >
                <FormControl>
                  <SelectTrigger id="gender" className="w-full h-10">
                    <SelectValue placeholder="Seleccione sexo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {genderOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
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
          name="phoneNumber"
          disabled={isFieldDisabled("phoneNumber")}
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel htmlFor="phoneNumber">
                Teléfono de contacto <RequiredDot />
              </FormLabel>
              <FormControl>
                <Input
                  id="phoneNumber"
                  placeholder="Ej: 3101234567"
                  maxLength={15}
                  pattern="[0-9]*"
                  inputMode="tel"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          disabled={isFieldDisabled("email")}
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel htmlFor="email">Correo electrónico</FormLabel>
              <FormControl>
                <Input
                  id="email"
                  type="email"
                  placeholder="Ej: ejemplo@correo.com"
                  maxLength={100}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="department"
          disabled={isFieldDisabled("department")}
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel htmlFor="department">
                Departamento de residencia <RequiredDot />
              </FormLabel>
              <FormControl>
                <Input
                  id="department"
                  placeholder="Ej: Cundinamarca"
                  maxLength={100}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="municipality"
          disabled={isFieldDisabled("municipality")}
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel htmlFor="municipality">
                Municipio de residencia <RequiredDot />
              </FormLabel>
              <FormControl>
                <Input
                  id="municipality"
                  placeholder="Ej: Bogotá"
                  maxLength={100}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="parentStatus"
          disabled={isFieldDisabled("parentStatus")}
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel htmlFor="parentStatus">¿Padre o madre?</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={field.disabled}
              >
                <FormControl>
                  <SelectTrigger id="parentStatus" className="w-full h-10">
                    <SelectValue placeholder="Seleccione opción" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {parentTypeOptions.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
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
          name="address"
          disabled={isFieldDisabled("address")}
          render={({ field }) => (
            <FormItem className="space-y-2 md:col-span-2">
              <FormLabel htmlFor="address">
                Dirección residencia <RequiredDot />
              </FormLabel>
              <FormControl>
                <Input
                  id="address"
                  placeholder="Ej: Calle 123 #45-67, Bogotá"
                  maxLength={200}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {mode !== "view" && (
          <div className="col-span-2">
            <RequiredFormMessage />
          </div>
        )}

        {mode !== "view" && (
          <div className="md:col-span-2 flex justify-end gap-2 mt-4">
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
          </div>
        )}
        {mode === "view" && (
          <div className="md:col-span-2 flex justify-end gap-2 mt-4">
            <Button type="button" onClick={onCancel}>
              Cerrar
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
