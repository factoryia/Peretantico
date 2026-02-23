import { useQuery } from "@tanstack/react-query"
import { 
  fetchRequests, 
  fetchSubservices, 
  fetchDistributors,
  fetchPaymentStatuses,
  fetchUsedChannels,
  fetchApplicationStatuses,
  fetchServicesByCategory,
  fetchSubservicesByService
} from "../utils/request"
import { fetchAllActiveCategories } from "@/features/config/utils/category"
import { fetchServices } from "@/features/config/utils/service"
import type { RequestFilters } from "../types/request"

export const REQUESTS_QUERY_KEY = "requests"
export const SUBSERVICES_QUERY_KEY = "subservices"
export const DISTRIBUTORS_QUERY_KEY = "distributors"
export const CATEGORIES_QUERY_KEY = "categories"
export const SERVICES_QUERY_KEY = "services"
export const PAYMENT_STATUSES_QUERY_KEY = "payment_statuses"
export const USED_CHANNELS_QUERY_KEY = "used_channels"
export const APPLICATION_STATUSES_QUERY_KEY = "application_statuses"

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
    staleTime: 10000, // 10 segundos - datos considerados frescos por 10 segundos
    refetchInterval: 10000, // Refetch automático cada 10 segundos
    refetchIntervalInBackground: true, // Continuar refetching incluso cuando la pestaña no está activa
    refetchOnWindowFocus: true, // Refetch cuando la ventana vuelve a tener foco
    refetchOnMount: true, // Refetch al montar el componente
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

export const useCategoriesQuery = () => {
  return useQuery({
    queryKey: [CATEGORIES_QUERY_KEY],
    queryFn: fetchAllActiveCategories,
    staleTime: 300000, // 5 minutos
    refetchOnWindowFocus: false,
  })
}

export const usePaymentStatusesQuery = () => {
  return useQuery({
    queryKey: [PAYMENT_STATUSES_QUERY_KEY],
    queryFn: fetchPaymentStatuses,
    staleTime: 300000, // 5 minutos
    refetchOnWindowFocus: false,
  })
}

export const useUsedChannelsQuery = () => {
  return useQuery({
    queryKey: [USED_CHANNELS_QUERY_KEY],
    queryFn: fetchUsedChannels,
    staleTime: 300000, // 5 minutos
    refetchOnWindowFocus: false,
  })
}

export const useApplicationStatusesQuery = () => {
  return useQuery({
    queryKey: [APPLICATION_STATUSES_QUERY_KEY],
    queryFn: fetchApplicationStatuses,
    staleTime: 300000, // 5 minutos
    refetchOnWindowFocus: false,
  })
}

export const useServicesByCategoryQuery = (categoryId: string) => {
  return useQuery({
    queryKey: [SERVICES_QUERY_KEY, categoryId],
    queryFn: () => fetchServicesByCategory(categoryId),
    enabled: !!categoryId,
    staleTime: 300000, // 5 minutos
    refetchOnWindowFocus: false,
  })
}

export const useSubservicesByServiceQuery = (serviceId: string) => {
  return useQuery({
    queryKey: [SUBSERVICES_QUERY_KEY, serviceId],
    queryFn: () => fetchSubservicesByService(serviceId),
    enabled: !!serviceId,
    staleTime: 300000, // 5 minutos
    refetchOnWindowFocus: false,
  })
}

export const useServicesQuery = () => {
  return useQuery({
    queryKey: [SERVICES_QUERY_KEY],
    queryFn: () => fetchServices("", 1, 100),
    staleTime: 300000,
    refetchOnWindowFocus: false,
  })
}
