import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Distributor } from "@/features/distributors/types/distributors";
import type { TaxonomyTerm } from "@/types/global";
import { distributorSchema, type DistributorFormValues } from "../schemas";
import { createDistributor, updateDistributor } from "../utils/distributors";
import { toast } from "sonner";
import { Loader } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { DISTRIBUTORS_QUERY_KEY } from "../constants/query-keys";
import { RequiredDot } from "@/components/common/required-dot";

interface DistributorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentTypes: TaxonomyTerm[];
  coverageAreas: TaxonomyTerm[];
  transportationTypes: TaxonomyTerm[];
  distributor?: Distributor | null;
}

export function DistributorDialog({
  open,
  onOpenChange,
  documentTypes,
  coverageAreas,
  transportationTypes,
  distributor,
}: DistributorDialogProps) {
  const isEditing = !!distributor;

  const queryClient = useQueryClient();

  const dialogTitle = isEditing ? "Editar repartidor" : "Nuevo repartidor";
  const dialogDescription = isEditing
    ? "Modifica la información del repartidor seleccionado."
    : "Completa el formulario para registrar un nuevo repartidor.";

  const form = useForm<DistributorFormValues>({
    resolver: zodResolver(distributorSchema),
    defaultValues: {
      title: "",
      documentNumber: "",
      documentTypeId: "",
      phoneNumber: "",
      email: "",
      coverageAreaId: "",
      transportationTypeId: "",
      vehicleId: "",
      status: true,
      currentAvailability: true,
      entryDate: "",
      observations: "",
    },
  });

  const { isValid, isSubmitting } = form.formState;

  useEffect(() => {
    if (distributor) {
      form.reset({
        title: distributor.title,
        currentAvailability: distributor.currentAvailability,
        documentNumber: distributor.documentNumber,
        entryDate: distributor.entryDate,
        vehicleId: distributor.vehicleId,
        email: distributor.email,
        observations: distributor.observations || "",
        phoneNumber: distributor.phoneNumber,
        documentTypeId: distributor.documentType.id,
        coverageAreaId: distributor.coverageArea.id,
        transportationTypeId: distributor.transportationType.id,
        status: distributor.status,
      });
    } else {
      form.reset({
        title: "",
        currentAvailability: true,
        status: true,
        documentNumber: "",
        entryDate: "",
        vehicleId: "",
        email: "",
        observations: "",
        phoneNumber: "",
        documentTypeId: "",
        coverageAreaId: "",
        transportationTypeId: "",
      });
    }
  }, [isEditing, distributor, form, open]);

  const handleSubmit = async (values: DistributorFormValues) => {
    try {
      if (distributor) {
        await updateDistributor(distributor.id, values);
      } else {
        await createDistributor(values);
      }

      queryClient.invalidateQueries({
        queryKey: [DISTRIBUTORS_QUERY_KEY],
        exact: false,
      });

      toast.success(
        distributor
          ? "Repartidor actualizado correctamente"
          : "Repartidor creado correctamente"
      );
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error(
        distributor
          ? "Error al actualizar el repartidor"
          : "Error al crear el repartidor"
      );
      console.error("Error al guardar el repartidor", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nombre Completo <RequiredDot />
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Juan Carlos Pérez" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="documentTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Tipo de Documento <RequiredDot />
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {documentTypes.map((type) => (
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Número de Documento <RequiredDot />
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="12345678"
                        {...field}
                        onInput={(e) => {
                          e.currentTarget.value = e.currentTarget.value.replace(
                            /\D/g,
                            ""
                          );
                          field.onChange(e); // mantén react-hook-form sincronizado
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="correo@ejemplo.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Teléfono <RequiredDot />
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="300 123 4567"
                        {...field}
                        onInput={(e) => {
                          e.currentTarget.value = e.currentTarget.value.replace(
                            /\D/g,
                            ""
                          );
                          field.onChange(e);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="entryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Fecha de Ingreso <RequiredDot />
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vehicleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID del Vehículo</FormLabel>
                    <FormControl>
                      <Input placeholder="ABC123" {...field} />
                    </FormControl>
                    <FormDescription>
                      Placa o identificador del vehículo
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="coverageAreaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Zona de Cobertura <RequiredDot />
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione zona" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {coverageAreas.map((area) => (
                          <SelectItem key={area.id} value={area.id}>
                            {area.name}
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
                name="transportationTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Tipo de Transporte <RequiredDot />
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione transporte" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {transportationTypes.map((type) => (
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
            </div>

            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observaciones adicionales sobre el repartidor..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Información adicional (opcional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currentAvailability"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>
                      Disponibilidad <RequiredDot />
                    </FormLabel>
                    <FormDescription className="text-xs">
                      ¿Está disponible para entregas?
                    </FormDescription>
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
              name="status"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>
                      Estado <RequiredDot />
                    </FormLabel>
                    <FormDescription className="text-xs">
                      Activo / Inactivo
                    </FormDescription>
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

            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                disabled={!isValid || isSubmitting}
                type="submit"
                className="w-full sm:w-auto"
              >
                {isSubmitting && <Loader className="animate-spin" />}
                {distributor ? "Actualizar" : "Crear"} Repartidor
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
