import api from "@/api";
import type { TaxonomyApiResponse, TaxonomyTerm } from "@/types/global";
import type { AxiosResponse } from "axios";

export const fetchTaxonomyTerms = async (
  endpoint: string
): Promise<TaxonomyTerm[]> => {
  try {
    const response: AxiosResponse<TaxonomyApiResponse> = await api.get(
      endpoint
    );

    return response.data.data.map((item) => ({
      id: item.id,
      name: item.attributes.name,
    }));
  } catch (error) {
    console.error(`Error fetching taxonomy terms from ${endpoint}:`, error);
    return [];
  }
};
