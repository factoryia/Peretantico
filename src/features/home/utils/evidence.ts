import api from "@/api";
import { CSRF_TOKEN } from "@/features/auth/constants";

export async function uploadEvidence(file: File): Promise<string> {
  const csrfToken = localStorage.getItem(CSRF_TOKEN);

  // Drupal espera una carga binaria para este tipo de endpoint
  // Nota: El endpoint es específico para el campo field_media_image de media--image
  const res = await api.post(
    `/file/upload/media/image/field_media_image?_format=json`,
    file,
    {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `file; filename="${file.name}"`,
        "X-Csrf-Token": csrfToken || "",
        // Authorization: `Basic ${btoa("admin:admin")}`,
      },
    }
  );

  if (!res.data?.fid) {
    throw new Error("No se pudo obtener el ID del archivo");
  }

  // El backend de NestJS retorna el uuid directamente como string o en la propiedad uuid
  // Usamos fid si está disponible ya que contiene el nombre de archivo con extensión
  const fileId = res.data.fid || (typeof res.data.uuid === 'string' 
    ? res.data.uuid 
    : (Array.isArray(res.data.uuid) ? res.data.uuid[0]?.value : res.data.uuid));

  if (!fileId) {
    throw new Error("No se pudo obtener el identificador del archivo");
  }

  return fileId;
}

export async function uploadServiceFieldFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await api.post("/uploads/profile-documents", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  const data = res.data as {
    url?: string;
    fileName?: string;
    mimeType?: string;
    size?: number;
  };

  if (!data || typeof data.url !== "string") {
    throw new Error("No se pudo obtener la URL del archivo");
  }

  return data.url;
}

export async function completeRequestWithEvidence(
  requestId: string,
  fileUuid: string
) {
  await api.patch(`/requests/${requestId}/status`, {
    status: true,
    observations: "Actualizada desde evidencia",
    attachment: fileUuid,
    requestStatus: "Atendida",
  });
}
