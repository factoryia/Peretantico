import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useEffect, useState } from "react";
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
// import { createDistributor, updateDistributor } from "../utils/distributors";
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

  // Convex Mutations
  const createDistributorMutation = useMutation(api.distributors.create);
  const updateDistributorMutation = useMutation(api.distributors.update);
  const createTransportationTypeMutation = useMutation(api.transportationTypes.create);
  const updateTransportationTypeMutation = useMutation(api.transportationTypes.update);
  const deleteTransportationTypeMutation = useMutation(api.transportationTypes.remove);

  const createCoverageAreaMutation = useMutation(api.coverageAreas.create);
  const updateCoverageAreaMutation = useMutation(api.coverageAreas.update);
  const deleteCoverageAreaMutation = useMutation(api.coverageAreas.remove);

  const [creatingCoverageArea, setCreatingCoverageArea] = useState(false);
  const [creatingTransportationType, setCreatingTransportationType] =
    useState(false);
  const [newTransportationName, setNewTransportationName] = useState("");
  const [newCoverageName, setNewCoverageName] = useState("");
  const [manageTransportationOpen, setManageTransportationOpen] =
    useState(false);
  const [manageCoverageOpen, setManageCoverageOpen] = useState(false);
  
  // Use props directly for manager items to reflect Convex updates
  const transportationManagerItems = transportationTypes;
  const coverageManagerItems = coverageAreas;

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
      const { documentTypeId, ...restValues } = values;
      
      const payload = {
        ...restValues,
        documentType: documentTypeId,
        email: values.email || undefined,
        vehicleId: values.vehicleId || undefined,
        observations: values.observations || undefined,
        coverageAreaId: values.coverageAreaId as Id<"coverageAreas">,
        transportationTypeId: values.transportationTypeId as Id<"transportationTypes">,
      };

      if (distributor) {
        await updateDistributorMutation({
          id: distributor.id as Id<"distributors">,
          ...payload,
        });
      } else {
        await createDistributorMutation(payload);
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
    <>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="transportationTypeId"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Tipo Transporte <RequiredDot />
                        </FormLabel>
                        <div className="flex flex-col gap-2">
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
                              {transportationTypes.length === 0 ? (
                                <div className="px-3 py-2 text-xs text-slate-500">
                                  No hay tipos de transporte disponibles.
                                </div>
                              ) : (
                                transportationTypes.map((type) => (
                                  <SelectItem key={type.id} value={type.id}>
                                    {type.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-[11px] font-bold uppercase tracking-wider justify-start"
                            onClick={() => setManageTransportationOpen(true)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Gestionar tipos de transporte
                          </Button>
                        </div>
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
                      <div className="flex flex-col gap-2">
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
                            {coverageAreas.length === 0 ? (
                              <div className="px-3 py-2 text-xs text-slate-500">
                                No hay zonas de cobertura disponibles.
                              </div>
                            ) : (
                              coverageAreas.map((area) => (
                                <SelectItem key={area.id} value={area.id}>
                                  {area.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-[11px] font-bold uppercase tracking-wider justify-start"
                          onClick={() => setManageCoverageOpen(true)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Gestionar zonas de cobertura
                        </Button>
                      </div>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* COMMUNICATION SECTION */}
            <div className="space-y-6">
              {sectionHeader(Phone, "Comunicación")}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      <Dialog open={manageTransportationOpen} onOpenChange={setManageTransportationOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gestionar tipos de transporte</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Nuevo tipo de transporte"
                className="h-9 bg-slate-50/50 border-slate-200 rounded-lg text-sm"
                value={newTransportationName}
                onChange={(e) => setNewTransportationName(e.target.value)}
              />
              <Button
                type="button"
                size="sm"
                className="h-9"
                disabled={
                  creatingTransportationType ||
                  !newTransportationName.trim()
                }
                onClick={async () => {
                  const name = newTransportationName.trim();
                  if (!name) return;
                  try {
                    setCreatingTransportationType(true);
                    const createdId = await createTransportationTypeMutation({ name });
                    
                    form.setValue("transportationTypeId", createdId, {
                      shouldValidate: true,
                    });
                    setNewTransportationName("");
                    toast.success("Tipo de transporte creado correctamente");
                  } catch {
                    toast.error("Error al crear el tipo de transporte");
                  } finally {
                    setCreatingTransportationType(false);
                  }
                }}
              >
                Agregar
              </Button>
            </div>
            <div className="border border-slate-100 rounded-lg max-h-64 overflow-auto">
              {transportationManagerItems.length === 0 ? (
                <div className="px-4 py-3 text-xs text-slate-500">
                  No hay tipos de transporte configurados.
                </div>
              ) : (
                transportationManagerItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 px-4 py-2 border-b last:border-b-0 border-slate-100"
                  >
                    <Input
                      defaultValue={item.name}
                      className="h-8 bg-slate-50/50 border-slate-200 rounded-lg text-xs"
                      onBlur={async (e) => {
                        const name = e.target.value.trim();
                        if (!name || name === item.name) return;
                        try {
                          await updateTransportationTypeMutation({
                            id: item.id as Id<"transportationTypes">,
                            name,
                          });
                          toast.success("Tipo de transporte actualizado");
                        } catch {
                          toast.error("Error al actualizar el tipo");
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-red-500"
                      onClick={async () => {
                        try {
                          await deleteTransportationTypeMutation({
                            id: item.id as Id<"transportationTypes">,
                          });
                          
                          if (form.getValues("transportationTypeId") === item.id) {
                            form.setValue("transportationTypeId", "", {
                              shouldValidate: true,
                            });
                          }
                          toast.success("Tipo de transporte eliminado");
                        } catch {
                          toast.error("Error al eliminar el tipo");
                        }
                      }}
                    >
                      <FileText className="hidden" />
                      <span className="text-xs font-semibold">X</span>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={manageCoverageOpen} onOpenChange={setManageCoverageOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gestionar zonas de cobertura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Nueva zona de cobertura"
                className="h-9 bg-slate-50/50 border-slate-200 rounded-lg text-sm"
                value={newCoverageName}
                onChange={(e) => setNewCoverageName(e.target.value)}
              />
              <Button
                type="button"
                size="sm"
                className="h-9"
                disabled={creatingCoverageArea || !newCoverageName.trim()}
                onClick={async () => {
                  const name = newCoverageName.trim();
                  if (!name) return;
                  try {
                    setCreatingCoverageArea(true);
                    const createdId = await createCoverageAreaMutation({ name });
                    
                    form.setValue("coverageAreaId", createdId, {
                      shouldValidate: true,
                    });
                    setNewCoverageName("");
                    toast.success("Zona de cobertura creada correctamente");
                  } catch {
                    toast.error("Error al crear la zona de cobertura");
                  } finally {
                    setCreatingCoverageArea(false);
                  }
                }}
              >
                Agregar
              </Button>
            </div>
            <div className="border border-slate-100 rounded-lg max-h-64 overflow-auto">
              {coverageManagerItems.length === 0 ? (
                <div className="px-4 py-3 text-xs text-slate-500">
                  No hay zonas de cobertura configuradas.
                </div>
              ) : (
                coverageManagerItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 px-4 py-2 border-b last:border-b-0 border-slate-100"
                  >
                    <Input
                      defaultValue={item.name}
                      className="h-8 bg-slate-50/50 border-slate-200 rounded-lg text-xs"
                      onBlur={async (e) => {
                        const name = e.target.value.trim();
                        if (!name || name === item.name) return;
                        try {
                          await updateCoverageAreaMutation({
                            id: item.id as Id<"coverageAreas">,
                            name,
                          });
                          toast.success("Zona de cobertura actualizada");
                        } catch {
                          toast.error("Error al actualizar la zona");
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-red-500"
                      onClick={async () => {
                        try {
                          await deleteCoverageAreaMutation({
                            id: item.id as Id<"coverageAreas">,
                          });
                          
                          if (form.getValues("coverageAreaId") === item.id) {
                            form.setValue("coverageAreaId", "", {
                              shouldValidate: true,
                            });
                          }
                          toast.success("Zona de cobertura eliminada");
                        } catch {
                          toast.error("Error al eliminar la zona");
                        }
                      }}
                    >
                      <FileText className="hidden" />
                      <span className="text-xs font-semibold">X</span>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
