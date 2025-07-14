import type { TaxonomyTerm } from "@/types/global";
import { fetchTaxonomyTerms } from "@/utils/global";

export const fetchCoverageAreas = async (): Promise<TaxonomyTerm[]> => {
  return fetchTaxonomyTerms("/api/taxonomy_term/coverage_area");
};

export const fetchDocumentTypes = async (): Promise<TaxonomyTerm[]> => {
  return fetchTaxonomyTerms("/api/taxonomy_term/document_type");
};

export const fetchTransportationTypes = async (): Promise<TaxonomyTerm[]> => {
  return fetchTaxonomyTerms("/api/taxonomy_term/type_transportation");
};
