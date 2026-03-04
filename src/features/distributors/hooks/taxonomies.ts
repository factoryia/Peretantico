import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { fetchDocumentTypes } from "../utils/taxonomies";
import { useQuery as useTanStackQuery } from "@tanstack/react-query";

export const useCoverageAreasQuery = () => {
  const data = useQuery(api.coverageAreas.list);
  return {
    data: data?.map((item) => ({ id: item._id, name: item.name })) || [],
    isLoading: data === undefined,
  };
};

export const useDocumentTypesQuery = () => {
  return useTanStackQuery({
    queryKey: ["documentTypes"],
    queryFn: fetchDocumentTypes,
  });
};

export const useTransportationTypesQuery = () => {
  const data = useQuery(api.transportationTypes.list);
  return {
    data: data?.map((item) => ({ id: item._id, name: item.name })) || [],
    isLoading: data === undefined,
  };
};
