import { useQuery } from "@tanstack/react-query";
import { fetchPayments } from "../utils/costs";

export const usePaymentsQuery = (params: { page?: number; limit?: number } = {}) => {
  return useQuery({
    queryKey: ["payments", params],
    queryFn: () => fetchPayments(params),
  });
};
