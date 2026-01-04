import { useQuery } from "@tanstack/react-query";
import { fetchTaxonomyTerms } from "@/utils/global";

export const usePaymentStatusesQuery = () => {
  return useQuery({
    queryKey: ["paymentStatuses"],
    queryFn: () => fetchTaxonomyTerms("/api/taxonomy_term/payment_status"),
  });
};
