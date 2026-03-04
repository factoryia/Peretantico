"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterSelect } from "@/components/common/filter-select";
import { TableSkeleton } from "@/components/common/skeletons/table-skeleton";
import { FinishedRequestsTable } from "./finished-requests-table";
import { PaymentSummaryModal } from "./payment-summary-modal";
import { PaymentHistoryTable } from "./payment-history-table";
import { useDistributorId } from "@/features/home/hooks/use-distributor-id";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import type { Request } from "../types";
import {
  Calculator,
  Loader2,
  Wallet,
  Filter,
  CheckCircle2,
} from "lucide-react";

/**
 * Página principal para la gestión de pagos a repartidores.
 * Permite filtrar solicitudes finalizadas por repartidor y calcular el total a pagar.
 */
export default function CostManagementPage() {
  // --- Estados locales ---
  const { authUser } = useAuthStore();
  const { data: currentDistributorId } = useDistributorId();
  const isDistributor = authUser?.roles?.some((role) =>
    ["distributor", "Repartidor"].includes(role)
  );

  const [selectedDistributorId, setSelectedDistributorId] =
    useState<string>("");
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Efecto para auto-seleccionar si es repartidor
  useEffect(() => {
    if (isDistributor && currentDistributorId) {
      setSelectedDistributorId(currentDistributorId);
    }
  }, [isDistributor, currentDistributorId]);

  // --- Query de distribuidores ---
  const distributors = useQuery(api.distributors.listAll, {}) || [];
  const isLoadingDistributors = distributors === undefined;

  // --- Query de solicitudes finalizadas ---
  const rawFinishedRequests = useQuery(
    api.payments.getPendingRequestsByDistributor,
    selectedDistributorId
      ? { distributorId: selectedDistributorId as Id<"distributors"> }
      : "skip"
  );

  const selectedDistributorName = useMemo(() => {
    return (
      distributors.find((d) => d._id === selectedDistributorId)?.title || ""
    );
  }, [distributors, selectedDistributorId]);
  
  const finishedRequests: Request[] = useMemo(() => {
    if (!rawFinishedRequests) return [];

    return rawFinishedRequests.map((r) => ({
      id: r._id,
      title: r.title || "Sin título",
      created: new Date(r._creationTime).toISOString(),
      applicationNumber: r.applicationNumber,
      status: r.requestStatus,
      entryDate: new Date(r.entryDate).toISOString(),
      logisticsCosts: r.logisticsCosts || 0,
      serviceValue: r.serviceValue || 0,
      prioritizedValue: r.prioritizedValue || 0,
      applicant: {
        id: r.applicant?._id || "",
        fullName: r.applicant?.fullName || "Desconocido",
        documentNumber: r.applicant?.documentNumber,
        phoneNumber: r.applicant?.phoneNumber,
        email: r.applicant?.email,
      },
      category: { id: "", name: "" }, // Not used in table
      service: { id: r.service?._id || "", name: r.service?.name || "" },
      subservice: { id: "", name: "" }, // Not used in table
      distributor: { id: selectedDistributorId, title: selectedDistributorName }, // Populated from distributors list
      infoServiceType: r.service?.name, // Use service name as type for now
      serviceStatus: { id: r.requestStatus, name: r.requestStatus },
    }));
  }, [rawFinishedRequests, selectedDistributorId, selectedDistributorName]);

  const isLoadingRequests = rawFinishedRequests === undefined;

  // --- Query de historial de pagos ---
  const rawPaymentHistory = useQuery(
    api.payments.getPaymentsByDistributor,
    selectedDistributorId
      ? { distributorId: selectedDistributorId as Id<"distributors"> }
      : "skip"
  );

  const paymentHistory = useMemo(() => {
     if (!rawPaymentHistory) return [];
     return rawPaymentHistory.map((p) => ({
       id: p._id,
       createdAt: new Date(p._creationTime).toISOString(),
       updatedAt: new Date(p._creationTime).toISOString(), // Fallback since Convex doesn't track updates automatically in metadata
       title: p.title,
       observations: p.observations || null,
       totalAmount: p.totalAmount || 0,
       status: p.status || "Completed",
       baseValue: p.baseValue || 0,
       additionalAmount: p.additionalAmount || 0,
       discountAmount: p.discountAmount || 0,
       distributorId: p.distributorId,
     }));
   }, [rawPaymentHistory]);

  const isLoadingHistory = rawPaymentHistory === undefined;

  const createPaymentMutation = useMutation(api.payments.create);

  // --- Opciones para el select de repartidores ---
  const distributorOptions = useMemo(() => {
    return distributors.map((d) => ({
      id: d._id,
      name: d.title,
    }));
  }, [distributors]);

  const handleDistributorChange = (id: string) => {
    setSelectedDistributorId(id);
    setSelectedRequests([]);
  };

  const selectedRequestsData = useMemo(() => {
    return finishedRequests.filter((r) => selectedRequests.includes(r.id));
  }, [finishedRequests, selectedRequests]);

  const handleCalculatePayment = () => {
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = async () => {
    setSelectedRequests([]);
    // Convex automatically updates queries
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-20 px-4 sm:px-6">
      {/* --- Filtros (Compacto) --- */}
      {!isDistributor && (
        <Card className="shadow-none shadow-slate-100 border bg-white rounded-3xl overflow-hidden transition-all hover:shadow-blue-950/30">
          <CardContent className="flex justify-between items-center p-4 sm:p-5 pt-0">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                <Filter className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Filtrar Solicitudes Completadas
                </h3>
                <p className="text-sm font-medium text-slate-500">
                  Seleccione un repartidor para ver sus servicios finalizados
                </p>
              </div>
            </div>
            <div className="max-w-md">
              <FilterSelect
                placeholder={
                  isLoadingDistributors
                    ? "Cargando repartidores..."
                    : "Seleccione un repartidor para liquidar..."
                }
                options={distributorOptions}
                value={selectedDistributorId}
                onValueChange={handleDistributorChange}
                disabled={isLoadingDistributors}
                className="w-full h-10"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* --- Contenido Principal --- */}
      {!selectedDistributorId ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 animate-in fade-in zoom-in-95 duration-500">
          <div className="p-5 bg-slate-50 rounded-full mb-6 border border-slate-100 shadow-inner">
            <Wallet className="h-12 w-12 text-slate-300" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 text-center">
            Gestión de Pagos
          </h2>
          <p className="text-slate-500 text-center mt-2 max-w-sm font-medium text-sm">
            {isDistributor
              ? "Cargando tus solicitudes finalizadas..."
              : "Seleccione un repartidor en el filtro superior para ver las solicitudes finalizadas y proceder con la liquidación de servicios."}
          </p>
        </div>
      ) : (
        <Card className="shadow-2xl shadow-slate-100 border bg-white rounded-3xl overflow-hidden transition-all hover:shadow-blue-950/30 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-0">
          <CardHeader className="border-b bg-slate-50/30 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-medium pb-1 tracking-tight text-gray-900">
                    {isDistributor ? "Mis Pagos Pendientes" : "Gestión de Pagos"}
                  </h1>
                  <p className="text-[11px] font-semibold text-gray-500 mt-0.5 uppercase tracking-widest leading-none">
                    {isDistributor
                      ? "Visualiza tus servicios completados pendientes de pago"
                      : `Liquidación de servicios: ${selectedDistributorName}`}
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="w-fit h-6 px-3 bg-blue-50 text-blue-700 border-blue-100 font-bold uppercase text-[9px] tracking-widest rounded-full"
              >
                {finishedRequests.length} Solicitudes Finalizadas
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingRequests ? (
              <div className="p-10">
                <TableSkeleton />
              </div>
            ) : (
              <div className="p-6 space-y-6">
                <FinishedRequestsTable
                  requests={finishedRequests}
                  selectedIds={selectedRequests}
                  onSelectionChange={setSelectedRequests}
                  disabled={isDistributor}
                />

                {/* --- Acciones de Pago --- */}
                {selectedRequests.length > 0 && !isDistributor && (
                  <div className="flex items-center justify-between p-5 bg-blue-600 rounded-2xl shadow-xl shadow-blue-200 animate-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-lg text-white">
                        <Calculator className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-white font-black uppercase text-xs tracking-widest">
                          Resumen de Selección
                        </span>
                        <span className="text-white/90 text-[13px] font-bold">
                          {selectedRequests.length}{" "}
                          {selectedRequests.length === 1
                            ? "solicitud seleccionada"
                            : "solicitudes seleccionadas"}
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={handleCalculatePayment}
                      className="bg-white hover:bg-slate-50 text-blue-700 font-black flex items-center gap-2 shadow-lg px-8 py-6 h-auto transition-all hover:scale-[1.05] rounded-xl uppercase text-xs tracking-wider active:scale-95"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Liquidar Servicios
                    </Button>
                  </div>
                )}

                {/* --- Historial de Pagos (Abajo) --- */}
                <div className="pt-8 border-t border-slate-100">
                  {isLoadingHistory ? (
                    <div className="p-4 space-y-4">
                      <div className="h-6 w-48 bg-slate-100 animate-pulse rounded" />
                      <TableSkeleton />
                    </div>
                  ) : (
                    <PaymentHistoryTable payments={paymentHistory} />
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* --- Modal de Resumen de Pago --- */}
      <PaymentSummaryModal
        isOpen={isPaymentModalOpen}
        onOpenChange={setIsPaymentModalOpen}
        selectedRequests={selectedRequestsData}
        distributorId={selectedDistributorId}
        distributorName={selectedDistributorName}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
