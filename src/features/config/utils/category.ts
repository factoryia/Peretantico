import api from "@/api";
import type { Category } from "../types";

interface ApiResponse {
  data: {
    id: string;
    attributes: {
      name: string;
      description: { value: string | null } | null;
      status: boolean;
      revision_created: string;
    };
  }[];
}


export const fetchActiveCategories = async (): Promise<Category[]> => {
  try {
    const response = await api.get<ApiResponse>("/api/taxonomy_term/category", {
      params: {
        "filter[status]": 1,
      },
    });

    return response.data.data.map((item: ApiResponse["data"][number]) => ({
      uuid: item.id,
      name: item.attributes.name,
      description: item.attributes.description?.value ?? null,
      status: item.attributes.status,
      created: item.attributes.revision_created,
    }));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};

export async function createCategory({
  nombre,
  descripcion,
  estado,
}: {
  nombre: string;
  descripcion?: string;
  estado: "activo" | "inactivo";
}) {
  // Toma los tokens del localStorage
  const csrfToken = localStorage.getItem("CSRF_TOKEN");

  const payload = {
    data: {
      type: "taxonomy_term--category",
      attributes: {
        name: nombre,
        description: descripcion || "",
        status: estado === "activo",
      },
    },
  };

  return api.post("/api/taxonomy_term/category", payload, {
    headers: {
      "Content-Type": "application/vnd.api+json",
      "X-Csrf-Token": csrfToken,
    },
  });
}

export async function deleteCategory(uuid: string): Promise<void> {
  const csrfToken = localStorage.getItem("CSRF_TOKEN");

  await api.delete(`/api/taxonomy_term/category/${uuid}`, {
    headers: {
      "Content-Type": "application/vnd.api+json",
      "X-Csrf-Token": csrfToken,
    },
  });
}

export async function updateCategory(
  uuid: string,
  {
    nombre,
    descripcion,
    estado,
  }: {
    nombre: string;
    descripcion?: string;
    estado: "activo" | "inactivo";
  }
) {
  const csrfToken = localStorage.getItem("CSRF_TOKEN");
  const payload = {
    data: {
      id: uuid,
      type: "taxonomy_term--category",
      attributes: {
        name: nombre,
        description: descripcion || "",
        status: estado === "activo",
      },
    },
  };
  return api.patch(`/api/taxonomy_term/category/${uuid}`, payload, {
    headers: {
      "Content-Type": "application/vnd.api+json",
      "X-Csrf-Token": csrfToken,
    },
  });
}
