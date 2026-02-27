import { useQuery } from "@tanstack/react-query";
import api from "@/api";

export interface DistributorsResponse {
  data: any[];
  total: number;
  page: number;
  limit: number;
  meta?: {
    lastPage?: number;
    totalPages?: number;
  };
}

export interface DistributorsFilters {
  page?: number;
  limit?: number;
  search?: string;
  paymentStatus?: string;
}

export const fetchDistributors = async (
  filters: DistributorsFilters
): Promise<DistributorsResponse> => {
  const params: Record<string, any> = {
    page: (filters.page || 0) + 1, // Base 1
    limit: filters.limit || 10,
  };
  
  if (filters.search) params.search = filters.search;
  
  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    params.paymentStatus = filters.paymentStatus;
  }

  const { data } = await api.get<DistributorsResponse>(
    "/distributors",
    { params }
  );
  return data;
};

export const useDistributorsQuery = (filters: DistributorsFilters) => {
  return useQuery({
    queryKey: ["distributors-dashboard", filters],
    queryFn: () => fetchDistributors(filters),
  });
};
