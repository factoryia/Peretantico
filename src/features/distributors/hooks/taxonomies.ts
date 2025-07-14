import { useQuery } from "@tanstack/react-query";
import {
  fetchCoverageAreas,
  fetchDocumentTypes,
  fetchTransportationTypes,
} from "../utils/taxonomies";
import type { TaxonomyTerm } from "@/types/global";

interface FilterOption {
  value: string;
  label: string;
}

export const useCoverageAreasQuery = () => {
  return useQuery({
    queryKey: ["coverageAreas"],
    queryFn: fetchCoverageAreas,
    // select: (data: TaxonomyTerm[]): FilterOption[] => [
    //   { value: "all", label: "Todos" },
    //   ...data.map((term) => ({ value: term.id, label: term.name })),
    // ],
  });
};

export const useDocumentTypesQuery = () => {
  return useQuery({
    queryKey: ["documentTypes"],
    queryFn: fetchDocumentTypes,
  });
};

export const useTransportationTypesQuery = () => {
  return useQuery({
    queryKey: ["transportationTypes"],
    queryFn: fetchTransportationTypes,
  });
};
