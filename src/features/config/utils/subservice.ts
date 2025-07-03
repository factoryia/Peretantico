import api from "@/api";
import type { Subservice } from "../types";
import type { SubserviceFormValues } from "../schemas";

// Para transformar la respuesta DRUPAL/JSON:API
interface CategoryRef {
  id: string;
  name: string;
}

// Respuesta de la API para subservicios (nivel 3)
interface ApiResponse {
  data: {
    id: string;
    attributes: {
      drupal_internal__tid: number;
      name: string;
      description?: string | null;
      field_code?: string | null;
      field_value?: string | number | null;
      field_priority_value?: string | number | null;
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

interface SingleApiResponse {
  data: {
    id: string;
    attributes: {
      drupal_internal__tid: number;
      name: string;
      description?: string | null;
      field_code?: string | null;
      field_value?: string | number | null;
      field_priority_value?: string | number | null;
      status: boolean;
      revision_created: string;
    };
    relationships: {
      parent: {
        data: { type: string; id: string }[];
      };
    };
  };
  included?: {
    id: string;
    type: string;
    attributes: {
      drupal_internal__tid: number;
      name: string;
    };
  }[];
}

// **1. Listar subservicios de un tipo de servicio**
export const fetchSubservicesByService = async (
  serviceUuid: string
): Promise<Subservice[]> => {
  try {
    const response = await api.get<ApiResponse>("/api/taxonomy_term/category", {
      params: {
        "filter[parent.id]": serviceUuid,
        include: "parent",
      },
    });

    console.log(response);

    return response.data.data.map((item) => {
      const attrs = item.attributes;
      const parentData = item.relationships.parent.data[0];
      let parent: CategoryRef = { id: "", name: "" };

      if (parentData && response.data.included) {
        const parentIncluded = response.data.included.find(
          (i) => i.id === parentData.id
        );
        if (parentIncluded) {
          parent = {
            id: parentIncluded.id,
            name: parentIncluded.attributes.name,
          };
        }
      }

      return {
        id: item.id,
        categoriaId: parent.id,
        categoriaNombre: parent.name,
        nombre: attrs.name,
        descripcion:
          typeof attrs.description === "string"
            ? attrs.description
            : (attrs.description && typeof attrs.description === "object" && "value" in attrs.description)
              ? ((attrs.description as { value?: string }).value ?? "")
              : "",
        codigo: attrs.field_code ?? "",
        valor: attrs.field_value?.toString() ?? "",
        valorPrioridad: attrs.field_priority_value?.toString() ?? "",
        estado: attrs.status ? "activo" : "inactivo",
        fechaCreacion: attrs.revision_created?.split("T")[0] ?? "",
        servicioId: parent.id,
        servicioNombre: parent.name,
      } as Subservice;
    });
  } catch {
    // Puedes customizar el manejo de error
    return [];
  }
};

// **2. Obtener un subservicio específico**
export const fetchSubservice = async (
  subserviceUuid: string
): Promise<Subservice | null> => {
  try {
    const { data } = await api.get<SingleApiResponse>(
      `/api/taxonomy_term/category/${subserviceUuid}`
    );
    const attrs = data.data.attributes;
    // Relacionar parent si es necesario
    const parentData = data.data.relationships?.parent?.data?.[0];
    let categoriaNombre = "";
    if (parentData && data.included) {
      const parentIncl = data.included.find((i) => i.id === parentData.id);
      categoriaNombre = parentIncl?.attributes?.name ?? "";
    }
    return {
      id: data.data.id,
      categoriaId: parentData?.id ?? "",
      categoriaNombre,
      nombre: attrs.name,
      descripcion:
        typeof attrs.description === "string"
          ? attrs.description
          : (attrs.description && typeof attrs.description === "object" && "value" in attrs.description)
            ? ((attrs.description as { value?: string }).value ?? "")
            : "",
      codigo: attrs.field_code ?? "",
      valor: attrs.field_value?.toString() ?? "",
      valorPrioridad: attrs.field_priority_value?.toString() ?? "",
      estado: attrs.status ? "activo" : "inactivo",
      fechaCreacion: attrs.revision_created?.split("T")[0] ?? "",
      servicioId: parentData?.id ?? "",
      servicioNombre: categoriaNombre,
    };
  } catch {
    return null;
  }
};

// **3. Crear subservicio**
export async function createSubservice(data: SubserviceFormValues, servicioId: string) {
  const payload = {
    data: {
      type: "taxonomy_term--category",
      attributes: {
        name: data.nombre,
        description: data.descripcion ?? "",
        field_code: data.codigo,
        field_value: data.valor,
        field_priority_value: data.valorPrioridad,
        status: data.estado === "activo",
      },
      relationships: {
        parent: {
          data: [
            {
              type: "taxonomy_term--category",
              id: servicioId,
            },
          ],
        },
      },
    },
  };

  const response = await api.post("/api/taxonomy_term/category", payload, {
    headers: { "Content-Type": "application/vnd.api+json" },
  });
  return response.data;
}

// PATCH
export async function updateSubservice(
  subserviceId: string,
  data: SubserviceFormValues
) {
  const payload = {
    data: {
      type: "taxonomy_term--category",
      id: subserviceId,
      attributes: {
        name: data.nombre,
        description: data.descripcion ?? "",
        field_code: data.codigo,
        field_value: data.valor,
        field_priority_value: data.valorPrioridad,
        status: data.estado === "activo",
      },
    },
  };
  return (
    await api.patch(`/api/taxonomy_term/category/${subserviceId}`, payload, {
      headers: { "Content-Type": "application/vnd.api+json" },
    })
  ).data;
}

// DELETE
export async function deleteSubservice(subserviceId: string) {
  return (await api.delete(`/api/taxonomy_term/category/${subserviceId}`)).data;
}
