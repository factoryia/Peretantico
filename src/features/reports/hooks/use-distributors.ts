import { useQuery } from "@tanstack/react-query";
import api from "@/api";

export interface DistributorReport {
  distributor: {
    id: string;
    uuid: string;
    title: string;
  };
  deliveries_count: number;
  delivery_type: "Normal" | "Prioritaria" | string;
  payment_status: string;
  stats_debug?: {
    priority: number;
    pending: number;
  };
}

export interface DistributorMeta {
  total_count: number;
  current_page: number;
  limit: number;
  total_pages?: number;
  export_url?: string;
}

export interface DistributorsResponse {
  data: DistributorReport[];
  meta: DistributorMeta;
}

export interface DistributorsFilters {
  page?: number;
  limit?: number;
  search?: string;
  payment_status?: string;
}

export const fetchDistributors = async (
  filters: DistributorsFilters
): Promise<DistributorsResponse> => {
  const params = new URLSearchParams();
  if (filters.page !== undefined)
    params.append("page", filters.page.toString());
  if (filters.limit !== undefined)
    params.append("limit", filters.limit.toString());
  if (filters.search) params.append("search", filters.search);
  if (filters.payment_status && filters.payment_status !== "all") {
    params.append("payment_status", filters.payment_status);
  }

  const { data } = await api.get<DistributorsResponse>(
    `/api/peretantico/distributors?${params.toString()}`
  );
  return data;
};

export const useDistributorsQuery = (filters: DistributorsFilters) => {
  return useQuery({
    queryKey: ["distributors-report", filters],
    queryFn: () => fetchDistributors(filters),
  });
};
