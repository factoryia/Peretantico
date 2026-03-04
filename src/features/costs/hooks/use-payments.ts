import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

export const usePaymentsQuery = (params: { page?: number; limit?: number } = {}) => {
  const data = useQuery(api.payments.listPayments, {
    page: params.page,
    limit: params.limit,
  });

  return {
    data,
    isLoading: data === undefined,
  };
};
