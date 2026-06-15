import { useState } from "react";
import { useDistributorId } from "../hooks/use-distributor-id";
import {
  useCompleteRequests,
  getTodayDateBounds,
  type CompleteRequest,
} from "../utils/complete-request";
import { DistributorRequestCard } from "./distributor-request-card";
import { SidebarHeader } from "@/components/navigation/sidebar-header";
import { DistributorDashboardSkeleton } from "./skeletons/distributor-request-card-skeleton";
import { EmptyState } from "./empty-state";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RequestDetailViewModal } from "./request-detail-view";

export function DistributorDashboard() {
  const {
    data: distributorId,
    isLoading: isLoadingId,
    error: errorId,
  } = useDistributorId();

  const [selectedRequest, setSelectedRequest] =
    useState<CompleteRequest | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const todayBounds = getTodayDateBounds();

  const {
    data: requestsData,
    isLoading: isLoadingRequests,
    error: errorRequests,
    refetch,
    isFetching,
  } = useCompleteRequests({
    assignedDistributor: distributorId || "none",
    ...todayBounds,
  });

  const isLoading = isLoadingId || isLoadingRequests;
  const error = errorId || errorRequests;

  const handleViewDetail = (request: CompleteRequest) => {
    setSelectedRequest(request);
    setIsDetailOpen(true);
  };

  if (error) {
    return (
      <div className="h-full flex flex-col">
        <SidebarHeader title="Mis Entregas" />
        <div className="p-8 flex flex-col items-center justify-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <h2 className="text-xl font-bold">Error al cargar tus entregas</h2>
          <p className="text-muted-foreground">{(error as Error).message}</p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" /> Reintentar
          </Button>
        </div>
      </div>
    );
  }

  const requests = requestsData?.data || [];

  return (
    <div className="h-full flex flex-col">
      <SidebarHeader title="Mis Entregas" />

      <div className="flex-1 overflow-auto p-5">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex max-sm:flex-col max-sm:text-center items-center sm:justify-between">
            <div className="max-sm:pb-3">
              <h2 className="text-2xl font-bold text-gray-900">
                Entregas de hoy
              </h2>
              <p className="text-gray-500 text-sm">
                Solicitudes asignadas para el día de hoy. Usa tu correo y cédula para ingresar.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching || isLoading}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${
                  isFetching || isLoading ? "animate-spin" : ""
                }`}
              />
              Actualizar
            </Button>
          </div>

          {isLoading ? (
            <DistributorDashboardSkeleton />
          ) : requests.length === 0 ? (
            <div className="mt-12">
              <EmptyState
                title="No tienes entregas para hoy"
                description="Cuando el administrador te asigne solicitudes de hoy, aparecerán aquí."
                onRefresh={refetch}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {requests.map((request) => (
                <DistributorRequestCard
                  key={request.id}
                  request={request}
                  onSuccess={() => refetch()}
                  onViewDetail={handleViewDetail}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <RequestDetailViewModal
        isOpen={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        request={selectedRequest}
        onAssignDistributor={async () => {}} // Los repartidores no pueden reasignar
        isDistributor={true}
      />
    </div>
  );
}
