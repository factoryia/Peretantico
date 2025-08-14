import { useQuery } from "@tanstack/react-query"
import { fetchRequests, fetchSubservices, fetchDistributors } from "../utils/request"
import type { RequestFilters } from "../types/request"

export const REQUESTS_QUERY_KEY = "requests"
export const SUBSERVICES_QUERY_KEY = "subservices"
export const DISTRIBUTORS_QUERY_KEY = "distributors"

export const useRequestsQuery = (filters: RequestFilters = {}) => {
  // Solo incluir filtros que tengan valores válidos
  const validFilters = Object.entries(filters).reduce((acc, [key, value]) => {
    if (value && value !== "" && value !== "all") {
      acc[key] = value
    }
    return acc
  }, {} as Record<string, string>)

  return useQuery({
    queryKey: [REQUESTS_QUERY_KEY, validFilters],
    queryFn: () => fetchRequests(validFilters),
    staleTime: 30000, // 30 segundos
    refetchOnWindowFocus: false,
  })
}

export const useSubservicesQuery = () => {
  return useQuery({
    queryKey: [SUBSERVICES_QUERY_KEY],
    queryFn: fetchSubservices,
    staleTime: 300000, // 5 minutos
    refetchOnWindowFocus: false,
  })
}

export const useDistributorsQuery = () => {
  return useQuery({
    queryKey: [DISTRIBUTORS_QUERY_KEY],
    queryFn: fetchDistributors,
    staleTime: 300000, // 5 minutos
    refetchOnWindowFocus: false,
  })
}
