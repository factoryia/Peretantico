import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input as NumberInput } from "@/components/ui/input";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Service } from "../../types";
import { serviceSchema, type ServiceFormValues } from "../../schemas";
import { Loader, Plus, Trash2 } from "lucide-react";
import { RequiredDot } from "@/components/common/required-dot";
import { toast } from "sonner";
import { useEffect } from "react";
import { RequiredFormMessage } from "@/components/common/form-message";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

interface Props {
  open: boolean;
  editingService: Service | null;
  onOpenChange: (open: boolean) => void;
  setEditingService: (value: Service | null) => void;
  setIsDialogOpen: (value: boolean) => void;
}

export const ServiceDialog = ({
  open,
  editingService,
  onOpenChange,
  setIsDialogOpen,
  setEditingService,
}: Props) => {
  const createServiceMutation = useMutation(api.services.create);
  const updateServiceMutation = useMutation(api.services.update);

  const form = useForm({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: editingService?.name || "",
      description: editingService?.description || "",
      price: editingService?.price || 0,
      status: editingService?.status || "activo",
      fields:
        editingService?.fields?.map((f) => ({
          id: f.id,
          name: f.name,
          code: f.code ?? "",
          description: f.description ?? "",
          type: f.type,
          required: f.required,
          multiple: f.multiple,
          order: f.order,
          status: f.status,
        })) ?? [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "fields",
  });

  const { isValid, isSubmitting } = form.formState;
  const watchedFields = form.watch("fields") || [];

  useEffect(() => {
    if (!editingService) {
      form.reset({
        name: "",
        description: "",
        price: 0,
        status: "activo",
        fields: [],
      });
    } else {
      form.reset({
        name: editingService.name,
        description: editingService.description,
        price: editingService.price,
        status: editingService.status,
        fields:
          editingService.fields?.map((f) => ({
            id: f.id,
            name: f.name,
            code: f.code ?? "",
            description: f.description ?? "",
            type: f.type,
            required: f.required,
            multiple: f.multiple,
            order: f.order,
            status: f.status,
          })) ?? [],
      });
    }
  }, [editingService, form]);

  // Sin categorías en el nuevo modelo

  const onSubmit = async (data: ServiceFormValues) => {
    try {
      const payloadFields = (data.fields ?? []).map((field, index) => ({
        id: field.id ? (field.id as Id<"serviceFields">) : undefined,
        name: field.name,
        code: field.code && field.code.length > 0 ? field.code : undefined,
        description: field.description ?? undefined,
        type: field.type,
        required: field.required ?? false,
        multiple: field.multiple ?? false,
        order:
          typeof field.order === "number" && !Number.isNaN(field.order)
            ? field.order
            : index,
        options: undefined,
        status: field.status ?? true,
        settings: undefined,
      }));

      if (editingService) {
        await updateServiceMutation({
          id: editingService.id as Id<"services">,
          name: data.name,
          description: data.description ?? undefined,
          price: data.price,
          status: data.status === "activo",
          fields: payloadFields,
        });

        toast.success("Servicio actualizado", {
          description: `El servicio "${data.name}" fue actualizado correctamente.`,
        });
        setEditingService(null);
      } else {
        await createServiceMutation({
          name: data.name,
          description: data.description ?? undefined,
          price: data.price,
          status: data.status === "activo",
          fields: payloadFields,
        });
        toast.success("Servicio creado", {
          description: `El servicio "${data.name}" fue creado exitosamente.`,
        });
      }

      setIsDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar el servicio", {
        description: "Ocurrió un error inesperado.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Nuevo Servicio
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingService ? "Editar Servicio" : "Nuevo Servicio"}
          </DialogTitle>
          <DialogDescription>
            {editingService
              ? "Modifica los datos del servicio existente."
              : "Completa los datos para crear un nuevo servicio."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Sin categoría: el servicio ya no depende de categorías */}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nombre del servicio <RequiredDot />
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ingrese el nombre del servicio"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <FormDescription>
                    Nombre que identifica el tipo de servicio.
                  </FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descripción detallada del servicio"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <FormDescription>
                    Descripción detallada del servicio (si aplica).
                  </FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Precio base <RequiredDot />
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Ingrese el precio del servicio"
                      {...field}
                      value={Number(field.value ?? 0)}
                      onChange={(e) =>
                        field.onChange(Number(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                  <FormDescription>
                    Precio base del servicio sin impuestos.
                  </FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Estado <RequiredDot />
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="inactivo">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  <FormDescription>
                    Permite activar o inactivar el tipo de servicio sin
                    eliminarlo.
                  </FormDescription>
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <FormLabel>Campos del servicio</FormLabel>
                  <p className="text-xs text-muted-foreground">
                    Define qué datos adicionales se solicitarán para este
                    servicio.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      name: "",
                      code: "",
                      description: "",
                      type: "Text",
                      required: false,
                      multiple: false,
                      order: fields.length,
                      status: true,
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Campo
                </Button>
              </div>

              {fields.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No hay campos configurados para este servicio.
                </p>
              ) : (
                <div className="space-y-3">
                  {fields.map((fieldItem, index) => {
                    const currentField =
                      (watchedFields as any)[index] ?? {};

                    return (
                      <div
                        key={fieldItem.id ?? index}
                        className="border rounded-lg bg-muted/40 p-3 space-y-3 shadow-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              Campo {index + 1}
                            </span>
                            {currentField?.type && (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                                {currentField.type}
                              </span>
                            )}
                            {currentField?.required && (
                              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                                Requerido
                              </span>
                            )}
                            {currentField?.multiple && (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                Múltiple
                              </span>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <FormField
                            control={form.control}
                            name={`fields.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nombre</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Nombre visible"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`fields.${index}.code`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Código</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Código interno"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`fields.${index}.type`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tipo</FormLabel>
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Tipo de dato" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Text">Texto</SelectItem>
                                    <SelectItem value="Number">
                                      Número
                                    </SelectItem>
                                    <SelectItem value="Date">Fecha</SelectItem>
                                    <SelectItem value="Boolean">
                                      Booleano
                                    </SelectItem>
                                    <SelectItem value="Select">
                                      Select
                                    </SelectItem>
                                    <SelectItem value="File">Archivo</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name={`fields.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descripción</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Descripción del campo"
                                  className="resize-none"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 gap-3">
                          <FormField
                            control={form.control}
                            name={`fields.${index}.required`}
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={(v) =>
                                      field.onChange(Boolean(v))
                                    }
                                  />
                                </FormControl>
                                <FormLabel>Requerido</FormLabel>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`fields.${index}.multiple`}
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={(v) =>
                                      field.onChange(Boolean(v))
                                    }
                                  />
                                </FormControl>
                                <FormLabel>Múltiple</FormLabel>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`fields.${index}.order`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Orden</FormLabel>
                                <FormControl>
                                  <NumberInput
                                    type="number"
                                    value={Number(field.value ?? 0)}
                                    onChange={(e) =>
                                      field.onChange(Number(e.target.value) || 0)
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`fields.${index}.status`}
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={(v) =>
                                      field.onChange(Boolean(v))
                                    }
                                  />
                                </FormControl>
                                <FormLabel>Activo</FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <RequiredFormMessage />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button disabled={!isValid || isSubmitting}>
                {isSubmitting && <Loader className="animate-spin" />}
                {editingService ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
