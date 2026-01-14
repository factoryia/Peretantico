import { useQuery } from "@tanstack/react-query";
import api from "@/api";

export interface ReportRequest {
  id: string;
  nid: string;
  service: {
    id: string;
    uuid: string;
    title: string;
    type: string;
    type_label: string;
    is_priority: boolean;
  };
  billing_value: number;
  price: number;
  status: {
    id: string;
    uuid: string;
    name: string;
  } | null;
  distributor: {
    id: string;
    uuid: string;
    title: string;
  } | null;
  payment_status: {
    id: string;
    uuid: string;
    name: string;
  } | null;
  priority_type: string;
  priority_value: number;
  entry_date: string | null;
}

export interface ReportMeta {
  total_count: number;
  current_page: number;
  limit: number;
  total_pages: number;
  export_url: string;
}

export interface ReportsResponse {
  data: ReportRequest[];
  meta: ReportMeta;
}

export interface ReportsFilters {
  page?: number;
  limit?: number;
  period?: string[];
  service?: string;
  billing?: string;
}

export const fetchReports = async (
  filters: ReportsFilters
): Promise<ReportsResponse> => {
  const params = new URLSearchParams();
  if (filters.page !== undefined)
    params.append("page", filters.page.toString());
  if (filters.limit !== undefined)
    params.append("limit", filters.limit.toString());
  if (filters.service) params.append("service", filters.service);
  if (filters.billing) params.append("billing", filters.billing);
  if (filters.period) {
    filters.period.forEach((p) => params.append("period", p));
  }

  const { data } = await api.get<ReportsResponse>(
    `/api/peretantico/requests?${params.toString()}`
  );
  return data;
};

export const useReportsQuery = (filters: ReportsFilters) => {
  return useQuery({
    queryKey: ["reports", filters],
    queryFn: () => fetchReports(filters),
  });
};
