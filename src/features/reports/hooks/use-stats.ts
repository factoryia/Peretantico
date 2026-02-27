import { useQuery } from "@tanstack/react-query";
import api from "@/api";

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

export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const { data } = await api.get<DashboardStats>("/dashboard/stats");
  return data;
};

export const useStatsQuery = () => {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
  });
};
