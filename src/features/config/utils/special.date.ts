import api from "@/api";
import type { SpecialDateFormValues } from "../schemas";
import type { SpecialDate } from "../types";

interface SpecialDateApiItem {
  id: string;
  type: string;
  attributes: SpecialDate;
}

interface SpecialDateApiResponse {
  data: SpecialDateApiItem[];
  meta: { count: number };
}

// Obtener fechas especiales paginadas y filtradas
export const fetchSpecialDates = async (
  searchTerm: string = "",
  page: number = 1,
  limit: number = 10
): Promise<{ specialDates: SpecialDate[]; totalPages: number }> => {
  try {
    const offset = (page - 1) * limit;
    const params: Record<string, string | number> = {
      "filter[title][condition][path]": "title",
      "filter[title][condition][operator]": "CONTAINS",
      "filter[title][condition][value]": searchTerm,
      "page[limit]": limit,
      "page[offset]": offset,
    };

    const response = await api.get<SpecialDateApiResponse>("/api/node/dates", {
      params,
    });
    const totalItems = response.data.meta?.count ?? response.data.data.length;
    const totalPages = Math.ceil(totalItems / limit);

    const specialDates = response.data.data.map((item) => ({
      ...item.attributes,
      id: item.id,
    }));

    return { specialDates, totalPages };
  } catch {
    return { specialDates: [], totalPages: 1 };
  }
};

export async function createSpecialDate(data: SpecialDateFormValues) {
  const payload = {
    data: {
      type: "node--dates",
      attributes: {
        title: data.title,
        field_date: data.field_date,
        field_description: data.field_description ?? "",
        field_is_annual: data.field_is_annual === "si", // <-- STRING A BOOLEAN
        status: data.status === "activo", // <-- STRING A BOOLEAN
        promote: false,
        sticky: false,
      },
    },
  };

  const response = await api.post("/api/node/dates", payload, {
    headers: {
      "Content-Type": "application/vnd.api+json",
    },
  });
  return response.data;
}

export async function updateSpecialDate(
  id: string,
  data: SpecialDateFormValues
) {
  const payload = {
    data: {
      type: "node--dates",
      id,
      attributes: {
        title: data.title,
        field_date: data.field_date,
        field_description: data.field_description ?? "",
        field_is_annual: data.field_is_annual === "si", // <-- STRING A BOOLEAN
        status: data.status === "activo", // <-- STRING A BOOLEAN
        promote: false,
        sticky: false,
      },
    },
  };

  const response = await api.patch(`/api/node/dates/${id}`, payload, {
    headers: {
      "Content-Type": "application/vnd.api+json",
    },
  });

  return response.data;
}
