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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Service } from "../../types";
import { serviceSchema, type ServiceFormValues } from "../../schemas";
import { Loader, Plus } from "lucide-react";
import { RequiredDot } from "@/components/common/required-dot";
import { toast } from "sonner";
import { isAxiosError, type AxiosError } from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { createService, updateService } from "../../utils/service";

interface Props {
  open: boolean;
  categoryId: string;
  editingService: Service | null;
  onOpenChange: (open: boolean) => void;
  setEditingService: (value: Service | null) => void;
  setIsDialogOpen: (value: boolean) => void;
}

export const ServiceDialog = ({
  open,
  categoryId,
  editingService,
  onOpenChange,
  setIsDialogOpen,
  setEditingService,
}: Props) => {
  const queryClient = useQueryClient();

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      categoryId: categoryId,
      name: editingService?.name || "",
      description: editingService?.description || "",
      status: editingService?.status || "activo",
    },
  });

  const { isValid, isSubmitting } = form.formState;

  useEffect(() => {
    if (!editingService) {
      form.reset({
        categoryId,
        name: "",
        description: "",
        status: "activo",
      });
    } else {
      form.reset({
        categoryId,
        name: editingService.name,
        description: editingService.description,
        status: editingService.status,
      });
    }
  }, [categoryId, editingService, form]);

  const onSubmit = async (data: ServiceFormValues) => {
    try {
      if (editingService) {
        await updateService(editingService.id, data);

        toast.success("Servicio actualizado", {
          description: `El servicio "${data.name}" fue actualizado correctamente.`,
        });
        setEditingService(null);
      } else {
        await createService(data);
        toast.success("Servicio creado", {
          description: `El servicio "${data.name}" fue creado exitosamente.`,
        });
      }

      setIsDialogOpen(false);
      await queryClient.invalidateQueries({
        queryKey: ["services", categoryId],
      });
      form.reset();
    } catch (error) {
      const err = error as AxiosError;

      if (err instanceof isAxiosError) {
        toast.error("Error al crear el servicio", {
          description: err.message,
        });
      } else {
        toast.error("Error al crear el servicio", {
          description:
            "Ocurrió un error inesperado al intentar crear el servicio.",
        });
      }
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
      <DialogContent className="sm:max-w-[425px]">
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
