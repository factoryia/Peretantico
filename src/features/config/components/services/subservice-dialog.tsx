import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useEffect } from "react";
import { subserviceSchema, type SubserviceFormValues } from "../../schemas";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createSubservice, updateSubservice } from "../../utils/subservice";
import type { Subservice } from "../../types";
import { isAxiosError, type AxiosError } from "axios";
import { SUBSERVICE_QUERY_KEY } from "../../constants/query-keys";
import { RequiredDot } from "@/components/common/required-dot";
import { RequiredFormMessage } from "@/components/common/form-message";

interface Props {
  selectedCategoryName: string;
  selectedServiceName: string;

  open: boolean;
  selectedServiceId: string;
  selectedCategoryId: string;
  setDialogOpen: (value: boolean) => void;
  onOpenChange: (open: boolean) => void;
  isEdit: boolean;
  editingSubservice: Subservice | null;
  setEditingSubservice: (value: Subservice | null) => void;
}

export function SubserviceDialog({
  open,
  isEdit,
  editingSubservice,
  selectedServiceId,
  selectedCategoryName,
  selectedServiceName,
  onOpenChange,
  setDialogOpen,
  setEditingSubservice,
}: Props) {
  const queryClient = useQueryClient();

  const form = useForm<SubserviceFormValues>({
    resolver: zodResolver(subserviceSchema),
    defaultValues: {
      nombre: "",
      descripcion: "",
      valor: "",
      valorPrioridad: "",
      estado: "activo",
    },
  });

  const { isValid, isSubmitting } = form.formState;

  useEffect(() => {
    if (editingSubservice) {
      form.reset({
        nombre: editingSubservice.nombre,
        descripcion: editingSubservice.descripcion,
        estado: editingSubservice.estado,
        valor: editingSubservice.valor,
        valorPrioridad: editingSubservice.valorPrioridad,
      });
    } else {
      form.reset({
        nombre: "",
        descripcion: "",
        valor: "",
        valorPrioridad: "",
        estado: "activo",
      });
    }
  }, [editingSubservice, open]);

  const handleSave = async (data: SubserviceFormValues) => {
    try {
      if (editingSubservice) {
        await updateSubservice(editingSubservice.id, data);

        toast.success("Subservicio actualizado", {
          description: `El subservicio "${data.nombre}" fue actualizado correctamente.`,
        });
        setEditingSubservice(null);
      } else {
        await createSubservice(data, selectedServiceId);
        toast.success("Subservicio creado", {
          description: `El subservicio "${data.nombre}" fue creado exitosamente.`,
        });
      }

      setDialogOpen(false);
      queryClient.invalidateQueries({
        queryKey: [SUBSERVICE_QUERY_KEY, selectedServiceId],
      });
      form.reset();
    } catch (error) {
      const err = error as AxiosError;

      if (err instanceof isAxiosError) {
        toast.error("Error al crear el subservicio", {
          description: err.message,
        });
      } else {
        toast.error("Error al crear el subservicio", {
          description:
            "Ocurrió un error inesperado al intentar crear el subservicio.",
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Subservicio" : "Nuevo Subservicio"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifica los datos del subservicio existente."
              : "Completa los datos para crear un nuevo subservicio."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSave)}
            className="space-y-4"
            autoComplete="off"
          >
            <div className="grid grid-cols-2 gap-4">
              <FormItem>
                <FormLabel>Categoría</FormLabel>
                <FormControl>
                  <Input
                    value={selectedCategoryName}
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
                  />
                </FormControl>
                <FormDescription>Categoría principal asociada.</FormDescription>
              </FormItem>
              <FormItem>
                <FormLabel>Servicio</FormLabel>
                <FormControl>
                  <Input
                    value={selectedServiceName}
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
                  />
                </FormControl>
                <FormDescription>Servicio principal asociado.</FormDescription>
              </FormItem>
            </div>
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nombre del Subservicio <RequiredDot />
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Solicitud registros civiles"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <FormDescription>
                    Título o nombre identificador del subservicio.
                  </FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descripción detallada" {...field} />
                  </FormControl>
                  <FormMessage />
                  <FormDescription>
                    Descripción más detallada del subservicio, si se requiere.
                  </FormDescription>
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              
              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Estado <RequiredDot />
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="data-[size=default]:h-11">
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
                      Define si está disponible o no.
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="valor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Valor <RequiredDot />
                    </FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="15000" {...field} />
                    </FormControl>
                    <FormMessage />
                    <FormDescription>Valor por subservicio.</FormDescription>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="valorPrioridad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Valor Prioridad <RequiredDot />
                    </FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="25000" {...field} />
                    </FormControl>
                    <FormMessage />

                    <FormDescription>
                      Valor por subservicio priorizado.
                    </FormDescription>
                  </FormItem>
                )}
              />
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
              <Button type="submit" disabled={!isValid || isSubmitting}>
                {isSubmitting && <Loader className="animate-spin" />}
                {isEdit ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
