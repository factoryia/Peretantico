"use client";

import { useState, useCallback } from "react";
import { SidebarHeader } from "@/components/navigation/sidebar-header";
import { FiltersSection } from "../components/filters-section";
import { RequestsTable } from "../components/requests-table";
import { NewRequestModal } from "../components/new-request-modal";
import type { RequestFilters } from "../types/request";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { DistributorDashboard } from "../components/distributor-dashboard";

export function Home() {
  const { authUser } = useAuthStore();
  const isDistributor = authUser?.roles?.includes("distributor");

  const [filters, setFilters] = useState<RequestFilters>({});
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleNewRequest = useCallback(() => {
    setIsNewRequestModalOpen(true);
  }, []);

  const handleNewRequestSuccess = useCallback(() => {
    setIsNewRequestModalOpen(false);
    // Forzar actualización de la tabla
    setRefreshKey((prev) => prev + 1);
  }, []);

  const handleFiltersChange = useCallback((newFilters: RequestFilters) => {
    setFilters(newFilters);
    // Forzar actualización cuando cambien los filtros
    setRefreshKey((prev) => prev + 1);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  if (isDistributor) {
    return <DistributorDashboard />;
  }

  return (
    <div className="h-full flex flex-col">
      <SidebarHeader title="Gestión de solicitudes" />
      <div className="space-y-6 p-5 flex-1 overflow-auto">
        <FiltersSection
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onNewRequest={handleNewRequest}
        />
        <RequestsTable
          key={refreshKey}
          filters={filters}
          onRefresh={handleRefresh}
        />
      </div>

      {/* Modal de nueva solicitud */}
      <NewRequestModal
        isOpen={isNewRequestModalOpen}
        onOpenChange={setIsNewRequestModalOpen}
        onSuccess={handleNewRequestSuccess}
      />
    </div>
  );
}
