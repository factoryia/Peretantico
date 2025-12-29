import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
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
import {
  Loader,
  User,
  Truck,
  Phone,
  Shield,
  FileText,
  Plus,
  Edit,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { DISTRIBUTORS_QUERY_KEY } from "../constants/query-keys";
import { RequiredDot } from "@/components/common/required-dot";
import { RequiredFormMessage } from "@/components/common/form-message";

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
        vehicleId: distributor.vehicleId || "",
        email: distributor.email || "",
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

  const getTitle = () => (isEditing ? "Editar Repartidor" : "Nuevo Repartidor");
  const getDescription = () =>
    isEditing
      ? "Gestione los datos del repartidor en el sistema"
      : "Registre un nuevo repartidor completando los campos indicados";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto p-0 border-none bg-white">
        <DialogHeader className="p-6 bg-white border-b border-gray-100 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                isEditing
                  ? "bg-indigo-50 text-indigo-600"
                  : "bg-blue-50 text-blue-600"
              }`}
            >
              {isEditing ? (
                <Edit className="h-5 w-5" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900">
                {getTitle()}
              </DialogTitle>
              <p className="text-xs text-gray-500 font-medium">
                {getDescription()}
              </p>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="p-6 space-y-10 animate-in fade-in duration-500"
          >
            {/* PERSONAL SECTION */}
            <div className="space-y-6">
              {sectionHeader(User, "Datos de Identificación")}
              <div className="space-y-5">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Nombre Completo <RequiredDot />
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: Juan Carlos Pérez"
                          className="h-10 bg-slate-50/50 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm"
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
                    name="documentTypeId"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Tipo Doc. <RequiredDot />
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-10 bg-slate-50/50 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm">
                              <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                            {documentTypes.map((type) => (
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
                            placeholder="12345678"
                            className="h-10 bg-slate-50/50 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm"
                            {...field}
                            onInput={(e) => {
                              e.currentTarget.value =
                                e.currentTarget.value.replace(/\D/g, "");
                              field.onChange(e);
                            }}
                          />
                        </FormControl>
                        <FormMessage className="text-[10px] font-bold" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* VEHICLE & LOGISTICS SECTION */}
            <div className="space-y-6">
              {sectionHeader(Truck, "Transporte y Logística")}
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="transportationTypeId"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Tipo Transporte <RequiredDot />
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-10 bg-slate-50/50 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm">
                              <SelectValue placeholder="Seleccione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                            {transportationTypes.map((type) => (
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
                    name="vehicleId"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          ID Vehículo / Placa
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="ABC123"
                            className="h-10 bg-slate-50/50 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[10px] font-bold" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="coverageAreaId"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Zona de Cobertura <RequiredDot />
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 bg-slate-50/50 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm">
                            <SelectValue placeholder="Seleccione la zona de trabajo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                          {coverageAreas.map((area) => (
                            <SelectItem key={area.id} value={area.id}>
                              {area.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* COMMUNICATION SECTION */}
            <div className="space-y-6">
              {sectionHeader(Phone, "Comunicación")}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Teléfono <RequiredDot />
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="300 123 4567"
                          className="h-10 bg-slate-50/50 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm"
                          {...field}
                          onInput={(e) => {
                            e.currentTarget.value =
                              e.currentTarget.value.replace(/\D/g, "");
                            field.onChange(e);
                          }}
                        />
                      </FormControl>
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
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="correo@ejemplo.com"
                          className="h-10 bg-slate-50/50 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* STATUS & AVAILABILITY SECTION */}
            <div className="space-y-6">
              {sectionHeader(Shield, "Estado y Disponibilidad")}
              <div className="space-y-5">
                <FormField
                  control={form.control}
                  name="entryDate"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Fecha de Ingreso <RequiredDot />
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="h-10 bg-slate-50/50 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-3">
                  <FormField
                    control={form.control}
                    name="currentAvailability"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-xl border border-slate-100 p-3.5 bg-slate-50/30">
                        <div className="space-y-0.5">
                          <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Disponibilidad Operativa
                          </FormLabel>
                          <p className="text-[10.5px] text-slate-500">
                            ¿Está disponible para asignación inmediata?
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
                    name="status"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-xl border border-slate-100 p-3.5 bg-slate-50/30">
                        <div className="space-y-0.5">
                          <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Estado Maestro
                          </FormLabel>
                          <p className="text-[10.5px] text-slate-500">
                            Habilita o deshabilita al repartidor en la
                            plataforma
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
            </div>

            {/* OBSERVATIONS SECTION */}
            <div className="space-y-6">
              {sectionHeader(FileText, "Notas y Observaciones")}
              <FormField
                control={form.control}
                name="observations"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormControl>
                      <Textarea
                        placeholder="Registre cualquier detalle adicional relevante sobre el repartidor..."
                        className="min-h-[100px] bg-slate-50/50 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none text-sm font-medium"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-[10px] font-bold" />
                  </FormItem>
                )}
              />
            </div>

            <RequiredFormMessage />

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11 px-6 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold text-[13px] uppercase tracking-wide transition-all"
              >
                Cancelar
              </Button>
              <Button
                disabled={!isValid || isSubmitting}
                type="submit"
                className="h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 rounded-xl font-bold text-[13px] uppercase tracking-wide transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <Loader className="size-4 animate-spin" />
                ) : isEditing ? (
                  <Shield className="size-4" />
                ) : (
                  <Plus className="size-4" />
                )}
                {isEditing ? "Actualizar" : "Registrar"} Repartidor
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
