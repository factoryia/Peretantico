import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

export interface DashboardStats {
  totalRequests: number;
  requestsByStatus: {
    Atendida: number;
    EnProceso: number;
    Finalizada: number;
    Incompleta: number;
  };
  totalDistributors: number;
  totalServices: number;
  totalPayments: number;
  totalPaymentsAmount: string;
}

export const useStatsQuery = () => {
  const stats = useQuery(api.dashboard.stats);
  return {
    data: stats,
    isLoading: stats === undefined,
  };
};
