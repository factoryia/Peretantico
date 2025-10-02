// components/payment-calculation-modal.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, Save, X } from "lucide-react";
import { toast } from "sonner";
import {
  saveCostRecord,
  calculatePayment,
  fetchPaymentHistory,
  fetchAssignedRequests,
} from "../utils/costs";
import type { Distributor, PaymentCalculation } from "../types";

interface PaymentCalculationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  distributor: Distributor | null;
}

interface PaymentFormData {
  requestId: string;
  baseValue: number;
  additionalValue: number;
  discountValue: number;
}

export function PaymentCalculationModal({
  open,
  onOpenChange,
  distributor,
}: PaymentCalculationModalProps) {
  const [paymentCalculation, setPaymentCalculation] =
    useState<PaymentCalculation>({
      baseValue: 0,
      additionalValue: 0,
      discountValue: 0,
      total: 0,
    });

  const form = useForm<PaymentFormData>({
    defaultValues: {
      requestId: "",
      baseValue: 0,
      additionalValue: 0,
      discountValue: 0,
    },
  });

  const { data: requests, isLoading } = useQuery({
    queryKey: ["assigned-requests", distributor?.id],
    queryFn: () => fetchAssignedRequests(distributor?.id || ""),
    enabled: !!distributor?.id && open,
  });

  const { data: paymentHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["payment-history", distributor?.id],
    queryFn: () => fetchPaymentHistory(distributor?.id || "", 5),
    enabled: !!distributor?.id && open,
  });

  const watchedValues = form.watch();

  // Calcular el total cuando cambien los valores
  useEffect(() => {
    const calculation = calculatePayment(
      watchedValues.baseValue || 0,
      watchedValues.additionalValue || 0,
      watchedValues.discountValue || 0
    );
    setPaymentCalculation(calculation);
  }, [
    watchedValues.baseValue,
    watchedValues.additionalValue,
    watchedValues.discountValue,
  ]);

  // Actualizar el valor base cuando se seleccione una solicitud
  const handleRequestChange = (requestId: string) => {
    // Ignorar valores especiales que no son IDs de solicitudes reales
    if (requestId === "loading" || requestId === "no-requests") {
      return;
    }
    
    const selectedRequest = requests?.find((req) => req.id === requestId);
    if (selectedRequest) {
      form.setValue("baseValue", selectedRequest.serviceValue);
    }
  };

  const handleSubmit = async (data: PaymentFormData) => {
    try {
      if (!distributor) {
        toast.error("No se ha seleccionado un distribuidor");
        return;
      }

      await saveCostRecord({
        distributorId: distributor.id,
        requestId: data.requestId,
        baseValue: data.baseValue,
        additionalValue: data.additionalValue,
        discountValue: data.discountValue,
      });

      toast.success("Cálculo de pago guardado correctamente");
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error("Error al guardar el cálculo de pago");
      console.error("Error saving payment calculation:", error);
    }
  };

  const handleClose = () => {
    form.reset();
    setPaymentCalculation({
      baseValue: 0,
      additionalValue: 0,
      discountValue: 0,
      total: 0,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Cálculo de Pago - {distributor?.title}
          </DialogTitle>
          <DialogDescription>
            Calcule el pago para una solicitud específica del distribuidor.
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Información del Distribuidor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Nombre:</span>
                <p>{distributor?.title}</p>
              </div>
              <div>
                <span className="font-medium">Documento:</span>
                <p>{distributor?.documentNumber}</p>
              </div>
              <div>
                <span className="font-medium">Teléfono:</span>
                <p>{distributor?.phoneNumber}</p>
              </div>
              <div>
                <span className="font-medium">Email:</span>
                <p>{distributor?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="requestId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Solicitud</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleRequestChange(value);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione una solicitud" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoading ? (
                        <SelectItem value="loading" disabled>
                          Cargando solicitudes...
                        </SelectItem>
                      ) : requests && requests.length > 0 ? (
                        requests.map((request) => (
                          <SelectItem key={request.id} value={request.id}>
                            <div className="flex flex-col text-left  ">
                              <span className="font-medium ">
                                {request.applicationNumber}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {request.subservice.name} - $
                                {request.serviceValue.toLocaleString()}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-requests" disabled>
                          No hay solicitudes disponibles
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="baseValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Base</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="additionalValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Adicional</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discountValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descuento</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Resumen del Cálculo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Valor Base:</span>
                    <span className="font-medium">
                      ${paymentCalculation.baseValue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Valor Adicional:</span>
                    <span className="font-medium text-green-600">
                      +${paymentCalculation.additionalValue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Descuento:</span>
                    <span className="font-medium text-red-600">
                      -${paymentCalculation.discountValue.toLocaleString()}
                    </span>
                  </div>
                  <hr />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <Badge variant="default" className="text-lg px-3 py-1">
                      ${paymentCalculation.total.toLocaleString()}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Historial de Pagos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Historial de Pagos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingHistory ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Cargando historial...
                  </div>
                ) : paymentHistory && paymentHistory.length > 0 ? (
                  <div className="space-y-3">
                    {paymentHistory.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex justify-between items-center p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            Solicitud: {payment.requestId}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">
                            ${(payment.paymentCalculation?.total || 0).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Base: $
                            {(payment.paymentCalculation?.baseValue || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No hay historial de pagos
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex items-center gap-2"
                disabled={!form.formState.isValid || !watchedValues.requestId}
              >
                <Save className="h-4 w-4" />
                Guardar Cálculo
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
