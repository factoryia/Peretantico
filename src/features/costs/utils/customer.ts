// utils.ts
import api from "@/api"; // Assuming this is an Axios instance or similar configured for your API base URL
import type {
  ProfileApiResponse,
  ProfileDataItem,
  Customer,
  CustomerFormValues,
} from "@/features/client/types";
import { fetchTaxonomyTerms } from "@/utils/global";

export const fetchGenderTaxonomy = () =>
  fetchTaxonomyTerms("/api/taxonomy_term/gender");
export const fetchParentTypeTaxonomy = () =>
  fetchTaxonomyTerms("/api/taxonomy_term/parent_type");
export const fetchDocumentTypeTaxonomy = () =>
  fetchTaxonomyTerms("/api/taxonomy_term/document_type");

// Helper to get name from id
export const getNameFromId = (
  id: string,
  options: { id: string; name: string }[]
) => {
  const found = options.find((option) => option.id === id);
  return found ? found.name : "N/A";
};

export const fetchProfiles = async (
  searchTerm: string = "",
  department: string = "",
  municipality: string = "",
  page: number = 1,
  limit: number = 10
): Promise<{ customers: Customer[]; totalPages: number }> => {
  try {
    const offset = (page - 1) * limit;
    const params: Record<string, string | number> = {
      "page[limit]": limit,
      "page[offset]": offset,
    };

    // Filtro por nombre
    if (searchTerm) {
      params["filter[field_full_name][condition][path]"] = "field_full_name";
      params["filter[field_full_name][condition][operator]"] = "CONTAINS";
      params["filter[field_full_name][condition][value]"] = searchTerm;
    }
    // Filtro por departamento
    if (department) {
      params["filter[field_department][condition][path]"] = "field_department";
      params["filter[field_department][condition][operator]"] = "CONTAINS";
      params["filter[field_department][condition][value]"] = department;
    }
    // Filtro por municipio
    if (municipality) {
      params["filter[field_municipality_residence][condition][path]"] =
        "field_municipality_residence";
      params["filter[field_municipality_residence][condition][operator]"] =
        "CONTAINS";
      params["filter[field_municipality_residence][condition][value]"] =
        municipality;
    }

    const response = await api.get<ProfileApiResponse>("/api/node/profile", {
      params,
    });

    const customers: Customer[] = response.data.data.map((item: ProfileDataItem) => ({
      id: item.id,
      fullName: item.attributes.field_full_name,
      documentNumber: item.attributes.field_document_number,
      email: item.attributes.field_mail,
      phoneNumber: item.attributes.field_phone_number,
      documentType: item.relationships.field_type_document?.data?.id ?? "",
      department: item.attributes.field_department || "",
      municipality: item.attributes.field_municipality_residence || "",
      address: item.attributes.field_address || "",
      photo_document: null,
    }));

    const totalItems = response.data.meta?.count ?? customers.length;
    const totalPages = Math.ceil(totalItems / limit);

    return { customers, totalPages };
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return { customers: [], totalPages: 1 };
  }
};

export async function createProfile(data: CustomerFormValues) {
  const payload = {
    data: {
      type: "node--profile",
      attributes: {
        title: data.fullName,
        field_full_name: data.fullName,
        field_document_number: data.documentNumber,
        field_phone_number: data.phoneNumber,
        field_mail: data.email,
        status: true, // always send status
      },
      relationships: {
        field_type_document: {
          data: data.documentType
            ? { type: "taxonomy_term--document_type", id: data.documentType }
            : null,
        },
      },
    },
  };

  return api.post("/api/node/profile", payload, {
    headers: {
      "Content-Type": "application/vnd.api+json",
    },
  });
}

export async function updateProfile(id: string, data: CustomerFormValues) {
  const payload = {
    data: {
      id: id,
      type: "node--profile",
      attributes: {
        title: data.fullName,
        field_full_name: data.fullName,
        field_document_number: data.documentNumber,
        field_phone_number: data.phoneNumber,
        field_mail: data.email ?? null, // ensure email is sent as empty string if null
        status: true, // always send status
      },
      relationships: {
        field_type_document: {
          data: data.documentType
            ? { type: "taxonomy_term--document_type", id: data.documentType }
            : null,
        },
      },
    },
  };

  return api.patch(`/api/node/profile/${id}`, payload, {
    headers: {
      "Content-Type": "application/vnd.api+json",
    },
  });
}
