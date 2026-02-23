import type { AxiosResponse } from "axios";
import type { Distributor, FetchDistributorsParams } from "../types/distributors";
import api from "@/api";
import type { DistributorFormValues } from "../schemas";

type RawDistributor = Record<string, unknown>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getStringField = (
  source: RawDistributor,
  keys: string[],
  fallback = ""
): string => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string") {
      return value;
    }
  }
  return fallback;
};

const getOptionalStringField = (
  source: RawDistributor,
  keys: string[]
): string | null => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string") {
      return value;
    }
  }
  return null;
};

const getBooleanField = (
  source: RawDistributor,
  keys: string[],
  fallback = false
): boolean => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      return value !== 0;
    }
  }
  return fallback;
};

const getTaxonomyField = (
  source: RawDistributor,
  keys: string[]
): { id: string; name: string } => {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string") {
      return { id: value, name: value };
    }

    if (isRecord(value)) {
      const id =
        typeof value.id === "string"
          ? value.id
          : getStringField(value, ["id"], "");
      const name =
        typeof value.name === "string"
          ? value.name
          : getStringField(value, ["name", "title"], "");

      return { id, name };
    }
  }

  return { id: "", name: "" };
};

export const mapToDistributor = (raw: RawDistributor): Distributor => {
  const id = getStringField(raw, ["id"]);
  const title = getStringField(raw, ["title", "name"]);
  const status = getBooleanField(raw, ["status"]);
  const currentAvailability = getBooleanField(raw, [
    "currentAvailability",
    "current_availability",
  ]);
  const documentNumber = getStringField(raw, [
    "documentNumber",
    "document_number",
  ]);
  const entryDate = getStringField(raw, ["entryDate", "entry_date", "created"]);
  const vehicleId =
    getOptionalStringField(raw, ["vehicleId", "vehicle_id"]) ?? null;
  const email =
    getOptionalStringField(raw, ["email", "mail", "field_mail"]) ?? null;
  const observations =
    getOptionalStringField(raw, ["observations", "notes"]) ?? null;
  const phoneNumber = getStringField(raw, [
    "phoneNumber",
    "phone",
    "field_phone_number",
  ]);

  const documentType = getTaxonomyField(raw, [
    "documentType",
    "document_type",
  ]);
  const coverageArea = getTaxonomyField(raw, [
    "coverageArea",
    "coverage_area",
  ]);
  const transportationType = getTaxonomyField(raw, [
    "transportationType",
    "transportation_type",
  ]);

  return {
    id,
    status,
    title,
    currentAvailability,
    documentNumber,
    entryDate,
    vehicleId,
    email,
    observations,
    phoneNumber,
    documentType,
    coverageArea,
    transportationType,
  };
};

export const fetchDistributors = async ({
  coverageAreaId,
  status,
  fullName,
  documentNumber,
  transportationTypeId,
  documentType,
  page = 1,
  limit = 10,
}: FetchDistributorsParams): Promise<{
  distributors: Distributor[];
  totalPages: number;
}> => {
  try {
    const params: Record<string, string | number | boolean> = {
      page,
      limit,
    };

    if (coverageAreaId && coverageAreaId !== "all") {
      params.coverageAreaId = coverageAreaId;
    }
    if (status !== undefined) {
      params.status = status;
    }
    if (fullName) {
      params.search = fullName;
    }
    if (documentNumber) {
      params.documentNumber = documentNumber;
    }
    if (transportationTypeId && transportationTypeId !== "all") {
      params.transportationTypeId = transportationTypeId;
    }
    if (documentType && documentType !== "all") {
      params.documentType = documentType;
    }

    const response: AxiosResponse<unknown> = await api.get("/distributors", {
      params,
    });

    const raw = response.data;

    const items: RawDistributor[] = Array.isArray(raw)
      ? raw.filter(isRecord)
      : isRecord(raw) && Array.isArray(raw.items)
      ? raw.items.filter(isRecord)
      : isRecord(raw) && Array.isArray(raw.data)
      ? raw.data.filter(isRecord)
      : [];

    const distributors: Distributor[] = items.map(mapToDistributor);

    let totalItems = distributors.length;

    if (isRecord(raw)) {
      if (typeof raw.total === "number") {
        totalItems = raw.total;
      } else if (typeof raw.count === "number") {
        totalItems = raw.count;
      } else if (
        isRecord(raw.meta) &&
        typeof raw.meta.total === "number"
      ) {
        totalItems = raw.meta.total;
      }
    }

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    return { distributors, totalPages };
  } catch (error) {
    console.error("Error fetching distributors:", error);
    return { distributors: [], totalPages: 1 };
  }
};

export const createDistributor = async (
  values: DistributorFormValues
): Promise<void> => {
  const payload = {
    title: values.title,
    documentNumber: values.documentNumber,
    phoneNumber: values.phoneNumber,
    email: values.email || null,
    vehicleId: values.vehicleId || null,
    currentAvailability: values.currentAvailability,
    entryDate: values.entryDate,
    observations: values.observations || null,
    status: values.status,
    documentType: values.documentTypeId,
    coverageAreaId: values.coverageAreaId,
    transportationTypeId: values.transportationTypeId,
  };

  try {
    const res = await api.post("/distributors", payload);
    console.log("RES: ", res);
  } catch (error: any) {
    if (error.response) {
      console.error("DEBUG - API Error Data:", error.response.data);
      console.error("DEBUG - API Error Status:", error.response.status);
    }
    throw error;
  }
};

export const updateDistributor = async (
  distributorId: string,
  values: DistributorFormValues
): Promise<void> => {
  const payload = {
    title: values.title,
    documentNumber: values.documentNumber,
    phoneNumber: values.phoneNumber,
    email: values.email || null,
    vehicleId: values.vehicleId || null,
    currentAvailability: values.currentAvailability,
    entryDate: values.entryDate,
    observations: values.observations || null,
    status: values.status,
    documentType: values.documentTypeId,
    coverageAreaId: values.coverageAreaId,
    transportationTypeId: values.transportationTypeId,
  };

  try {
    await api.put(`/distributors/${distributorId}`, payload);
  } catch (error: any) {
    if (error.response) {
      console.error("DEBUG - PATCH API Error Data:", error.response.data);
      console.error("DEBUG - PATCH API Error Status:", error.response.status);
    }
    throw error;
  }
};

export const deleteDistributor = async (
  distributorId: string
): Promise<void> => {
  await api.delete(`/distributors/${distributorId}`);
};
