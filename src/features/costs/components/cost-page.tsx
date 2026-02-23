"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterSelect } from "@/components/common/filter-select";
import { TableSkeleton } from "@/components/common/skeletons/table-skeleton";
import { FinishedRequestsTable } from "./finished-requests-table";
import { PaymentSummaryModal } from "./payment-summary-modal";
import {
  fetchDistributors,
  fetchFinishedRequestsByDistributorBackend as fetchFinishedRequestsByDistributor,
} from "../utils/costs";
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
  const queryClient = useQueryClient();
  const [selectedDistributorId, setSelectedDistributorId] =
    useState<string>("");
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // --- Query de distribuidores ---
  const { data: distributors = [], isLoading: isLoadingDistributors } =
    useQuery({
      queryKey: ["distributors-list"],
      queryFn: fetchDistributors,
      staleTime: 5 * 60 * 1000,
    });

  // --- Query de solicitudes finalizadas ---
  const {
    data: finishedRequests = [] as Request[],
    isLoading: isLoadingRequests,
    isFetching: isFetchingRequests,
  } = useQuery({
    queryKey: ["finished-requests", selectedDistributorId],
    queryFn: () =>
      fetchFinishedRequestsByDistributor(selectedDistributorId) as Promise<
        Request[]
      >,
    enabled: !!selectedDistributorId,
    staleTime: 0,
  });

  // --- Opciones para el select de repartidores ---
  const distributorOptions = useMemo(() => {
    return distributors.map((d) => ({
      id: d.id,
      name: d.title,
    }));
  }, [distributors]);

  const handleDistributorChange = (id: string) => {
    setSelectedDistributorId(id);
    setSelectedRequestIds([]);
  };

  const selectedDistributorName = useMemo(() => {
    return (
      distributors.find((d) => d.id === selectedDistributorId)?.title || ""
    );
  }, [distributors, selectedDistributorId]);

  const selectedRequestsData = useMemo(() => {
    return finishedRequests.filter((r) => selectedRequestIds.includes(r.id));
  }, [finishedRequests, selectedRequestIds]);

  const handleCalculatePayment = () => {
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    setSelectedRequestIds([]);
    queryClient.invalidateQueries({
      queryKey: ["finished-requests", selectedDistributorId],
    });
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-20 px-4 sm:px-6">
      {/* --- Filtros (Compacto) --- */}
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
            Seleccione un repartidor en el filtro superior para ver las
            solicitudes finalizadas y proceder con la liquidación de servicios.
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
                    Gestión de Pagos
                  </h1>
                  <p className="text-[11px] font-semibold text-gray-500 mt-0.5 uppercase tracking-widest leading-none">
                    Liquidación de servicios: {selectedDistributorName}
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
                  selectedIds={selectedRequestIds}
                  onSelectionChange={setSelectedRequestIds}
                />

                {/* --- Acciones de Pago --- */}
                {selectedRequestIds.length > 0 && (
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
                          {selectedRequestIds.length}{" "}
                          {selectedRequestIds.length === 1
                            ? "solicitud seleccionada"
                            : "solicitudes seleccionadas"}
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={handleCalculatePayment}
                      className="bg-white hover:bg-slate-50 text-blue-700 font-black flex items-center gap-2 shadow-lg px-8 py-6 h-auto transition-all hover:scale-[1.05] rounded-xl uppercase text-xs tracking-wider active:scale-95"
                      disabled={isFetchingRequests}
                    >
                      {isFetchingRequests ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Liquidar Servicios
                    </Button>
                  </div>
                )}
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
