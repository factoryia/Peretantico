import api from "@/api";
import type { Service, ServiceField } from "../types";
import type { ServiceFormValues, ServiceFieldFormValues } from "../schemas";

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
        price: 0,
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
        price: 0,
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
  searchTerm: string = "",
  page: number = 1,
  limit: number = 10
): Promise<{ services: Service[]; totalPages: number }> => {
  try {
    const { data } = await api.get("/services");
    const allServices = Array.isArray(data) ? data : [];

    const mapped: Service[] = allServices.map((s: any) => {
      const rawFields = Array.isArray(s.fields) ? s.fields : [];
      const fields: ServiceField[] = rawFields.map((f: any) => ({
        id: f._id || f.id,
        name: f.name,
        code: f.code ?? null,
        description: f.description ?? null,
        type: f.type,
        required: !!f.required,
        multiple: !!f.multiple,
        order: typeof f.order === "number" ? f.order : 0,
        options: f.options ?? null,
        status: !!f.status,
        settings: f.settings ?? null,
      }));

      return {
        id: s._id || s.id,
        categoryId: "",
        categoryName: "",
        name: s.name,
        description: s.description ?? undefined,
        price: s.price ?? 0,
        status: s.status ? "activo" : "inactivo",
        creationDate: "",
        fields,
      };
    });

    const filtered = searchTerm
      ? mapped.filter((svc) =>
          svc.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : mapped;

    const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
    const start = (page - 1) * limit;
    const services = filtered.slice(start, start + limit);

    return { services, totalPages };
  } catch (error) {
    console.error("Error fetching services (v2):", error);
    return { services: [], totalPages: 1 };
  }
};

const mapFieldToPayload = (field: ServiceFieldFormValues, index: number) => ({
  name: field.name,
  code: field.code && field.code.length > 0 ? field.code : null,
  description: field.description ?? null,
  type: field.type,
  required: field.required ?? false,
  multiple: field.multiple ?? false,
  order:
    typeof field.order === "number" && !Number.isNaN(field.order)
      ? field.order
      : index,
  options: null,
  status: field.status ?? true,
  settings: null,
});

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
    name: data.name,
    description: data.description ?? null,
    price: data.price,
    status: data.status === "activo",
    fields: (data.fields ?? []).map((field, index) =>
      mapFieldToPayload(field, index)
    ),
  };
  const response = await api.post("/services", payload);
  return response.data;
}

// Edit a service
export async function updateService(
  serviceId: string,
  data: ServiceFormValues
) {
  const payload = {
    name: data.name,
    description: data.description ?? null,
    price: data.price,
    status: data.status === "activo",
    fields: (data.fields ?? []).map((field, index) =>
      mapFieldToPayload(field, index)
    ),
  };
  const response = await api.put(`/services/${serviceId}`, payload);
  return response.data;
}

// "Eliminar" servicio: desactivar (no hay DELETE en la API nueva)
export async function deleteService(serviceId: string) {
  const response = await api.put(`/services/${serviceId}`, {
    status: false,
  });
  return response.data;
}
