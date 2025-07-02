import api from "@/api";
import type { Category } from "../types";

// Define the interface for the API response
interface ApiResponse {
  data: {
    id: string;
    attributes: {
      name: string;
      description: { value: string | null } | null;
      status: boolean;
      revision_created: string;
    };
  }[];
}

// Fetch function to get categories
export const fetchActiveCategories = async (): Promise<Category[]> => {
  try {
    const response = await api.get<ApiResponse>("/api/taxonomy_term/category", {
      params: {
        "filter[status]": 1,
      },
    });

    return response.data.data.map((item) => ({
      uuid: item.id,
      name: item.attributes.name,
      description: item.attributes.description?.value ?? null,
      status: item.attributes.status,
      created: item.attributes.revision_created,
    }));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};
