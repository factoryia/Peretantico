import { useQuery } from "@tanstack/react-query";
import type { FetchDistributorsParams } from "../types/distributors";
import { fetchDistributors } from "../utils/distributors";
import { DISTRIBUTORS_QUERY_KEY } from "../constants/query-keys";

interface UseDistributorsQueryProps extends FetchDistributorsParams {}

export const useDistributorsQuery = ({
  coverageAreaId,
  status,
  fullName,
  documentNumber,
  page = 1,
  limit = 10,
}: UseDistributorsQueryProps) => {
  return useQuery({
    queryKey: [
      DISTRIBUTORS_QUERY_KEY,
      { coverageAreaId, status, fullName, documentNumber, page, limit },
    ],
    queryFn: () =>
      fetchDistributors({
        coverageAreaId,
        status,
        fullName,
        documentNumber,
        page,
        limit,
      }),
  });
};
