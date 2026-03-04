"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader,
  Receipt,
  FileText,
  Calculator,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type { Request } from "../types";
import { toast } from "sonner";

const paymentSchema = z.object({
  baseValue: z.coerce.number().min(0, "El valor debe ser mínimo 0"),
  additionalAmount: z.coerce.number().min(0, "El valor debe ser mínimo 0"),
  discountAmount: z.coerce.number().min(0, "El valor debe ser mínimo 0"),
  observations: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface PaymentSummaryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRequests: Request[];
  distributorId: string;
  distributorName: string;
  onSuccess: () => void;
}

export function PaymentSummaryModal({
  isOpen,
  onOpenChange,
  selectedRequests,
  distributorId,
  distributorName,
  onSuccess,
}: PaymentSummaryModalProps) {
  const createPayment = useMutation(api.payments.create);
  
  const calculatedBaseValue = selectedRequests.reduce((acc, req) => {
    // Si existe valor priorizado, se toma ese como total. Si no, se toma el valor del servicio.
    const serviceVal =req.serviceValue ;
    const priorityVal =req.prioritizedValue  || 0;
    const requestTotal = priorityVal > 0 ? priorityVal : serviceVal;
    return requestTotal;
  }, 0);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      baseValue: calculatedBaseValue,
      additionalAmount: 0,
      discountAmount: 0,
      observations: "",
    },
  });

  const baseValue = Number(form.watch("baseValue") || 0);
  const isBaseValueModified = baseValue !== calculatedBaseValue;
  const additionalAmount = Number(form.watch("additionalAmount") || 0);
  const discountAmount = Number(form.watch("discountAmount") || 0);
  const numRequests = selectedRequests.length;
  
  // Total is base + additional - discount
  const totalAmount = Math.max(0, (baseValue + additionalAmount) - discountAmount);

  // Efecto para actualizar el valor base si cambian las solicitudes seleccionadas
  useEffect(() => {
    if (isOpen) {
      const newVal = selectedRequests.reduce((acc, req) => {
        const serviceVal = Number(req.serviceValue) || Number(req.field_service_value) || 0;
        const priorityVal = Number(req.prioritizedValue) || Number(req.field_prioritized_value) || 0;
        const requestTotal = priorityVal > 0 ? priorityVal : serviceVal;
        return acc + requestTotal;
      }, 0);
      form.setValue("baseValue", newVal);
    }
  }, [selectedRequests, isOpen, form]);

  const { isSubmitting, isValid } = form.formState;

  const getServiceTitle = (type: string | undefined) => {
    switch (type) {
      case "node--civil_registry_request":
        return "Solicitud Registro Civil";
      case "node--death_certificate_request":
        return "Partida de Defunción";
      case "node--marriage_certificate_request":
        return "Solicitud Partida Matrimonio";
      case "node--request_medication":
        return "Solicitud de Medicamentos";
      case "node--water_sample_fridge":
        return "Cert. Entrega Agua";
      case "node--property_certification":
        return "Cert. Propiedad";
      case "node--medical_bills":
        return "Solicitud Recibo Médico";
      case "node--property_unbundling_request":
        return "Desenglobe de predio";
      default:
        return "Solicitud";
    }
  };

  const handleConfirm = async (values: PaymentFormValues) => {
    try {
      await createPayment({
        title: `Pago de ${numRequests} solicitudes - ${distributorName}`,
        observations: values.observations || "",
        baseValue: values.baseValue,
        additionalAmount: values.additionalAmount,
        discountAmount: values.discountAmount,
        totalAmount: totalAmount,
        distributorId: distributorId as Id<"distributors">,
        requestIds: selectedRequests.map((r) => r.id as Id<"requests">),
        status: "Pagado",
      });

      toast.success("Pago realizado correctamente");
      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Error al confirmar el pago:", error);
      toast.error("Hubo un error al procesar el pago");
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-0 border-none bg-white">
        <DialogHeader className="p-6 bg-white border-b border-gray-100 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900">
                Resumen de Pago
              </DialogTitle>
              <p className="text-xs text-gray-500 font-medium">
                Revise las solicitudes y defina los valores para el pago del
                repartidor.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-8">
          {/* SECTION 1: REQUESTS LIST */}
          <div className="space-y-4">
            {sectionHeader(FileText, "1. Solicitudes a Pagar:")}
            <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-2 max-h-[200px] overflow-y-auto space-y-2">
              {selectedRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100 shadow-sm"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-blue-700">
                      {request.applicationNumber} - Tipo:{" "}
                      {getServiceTitle(request.infoServiceType)}
                    </span>
                    <span className="text-[11px] text-gray-500 font-medium">
                      Cliente: {request.applicant?.fullName || "Sin nombre"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 2: CALCULATION FORM */}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleConfirm)}
              className="space-y-6"
            >
              <div className="space-y-4">
                {sectionHeader(Calculator, "2. Cálculo del Valor:")}

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="baseValue"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Valor Base ($)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0.00"
                            className="h-10 bg-slate-50/50 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm"
                            {...field}
                          />
                        </FormControl>
                        {isBaseValueModified && (
                          <div className="flex items-center gap-1.5 mt-1.5 text-amber-600 bg-amber-50 px-2 py-1 rounded text-[10px] font-bold">
                            <AlertTriangle className="size-3" />
                            <span>Valor modificado (Orig: ${calculatedBaseValue.toLocaleString()})</span>
                          </div>
                        )}
                        <FormMessage className="text-[10px] font-bold" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="additionalAmount"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Adicionales ($)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0.00"
                            className="h-10 bg-slate-50/50 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm text-green-600"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[10px] font-bold" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="discountAmount"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Descuentos ($)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0.00"
                            className="h-10 bg-slate-50/50 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm text-red-600"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[10px] font-bold" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center gap-4 py-2">
                   <div className="space-y-1.5 flex-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Nº Solicitudes
                    </label>
                    <div className="h-10 px-3 bg-slate-100/50 border border-slate-200 rounded-lg flex items-center text-sm font-bold text-slate-700">
                      {numRequests}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50/30 rounded-xl border border-blue-100 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-600 uppercase tracking-wide">
                    Total a pagar
                  </span>
                  <span className="text-xl font-black text-blue-700">
                    ${totalAmount.toLocaleString()}
                  </span>
                </div>

                <FormField
                  control={form.control}
                  name="observations"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Observaciones (Opcional)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ingrese notas adicionales sobre este pago..."
                          className="min-h-[80px] bg-slate-50/50 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none text-sm font-medium"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />
              </div>

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
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  Confirmar Pago
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
