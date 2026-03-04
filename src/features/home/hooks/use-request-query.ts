import { useQuery as useTanstackQuery } from "@tanstack/react-query"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
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

  return useTanstackQuery({
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
  return useTanstackQuery({
    queryKey: [SUBSERVICES_QUERY_KEY],
    queryFn: fetchSubservices,
    staleTime: 300000, // 5 minutos
    refetchOnWindowFocus: false,
  })
}

export const useDistributorsQuery = () => {
  const distributors = useQuery(api.distributors.listAll, {});
  
  // Transform to match expected format (array with id and title)
  const data = distributors?.map(d => ({
    id: d._id,
    title: d.title,
    // Add other fields if necessary
  })) || [];

  return {
    data,
    isLoading: distributors === undefined
  };
}

export const useCategoriesQuery = () => {
  return useTanstackQuery({
    queryKey: [CATEGORIES_QUERY_KEY],
    queryFn: fetchAllActiveCategories,
    staleTime: 300000, // 5 minutos
    refetchOnWindowFocus: false,
  })
}

export const usePaymentStatusesQuery = () => {
  return useTanstackQuery({
    queryKey: [PAYMENT_STATUSES_QUERY_KEY],
    queryFn: fetchPaymentStatuses,
    staleTime: 300000, // 5 minutos
    refetchOnWindowFocus: false,
  })
}

export const useUsedChannelsQuery = () => {
  return useTanstackQuery({
    queryKey: [USED_CHANNELS_QUERY_KEY],
    queryFn: fetchUsedChannels,
    staleTime: 300000, // 5 minutos
    refetchOnWindowFocus: false,
  })
}

export const useApplicationStatusesQuery = () => {
  return useTanstackQuery({
    queryKey: [APPLICATION_STATUSES_QUERY_KEY],
    queryFn: fetchApplicationStatuses,
    staleTime: 300000, // 5 minutos
    refetchOnWindowFocus: false,
  })
}

export const useServicesByCategoryQuery = (categoryId: string) => {
  return useTanstackQuery({
    queryKey: [SERVICES_QUERY_KEY, categoryId],
    queryFn: () => fetchServicesByCategory(categoryId),
    enabled: !!categoryId,
    staleTime: 300000, // 5 minutos
    refetchOnWindowFocus: false,
  })
}

export const useSubservicesByServiceQuery = (serviceId: string) => {
  return useTanstackQuery({
    queryKey: [SUBSERVICES_QUERY_KEY, serviceId],
    queryFn: () => fetchSubservicesByService(serviceId),
    enabled: !!serviceId,
    staleTime: 300000, // 5 minutos
    refetchOnWindowFocus: false,
  })
}

export const useServicesQuery = () => {
  const services = useQuery(api.services.listAll, {});

  // Transform to match expected format { services: [{ id, name }] }
  const data = {
    services: services?.map(s => ({
      id: s._id,
      name: s.name,
      // Add other fields if necessary
    })) || []
  };

  return {
    data,
    isLoading: services === undefined
  };
}
