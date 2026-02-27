import api from "@/api";
import type { SpecialDateFormValues } from "../schemas";
import type { SpecialDate } from "../types";

// Obtener fechas especiales paginadas y filtradas
export const fetchSpecialDates = async (
  searchTerm: string = "",
  page: number = 1,
  limit: number = 10
): Promise<{ specialDates: SpecialDate[]; totalPages: number }> => {
  try {
    const params: Record<string, string | number> = {
      page,
      limit,
    };

    if (searchTerm) {
      params.search = searchTerm;
    }

    const response = await api.get<SpecialDate[] | { data: SpecialDate[], total: number } | { items: SpecialDate[], count: number }>("/special-dates", {
      params,
    });

    let specialDates: SpecialDate[] = [];
    let totalItems = 0;

    if (Array.isArray(response.data)) {
      specialDates = response.data;
      totalItems = specialDates.length;
    } else if ('data' in response.data && Array.isArray(response.data.data)) {
      specialDates = response.data.data;
      totalItems = response.data.total || specialDates.length;
    } else if ('items' in response.data && Array.isArray(response.data.items)) {
      specialDates = response.data.items;
      totalItems = response.data.count || specialDates.length;
    }

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return { specialDates, totalPages };
  } catch {
    return { specialDates: [], totalPages: 1 };
  }
};

export async function createSpecialDate(data: SpecialDateFormValues) {
  const payload = {
    title: data.title,
    description: data.description,
    date: data.date,
    repeat: data.repeat === "si",
    status: data.status === "activo",
  };

  const response = await api.post("/special-dates", payload);
  return response.data;
}

export async function updateSpecialDate(
  id: string,
  data: SpecialDateFormValues
) {
  const payload = {
    title: data.title,
    description: data.description,
    date: data.date,
    repeat: data.repeat === "si",
    status: data.status === "activo",
  };

  const response = await api.patch(`/special-dates/${id}`, payload);
  return response.data;
}

export async function deleteSpecialDate(id: string) {
  const response = await api.delete(`/special-dates/${id}`);
  return response.data;
}
