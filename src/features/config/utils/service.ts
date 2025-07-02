import api from "@/api";
import type { Service } from "../types";
import type { ServiceFormValues } from "../schemas";

// Define the interface for the category data (parent)
interface CategoryRef {
  id: number;
  name: string;
}

// Define the interface for the API response
interface ApiResponse {
  data: {
    id: string;
    attributes: {
      drupal_internal__tid: number;
      name: string;
      description: { value: string | null } | null;
      status: boolean;
      revision_created: string;
    };
    relationships: {
      parent: {
        data: { type: string; id: string }[];
      };
    };
  }[];
  included?: {
    id: string;
    type: string;
    attributes: {
      drupal_internal__tid: number;
      name: string;
    };
  }[];
}

// Fetch function to get services by category UUID
export const fetchServicesByCategory = async (
  categoryUuid: string
): Promise<Service[]> => {
  try {
    const response = await api.get<ApiResponse>(
      "https://backoffice.peretantico.com.co/api/taxonomy_term/category",
      {
        params: {
          "filter[parent.id]": categoryUuid,
          include: "parent",
        },
      }
    );

    const services: Service[] = response.data.data.map((item) => {
      const parentData = item.relationships.parent.data[0];
      let category: CategoryRef = { id: 0, name: "No Parent" };

      if (parentData && parentData.id !== "virtual" && response.data.included) {
        const parent = response.data.included.find(
          (includedItem) =>
            includedItem.type === "taxonomy_term--category" &&
            includedItem.id === parentData.id
        );
        if (parent) {
          category = {
            id: parent.attributes.drupal_internal__tid,
            name: parent.attributes.name,
          };
        }
      }

      return {
        id: item.id,
        categoryId: category.id,
        categoryName: category.name,
        name: item.attributes.name,
        description: item.attributes.description?.value ?? undefined,
        status: item.attributes.status ? "activo" : "inactivo",
        creationDate: item.attributes.revision_created.split("T")[0],
      };
    });

    console.log(
      `Fetched ${services.length} services for category UUID: ${categoryUuid}`
    );
    return services;
  } catch (error) {
    return [];
  }
};

// Create a new service
export async function createService(data: ServiceFormValues) {
  const payload = {
    data: {
      type: "taxonomy_term--category",
      attributes: {
        name: data.name,
        status: data.status === "activo",
        ...(data.description && { description: data.description }),
      },
      relationships: {
        parent: {
          data: [
            {
              type: "taxonomy_term--category",
              id: data.categoryId,
            },
          ],
        },
      },
    },
  };

  console.log(payload);

  const response = await api.post("/api/taxonomy_term/category", payload, {
    headers: {
      "Content-Type": "application/vnd.api+json",
    },
  });
  return response.data;
}

// Edit a service
export async function updateService(
  serviceId: string,
  data: ServiceFormValues
) {
  const payload = {
    data: {
      type: "taxonomy_term--category",
      id: serviceId,
      attributes: {
        name: data.name,
        description: data.description ?? "",
        status: data.status === "activo",
      },
    },
  };

  console.log("UPDATE PAYLOAD: ", payload);

  const response = await api.patch(
    `/api/taxonomy_term/category/${serviceId}`,
    payload,
    {
      headers: {
        "Content-Type": "application/vnd.api+json",
      },
    }
  );

  return response.data;
}

// Delete a service
export async function deleteService(serviceId: string) {
  const response = await api.delete(`/api/taxonomy_term/category/${serviceId}`);
  return response.data;
}
