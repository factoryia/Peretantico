import api from "@/api";
import type { Customer, Attachment } from "../types";
// import type { CustomerFormValues } from "../types";

export const fetchDocumentTypeTaxonomy = async () =>
  Promise.resolve([
    { id: "CC", name: "Cédula de ciudadanía" },
    { id: "CE", name: "Cédula de extranjería" },
    { id: "TI", name: "Tarjeta de identidad" },
    { id: "PASSPORT", name: "Pasaporte" },
    { id: "NIT", name: "Número de identificación tributaria" },
  ]);

// Helper to get name from id
export const getNameFromId = (
  id: string,
  options: { id: string; name: string }[]
) => {
  const found = options.find((option) => option.id === id);
  return found ? found.name : "N/A";
};

type RawProfile = Record<string, unknown>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getStringField = (
  source: RawProfile,
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
  source: RawProfile,
  keys: string[]
): string | "" => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string") {
      return value;
    }
  }
  return "";
};

const getIdFromField = (source: RawProfile, keys: string[]): string => {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string") {
      return value;
    }

    if (isRecord(value) && typeof value.id === "string") {
      return value.id;
    }
  }

  return "";
};

const mapToCustomer = (raw: RawProfile): Customer => {
  const id = getStringField(raw, ["id"]);

  const fullName = getStringField(raw, [
    "fullName",
    "name",
    "title",
    "field_full_name",
  ]);

  const documentNumber = getStringField(raw, [
    "documentNumber",
    "document_number",
    "field_document_number",
  ]);

  const email = getOptionalStringField(raw, [
    "email",
    "mail",
    "field_mail",
  ]);

  const phoneNumber = getStringField(raw, [
    "phoneNumber",
    "phone",
    "field_phone_number",
  ]);

  const department = getOptionalStringField(raw, [
    "department",
    "field_department",
  ]);

  const municipality = getOptionalStringField(raw, [
    "municipality",
    "field_municipality_residence",
  ]);

  const address = getOptionalStringField(raw, [
    "address",
    "field_address",
  ]);

  const documentType = getIdFromField(raw, [
    "documentTypeId",
    "documentType",
    "field_type_document",
  ]);

  let attachments: Attachment[] | undefined = undefined;
  const rawAttachments = (raw as any).attachments;
  if (Array.isArray(rawAttachments)) {
    attachments = rawAttachments
      .filter((a) => isRecord(a))
      .map((a: any) => ({
        id: typeof a.id === "string" ? a.id : "",
        url: typeof a.url === "string" ? a.url : "",
        fileName: typeof a.fileName === "string" ? a.fileName : "",
        mimeType: typeof a.mimeType === "string" ? a.mimeType : "",
        size: typeof a.size === "number" ? a.size : 0,
      }));
  }

  return {
    id,
    fullName,
    documentType,
    documentNumber,
    phoneNumber,
    email,
    department,
    municipality,
    address,
    photo_document: null,
    attachments,
  };
};

export const fetchProfiles = async (
  searchTerm: string = "",
  department: string = "",
  municipality: string = "",
  page: number = 1,
  limit: number = 10
): Promise<{
  customers: Customer[];
  totalPages: number;
  totalCount: number;
}> => {
  try {
    const params: Record<string, string | number> = {
      page,
      limit,
    };

    if (searchTerm) {
      params.search = searchTerm;
    }

    if (department) {
      params.department = department;
    }

    if (municipality) {
      params.municipality = municipality;
    }

    const response = await api.get<unknown>("/profiles", {
      params,
    });

    const raw = response.data;

    const items: RawProfile[] = Array.isArray(raw)
      ? raw.filter(isRecord)
      : isRecord(raw) && Array.isArray(raw.items)
      ? raw.items.filter(isRecord)
      : isRecord(raw) && Array.isArray(raw.data)
      ? raw.data.filter(isRecord)
      : [];

    const customers: Customer[] = items.map(mapToCustomer);

    let totalCount = customers.length;

    if (isRecord(raw)) {
      if (typeof raw.total === "number") {
        totalCount = raw.total;
      } else if (typeof raw.count === "number") {
        totalCount = raw.count;
      } else if (
        isRecord(raw.meta) &&
        typeof raw.meta.total === "number"
      ) {
        totalCount = raw.meta.total;
      }
    }

    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    return { customers, totalPages, totalCount };
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return { customers: [], totalPages: 1, totalCount: 0 };
  }
};

export const fetchProfileById = async (
  id: string
): Promise<Customer | null> => {
  try {
    const response = await api.get<unknown>(`/profiles/${id}`);
    const raw = response.data;

    if (isRecord(raw)) {
      // Handle wrapped response { data: ... }
      if (isRecord(raw.data) && !Array.isArray(raw.data)) {
        return mapToCustomer(raw.data);
      }
      // Handle direct response
      return mapToCustomer(raw);
    }
    return null;
  } catch (error) {
    console.error(`Error fetching profile with id ${id}:`, error);
    return null;
  }
};

