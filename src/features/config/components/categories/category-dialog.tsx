import { toast } from "sonner";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Loader, Plus } from "lucide-react";
import { isAxiosError, type AxiosError } from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Category } from "@/features/config/types";
import { Button } from "@/components/ui/button";
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
import {
  categorySchema,
  type CategoryFormValues,
} from "@/features/config/schemas";
import {
  createCategory,
  updateCategory,
} from "@/features/config/utils/category";
import { CATEGORY_QUERY_KEY } from "@/features/config/constants/query-keys";

interface CategoryDialogProps {
  open: boolean;
  editingCategory: Category | null;
  onOpenChange: (open: boolean) => void;
  setEditingCategory: (value: Category | null) => void;
  setIsDialogOpen: (value: boolean) => void;
}

export function CategoryDialog({
  open,
  editingCategory,
  onOpenChange,
  setEditingCategory,
  setIsDialogOpen,
}: CategoryDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
      status: "activo",
    },
  });

  const { isValid, isSubmitting } = form.formState;

  useEffect(() => {
    if (!editingCategory) {
      form.reset({
        name: "",
        description: "",
        status: "activo",
      });
    } else {
      form.reset({
        name: editingCategory.name,
        description: editingCategory.description ?? "",
        status: editingCategory.status,
      });
    }
  }, [editingCategory, form]);

  const onSubmit = async (data: CategoryFormValues) => {
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.uuid, data);

        toast.success("Categoría actualizada", {
          description: `La categoría "${data.name}" fue actualizada correctamente.`,
        });
        setEditingCategory(null);
      } else {
        await createCategory(data);
        toast.success("Categoría creado", {
          description: `La categoría "${data.name}" fue creada exitosamente.`,
        });
      }

      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [CATEGORY_QUERY_KEY] });
      form.reset();
    } catch (error) {
      const err = error as AxiosError;

      if (err instanceof isAxiosError) {
        toast.error("Error al crear la categoría", {
          description: err.message,
        });
      } else {
        toast.error("Error al crear la categoría", {
          description:
            "Ocurrió un error inesperado al intentar crear la categoría.",
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Categoría
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {editingCategory ? "Editar Categoría" : "Nueva Categoría"}
          </DialogTitle>
          <DialogDescription>
            {editingCategory
              ? "Modifica los datos de la categoría existente."
              : "Completa los datos para crear una nueva categoría."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la categoría</FormLabel>
                  <FormControl>
                    <Input placeholder="Ingrese el nombre" {...field} />
                  </FormControl>
                  <FormDescription>
                    Nombre identificador de la categoría (único).
                  </FormDescription>
                  <FormMessage />
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
                      placeholder="Descripción opcional"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Información adicional sobre el propósito o detalle de la
                    categoría.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
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
                  <FormDescription>
                    Define si la categoría está disponible para ser usada en
                    servicios.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={!isValid || isSubmitting}>
                {isSubmitting && <Loader className="animate-spin" />}
                {editingCategory
                  ? isSubmitting
                    ? "Actualizando..."
                    : "Actualizar"
                  : isSubmitting
                  ? "Creando..."
                  : "Crear"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
