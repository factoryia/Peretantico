import type { AxiosResponse } from "axios";
import type {
  Distributor,
  DistributorsApiResponse,
  FetchDistributorsParams,
} from "../types/distributors";
import api from "@/api";
import type { DistributorFormValues } from "../schemas";

export const fetchDistributors = async ({
  coverageAreaId,
  status,
  fullName,
  documentNumber,
  page = 1,
  limit = 10,
}: FetchDistributorsParams): Promise<{
  distributors: Distributor[];
  totalPages: number;
}> => {
  try {
    const offset = (page - 1) * limit;

    // Build query parameters
    const params: Record<string, string | number | boolean> = {
      include:
        "field_type_document,field_coverage_area,field_type_transportation",
      "page[limit]": limit,
      "page[offset]": offset,
    };

    // Add filters if provided
    if (coverageAreaId) {
      params["filter[field_coverage_area.id]"] = coverageAreaId;
    }
    if (status !== undefined) {
      params["filter[field_current_availability]"] = status ? "1" : "0";
    }
    if (fullName) {
      params["filter[title][condition][path]"] = "title";
      params["filter[title][condition][operator]"] = "CONTAINS";
      params["filter[title][condition][value]"] = fullName;
    }
    if (documentNumber) {
      params["filter[field_document_number][condition][path]"] =
        "field_document_number";
      params["filter[field_document_number][condition][operator]"] = "CONTAINS";
      params["filter[field_document_number][condition][value]"] =
        documentNumber;
    }

    // Make API request
    const response: AxiosResponse<DistributorsApiResponse> = await api.get(
      "/api/node/distributor",
      {
        params,
      }
    );

    // Process distributors
    const distributors: Distributor[] = response.data.data.map((item) => {
      // Find related data in included array
      const documentType = response.data.included?.find(
        (included) =>
          included.type === "taxonomy_term--document_type" &&
          included.id === item.relationships.field_type_document.data.id
      );
      const coverageArea = response.data.included?.find(
        (included) =>
          included.type === "taxonomy_term--coverage_area" &&
          included.id === item.relationships.field_coverage_area.data.id
      );
      const transportationType = response.data.included?.find(
        (included) =>
          included.type === "taxonomy_term--type_transportation" &&
          included.id === item.relationships.field_type_transportation.data.id
      );

      return {
        id: item.id,
        title: item.attributes.title,
        status: item.attributes.status,
        currentAvailability: item.attributes.field_current_availability,
        documentNumber: item.attributes.field_document_number,
        entryDate: item.attributes.field_entry_date,
        vehicleId: item.attributes.field_id_vehicle,
        email: item.attributes.field_mail,
        observations: item.attributes.field_observations,
        phoneNumber: item.attributes.field_phone_number,
        documentType: {
          id: item.relationships.field_type_document.data.id,
          name: documentType?.attributes.name || "Unknown",
        },
        coverageArea: {
          id: item.relationships.field_coverage_area.data.id,
          name: coverageArea?.attributes.name || "Unknown",
        },
        transportationType: {
          id: item.relationships.field_type_transportation.data.id,
          name: transportationType?.attributes.name || "Unknown",
        },
      };
    });

    // Calculate total pages
    const totalItems = response.data.meta?.count ?? distributors.length;
    const totalPages = Math.ceil(totalItems / limit);

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
    data: {
      type: "node--distributor",
      attributes: {
        title: values.title,
        field_document_number: values.documentNumber,
        field_phone_number: values.phoneNumber,
        field_mail: values.email,
        field_id_vehicle: values.vehicleId,
        field_current_availability: values.currentAvailability,
        field_entry_date: values.entryDate,
        field_observations: values.observations,
        status: values.status,
      },
      relationships: {
        field_type_document: {
          data: {
            type: "taxonomy_term--document_type",
            id: values.documentTypeId,
          },
        },
        field_coverage_area: {
          data: {
            type: "taxonomy_term--coverage_area",
            id: values.coverageAreaId,
          },
        },
        field_type_transportation: {
          data: {
            type: "taxonomy_term--type_transportation",
            id: values.transportationTypeId,
          },
        },
      },
    },
  };

  await api.post("/api/node/distributor", payload, {
    headers: {
      "Content-Type": "application/vnd.api+json",
    },
  });
};

export const updateDistributor = async (
  distributorId: string,
  values: DistributorFormValues
): Promise<void> => {
  const payload = {
    data: {
      type: "node--distributor",
      id: distributorId,
      attributes: {
        title: values.title,
        field_document_number: values.documentNumber,
        field_phone_number: values.phoneNumber,
        field_mail: values.email,
        field_id_vehicle: values.vehicleId,
        field_current_availability: values.currentAvailability,
        field_entry_date: values.entryDate,
        field_observations: values.observations,
        status: values.status,
      },
      relationships: {
        field_type_document: {
          data: {
            type: "taxonomy_term--document_type",
            id: values.documentTypeId,
          },
        },
        field_coverage_area: {
          data: {
            type: "taxonomy_term--coverage_area",
            id: values.coverageAreaId,
          },
        },
        field_type_transportation: {
          data: {
            type: "taxonomy_term--type_transportation",
            id: values.transportationTypeId,
          },
        },
      },
    },
  };

  await api.patch(`/api/node/distributor/${distributorId}`, payload, {
    headers: {
      "Content-Type": "application/vnd.api+json",
    },
  });
};

export const deleteDistributor = async (
  distributorId: string
): Promise<void> => {
  await api.delete(`/api/node/distributor/${distributorId}`);
};
