import api from "@/api";
import type { Service } from "../types";
import type { ServiceFormValues } from "../schemas";

// Define the interface for the category data (parent)
interface CategoryRef {
  id: string;
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
  meta: { count: number };
}

// Fetch function to get services by category UUID
export const fetchServicesByCategoryWithoutFilters = async (
  categoryUuid: string
): Promise<Service[]> => {
  try {
    const response = await api.get<ApiResponse>("/api/taxonomy_term/category", {
      params: {
        "filter[parent.id]": categoryUuid,
        include: "parent",
      },
    });

    const services: Service[] = response.data.data.map((item) => {
      const parentData = item.relationships.parent.data[0];
      let category: CategoryRef = { id: "", name: "No Parent" };

      if (parentData && parentData.id !== "virtual" && response.data.included) {
        const parent = response.data.included.find(
          (includedItem) =>
            includedItem.type === "taxonomy_term--category" &&
            includedItem.id === parentData.id
        );
        if (parent) {
          category = {
            id: parent.id,
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
  } catch {
    return [];
  }
};

export const fetchServicesByCategory = async (
  categoryUuid: string,
  searchTerm: string = "",
  page: number = 1,
  limit: number = 10
): Promise<{ services: Service[]; totalPages: number }> => {
  try {
    const offset = (page - 1) * limit;

    const params: Record<string, string | number> = {
      "filter[parent.id]": categoryUuid,
      include: "parent",
      "page[limit]": limit,
      "page[offset]": offset,
    };

    if (searchTerm) {
      params["filter[name][condition][path]"] = "name";
      params["filter[name][condition][operator]"] = "CONTAINS";
      params["filter[name][condition][value]"] = searchTerm;
    }

    const response = await api.get<ApiResponse>("/api/taxonomy_term/category", {
      params,
    });

    const services: Service[] = response.data.data.map((item) => {
      const parentData = item.relationships.parent.data[0];
      let category: CategoryRef = { id: "", name: "No Parent" };

      if (parentData && parentData.id !== "virtual" && response.data.included) {
        const parent = response.data.included.find(
          (includedItem) =>
            includedItem.type === "taxonomy_term--category" &&
            includedItem.id === parentData.id
        );
        if (parent) {
          category = {
            id: parent.id,
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

    const totalItems = response.data.meta?.count ?? services.length;
    const totalPages = Math.ceil(totalItems / limit);

    return { services, totalPages };
  } catch (error) {
    console.error("Error fetching services:", error);
    return { services: [], totalPages: 1 };
  }
};

export const fetchServices = async (
  categoryUuid: string,
  searchTerm: string = "",
  page: number = 1,
  limit: number = 10
): Promise<{ services: Service[]; totalPages: number }> => {
  try {
    const offset = (page - 1) * limit;

    const params: Record<string, string | number> = {
      "filter[parent.id]": categoryUuid,
      include: "parent",
      "page[limit]": limit,
      "page[offset]": offset,
      // Este filtro es la clave:
      // "filter[parent.id][operator]": "NOT IN",
      // "filter[parent.id][value]": "virtual",
      // Solo traer servicios que NO tienen field_code asignado (IS NULL)
      // "filter[field_code][operator]": "IS NULL",
    };

    if (searchTerm) {
      params["filter[name][condition][path]"] = "name";
      params["filter[name][condition][operator]"] = "CONTAINS";
      params["filter[name][condition][value]"] = searchTerm;
    }

    const response = await api.get<ApiResponse>("/api/taxonomy_term/category", {
      params,
    });

    console.log(response.data)

    const services: Service[] = response.data.data.map((item) => {
      const parentData = item.relationships.parent.data[0];
      let category: CategoryRef = { id: "", name: "No Parent" };

      if (parentData && parentData.id !== "virtual" && response.data.included) {
        const parent = response.data.included.find(
          (includedItem) =>
            includedItem.type === "taxonomy_term--category" &&
            includedItem.id === parentData.id
        );
        if (parent) {
          category = {
            id: parent.id,
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

    const totalItems = response.data.meta?.count ?? services.length;
    const totalPages = Math.ceil(totalItems / limit);

    return { services, totalPages };
  } catch (error) {
    console.error("Error fetching services:", error);
    return { services: [], totalPages: 1 };
  }
};

// Create a new service

// export const fetchServices = async (
//   searchTerm: string = "",
//   page: number = 1,
//   limit: number = 10
// ): Promise<{ services: Service[]; totalPages: number }> => {
//   try {
//     const offset = (page - 1) * limit;

//     const params: Record<string, string | number> = {
//       include: "parent",
//       "page[limit]": limit,
//       "page[offset]": offset,
//       // Solo traer servicios que NO tienen field_code asignado (IS NULL)
//       // "filter[field_code]": "",
//       // Y que no sean categorías raíz:
//       "filter[parent.id][operator]": "NOT IN",
//       "filter[parent.id][value]": "virtual",
//     };

//     if (searchTerm) {
//       params["filter[name][condition][path]"] = "name";
//       params["filter[name][condition][operator]"] = "CONTAINS";
//       params["filter[name][condition][value]"] = searchTerm;
//     }

//     const response = await api.get<ApiResponse>("/api/taxonomy_term/category", {
//       params,
//     });

//     const services: Service[] = response.data.data.map((item) => {
//       const parentData = item.relationships.parent.data[0];
//       let category: CategoryRef = { id: "", name: "No Parent" };

//       if (parentData && parentData.id !== "virtual" && response.data.included) {
//         const parent = response.data.included.find(
//           (includedItem) =>
//             includedItem.type === "taxonomy_term--category" &&
//             includedItem.id === parentData.id
//         );
//         if (parent) {
//           category = {
//             id: parent.id,
//             name: parent.attributes.name,
//           };
//         }
//       }

//       return {
//         id: item.id,
//         categoryId: category.id,
//         categoryName: category.name,
//         name: item.attributes.name,
//         description: item.attributes.description?.value ?? undefined,
//         status: item.attributes.status ? "activo" : "inactivo",
//         creationDate: item.attributes.revision_created.split("T")[0],
//       };
//     });

//     const totalItems = response.data.meta?.count ?? services.length;
//     const totalPages = Math.ceil(totalItems / limit);

//     return { services, totalPages };
//   } catch (error) {
//     console.error("Error fetching services:", error);
//     return { services: [], totalPages: 1 };
//   }
// };

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
