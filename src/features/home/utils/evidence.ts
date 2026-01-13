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

  // Generalmente retorna un objeto con el UUID o el FID. El payload para actualizar el request usa UUID.
  return res.data.uuid[0].value;
}

export async function completeRequestWithEvidence(
  requestId: string,
  fileUuid: string
) {
  const csrfToken = localStorage.getItem(CSRF_TOKEN);

  const payload = {
    data: {
      type: "node--request",
      id: requestId,
      relationships: {
        field_image: {
          data: {
            type: "file--file",
            id: fileUuid,
          },
        },
        field_application_statuses: {
          data: {
            type: "taxonomy_term--application_statuses",
            id: "23fb747d-8ed4-4ba5-9369-150c6995eefe", // Atendida con éxito
          },
        },
      },
    },
  };

  await api.patch(`/api/node/request/${requestId}`, payload, {
    headers: {
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
      "X-Csrf-Token": csrfToken || "",
    },
  });
}
