import api from "@/api";
import type { Category } from "../types";
import type { CategoryFormValues } from "../schemas";

interface ApiResponse {
  data: {
    id: string;
    attributes: {
      name: string;
      description: { value: string | null } | null;
      status: boolean;
      revision_created: string;
    };
    relationships: {
      parent: {
        data: {
          type: string;
          id: string;
        }[];
      };
    };
  }[];
  meta: { count: number };
}

// export const fetchAllActiveCategories = async (): Promise<Category[]> => {
//   try {
//     const response = await api.get<ApiResponse>("/api/taxonomy_tree/category", {
//       params: {
//         "filter[status]": 1,
//         include: "parent",
//         "filter[parent.id]": "virtual",
//       },
//     });

//     return response.data.data.map((item: ApiResponse["data"][number]) => ({
//       uuid: item.id,
//       name: item.attributes.name,
//       description: item.attributes.description?.value ?? null,
//       status: item.attributes.status ? "activo" : "inactivo",
//       created: item.attributes.revision_created,
//     }));
//   } catch (error) {
//     console.error("Error fetching categories:", error);
//     return [];
//   }
// };

export const fetchAllActiveCategories = async (): Promise<Category[]> => {
  try {
    const response = await api.get<ApiResponse>("/api/taxonomy_tree/category", {
      params: {
        "filter[status]": 1,
      },
    });

    return response.data.data
      .filter((item: ApiResponse["data"][number]) =>
        item.relationships.parent.data.some((parent) => parent.id === "virtual")
      )
      .map((item: ApiResponse["data"][number]) => ({
        uuid: item.id,
        name: item.attributes.name,
        description: item.attributes.description?.value ?? null,
        status: item.attributes.status ? "activo" : "inactivo",
        created: item.attributes.revision_created,
      }));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};

// export const fetchAllActiveCategories = async (): Promise<Category[]> => {
//   try {
//     const response = await api.get<ApiResponse>("/api/taxonomy_tree/category", {
//       params: {
//         "filter[status]": 1,
//       },
//     });

//     return response.data.data
//       .filter((item: ApiResponse["data"][number]) =>
//         item.relationships.parent.data.some((parent) => parent.id === "virtual")
//       )
//       .map((item: ApiResponse["data"][number]) => ({
//         uuid: item.id,
//         name: item.attributes.name,
//         description: item.attributes.description?.value ?? null,
//         status: item.attributes.status ? "activo" : "inactivo",
//         created: item.attributes.revision_created,
//       }));
//   } catch (error) {
//     console.error("Error fetching categories:", error);
//     return [];
//   }
// };

// export const fetchAllActiveCategories = async (): Promise<Category[]> => {
//   try {
//     const response = await api.get<ApiResponse>("/api/taxonomy_term/category", {
//       params: {
//         "filter[status]": 1,
//       },
//     });

//     return response.data.data.map((item: ApiResponse["data"][number]) => ({
//       uuid: item.id,
//       name: item.attributes.name,
//       description: item.attributes.description?.value ?? null,
//       status: item.attributes.status ? "activo" : "inactivo",
//       created: item.attributes.revision_created,
//     }));
//   } catch (error) {
//     console.error("Error fetching categories:", error);
//     return [];
//   }
// };

// export const fetchCategories = async (
//   searchTerm: string = "",
//   page: number = 1,
//   limit: number = 10
// ): Promise<{ categories: Category[]; totalPages: number }> => {
//   try {
//     const offset = (page - 1) * limit;

//     const params: Record<string, string | number> = {
//       "page[limit]": limit,
//       "page[offset]": offset,
//     };

//     // Add name filter if searchTerm is provided
//     if (searchTerm) {
//       params["filter[name][condition][path]"] = "name";
//       params["filter[name][condition][operator]"] = "CONTAINS";
//       params["filter[name][condition][value]"] = searchTerm;
//     }

//     const response = await api.get<ApiResponse>("/api/taxonomy_term/category", {
//       params,
//     });

//     const categories: Category[] = response.data.data.map(
//       (item: ApiResponse["data"][number]) => ({
//         uuid: item.id,
//         name: item.attributes.name,
//         description: item.attributes.description?.value ?? null,
//         status: item.attributes.status ? "activo" : "inactivo",
//         created: item.attributes.revision_created,
//       })
//     );

//     const totalItems = response.data.meta?.count ?? categories.length; // Adjust based on API response
//     const totalPages = Math.ceil(totalItems / limit);

//     return { categories, totalPages };
//   } catch (error) {
//     console.error("Error fetching categories:", error);
//     return { categories: [], totalPages: 1 };
//   }
// };

export const fetchCategories = async (
  searchTerm: string = "",
  page: number = 1,
  limit: number = 10
): Promise<{ categories: Category[]; totalPages: number }> => {
  try {
    const response = await api.get<ApiResponse>("/api/taxonomy_term/category");

    // Filtro por nombre si hay término de búsqueda
    let filtered = response.data.data;

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter((item) =>
        item.attributes.name.toLowerCase().includes(lowerTerm)
      );
    }

    // Filtro por parent.id === "virtual"
    filtered = filtered.filter((item) =>
      item.relationships.parent.data.some((parent) => parent.id === "virtual")
    );

    // Total después de filtrar
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / limit);

    // Paginar localmente
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = filtered.slice(start, end);

    const categories: Category[] = paginated.map((item) => ({
      uuid: item.id,
      name: item.attributes.name,
      description: item.attributes.description?.value ?? null,
      status: item.attributes.status ? "activo" : "inactivo",
      created: item.attributes.revision_created.split("T")[0],
    }));

    return { categories, totalPages };
  } catch (error) {
    console.error("Error fetching categories:", error);
    return { categories: [], totalPages: 1 };
  }
};


export async function createCategory(data: CategoryFormValues) {
  const payload = {
    data: {
      type: "taxonomy_term--category",
      attributes: {
        name: data.name,
        description: data.description || "",
        status: data.status === "activo",
      },
    },
  };

  return api.post("/api/taxonomy_term/category", payload, {
    headers: {
      "Content-Type": "application/vnd.api+json",
    },
  });
}

export async function deleteCategory(uuid: string): Promise<void> {
  await api.delete(`/api/taxonomy_term/category/${uuid}`);
}

export async function updateCategory(uuid: string, data: CategoryFormValues) {
  const payload = {
    data: {
      id: uuid,
      type: "taxonomy_term--category",
      attributes: {
        name: data.name,
        description: data.description || "",
        status: data.status === "activo",
      },
    },
  };
  return api.patch(`/api/taxonomy_term/category/${uuid}`, payload, {
    headers: {
      "Content-Type": "application/vnd.api+json",
    },
  });
}
