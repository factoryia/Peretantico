import api from "@/api";
import type { TaxonomyTerm } from "@/types/global";

export const fetchCoverageAreas = async (): Promise<TaxonomyTerm[]> => {
  const response = await api.get("/coverage-areas");
  return Array.isArray(response.data)
    ? response.data.map((item: any) => ({
        id: item.id,
        name: item.name,
      }))
    : [];
};

export const fetchDocumentTypes = async (): Promise<TaxonomyTerm[]> => {
  return [
    { id: "CC", name: "Cédula de ciudadanía" },
    { id: "CE", name: "Cédula de extranjería" },
    { id: "TI", name: "Tarjeta de identidad" },
    { id: "PASSPORT", name: "Pasaporte" },
    { id: "NIT", name: "Número de identificación tributaria" },
  ];
};

export const fetchTransportationTypes = async (): Promise<TaxonomyTerm[]> => {
  const response = await api.get("/transportation-types");
  return Array.isArray(response.data)
    ? response.data.map((item: any) => ({
        id: item.id,
        name: item.name,
      }))
    : [];
};

export const createCoverageArea = async (name: string) => {
  const response = await api.post("/coverage-areas", { name });
  return response.data;
};

export const createTransportationType = async (name: string) => {
  const response = await api.post("/transportation-types", { name });
  return response.data;
};

export const updateCoverageArea = async (
  id: string,
  data: { name?: string; description?: string; status?: boolean }
) => {
  const response = await api.put(`/coverage-areas/${id}`, data);
  return response.data;
};

export const deleteCoverageArea = async (id: string) => {
  await api.delete(`/coverage-areas/${id}`);
};

export const updateTransportationType = async (
  id: string,
  data: { name?: string; description?: string; status?: boolean }
) => {
  const response = await api.put(`/transportation-types/${id}`, data);
  return response.data;
};

export const deleteTransportationType = async (id: string) => {
  await api.delete(`/transportation-types/${id}`);
};
