import api from "@/api";
import { fetchProfiles } from "@/features/client/utils/customer";
import { fetchCompleteRequests } from "./complete-request";
import type {
  RequestsApiResponse,
  RequestFilters,
  CreateRequestPayload,
  UpdateRequestPayload,
  Request,
  CreateRequestDto,
  UpdateRequestMetaDto,
  AssignDistributorDto,
  UpdateStatusDto,
  BackendRequest,
  RequestsListResponse,
} from "../types/request";

export const fetchRequests = async (
  filters: RequestFilters = {}
): Promise<RequestsApiResponse> => {
  try {
    const {
      status,
      subservice,
      assignedDistributor,
      requestNumber,
      applicantName,
      paymentStatus,
      search,
      page = 1,
      limit = 10,
    } = filters;

    const backendResponse = await fetchCompleteRequests({
      status,
      subservice,
      assignedDistributor,
      requestNumber,
      applicantName,
      paymentStatus,
      search,
      page,
      limit,
    });

    const data: Request[] = backendResponse.data.map((req: any) => ({
      id: req.id,
      type: "node--request",
      attributes: {
        drupal_internal__nid: req.drupal_internal__nid ?? 0,
        title: req.title ?? "",
        field_application_number: req.field_application_number ?? "",
        field_application_score: req.field_application_score,
        field_entry_date: req.field_entry_date,
        field_estimated_application_hour: req.field_estimated_application_hour,
        field_estimated_prioritized_hour:
          req.field_estimated_prioritized_hour ?? undefined,
        field_priority_estimated_hours:
          req.field_priority_estimated_hours ?? undefined,
        field_logistics_costs: req.field_logistics_costs,
        field_service_value: req.field_service_value,
        field_prioritized_value: req.field_prioritized_value,
        field_priority_value: req.field_priority_value,
        field_is_recurring: req.field_is_recurring,
        field_service_status: req.field_service_status,
        field_request_status: req.field_request_status,
        field_observations: req.field_observations,
        field_payment_status: undefined,
        field_used_channel: req.field_used_channel,
        status: req.status ?? true,
        promote: req.promote,
        sticky: req.sticky ?? false,
        created: req.created,
        changed: req.created,
      },
      relationships: {
        field_applicant: req.applicant
          ? { data: { id: req.applicant.id, type: "node--profile" } }
          : undefined,
        field_distributor_data: req.distributor
          ? { data: { id: req.distributor.id, type: "node--distributor" } }
          : undefined,
        field_subservice: req.subservice
          ? {
              data: {
                id: req.subservice.id,
                type: "taxonomy_term--category",
              },
            }
          : undefined,
        field_category: undefined,
        field_service: undefined,
        field_application_statuses: req.applicationStatus
          ? {
              data: {
                id: req.applicationStatus.id,
                type: "taxonomy_term--application_statuses",
              },
            }
          : undefined,
        field_service_status: undefined,
        field_payment_status: undefined,
        field_used_channel: undefined,
        field_info_service: req.infoService
          ? {
              data: {
                id: req.infoService.id,
                type: req.infoService.type,
              },
            }
          : undefined,
        field_image: undefined,
      },
    }));

    return {
      data,
      included: [],
      meta: {
        count: backendResponse.meta?.count ?? data.length,
      },
    };
  } catch (error) {
    console.error("Error fetching requests:", error);
    throw error;
  }
};

export const updateRequest = async (
  requestId: string,
  data: UpdateRequestPayload
) => {
  const attributes =
    (data?.data?.attributes as UpdateRequestPayload["data"]["attributes"]) ??
    {};
  const relationships = data?.data?.relationships;
  const serviceData =
    (data?.serviceData as { fieldId: string; value: unknown }[]) ?? [];

  const dto: UpdateRequestMetaDto = {
    title: attributes.title ?? null,
    observations: attributes.field_observations ?? null,
    status: attributes.status,
    promote: attributes.promote,
    sticky: attributes.sticky,
    isRecurring: attributes.field_is_recurring,
    entryDate: attributes.field_entry_date,
    estimatedApplicationHour: attributes.field_estimated_application_hour,
    logisticsCosts: attributes.field_logistics_costs,
    serviceValue: attributes.field_service_value,
    applicantId: relationships?.field_applicant?.data.id,
    distributorId: relationships?.field_distributor_data?.data.id,
    serviceId: attributes.serviceId ?? relationships?.field_subservice?.data.id,
    data: Array.isArray(serviceData)
      ? serviceData.map((d) => ({
          fieldId: d.fieldId,
          value: d.value,
        }))
      : undefined,
    paymentMethod: data.paymentMethod ?? null,
    isPrioritized: data.isPrioritized ?? false,
    requestStatus: data.requestStatus ?? "EnProceso",
  };

  const response = await api.put(`/requests/${requestId}`, dto);
  return response;
};

export const createRequest = async (payload: CreateRequestPayload) => {
  console.warn(
    "createRequest está obsoleto con la nueva API backend. Usa createBackendRequest.",
    payload,
  );
  throw new Error("createRequest no está soportado con la nueva API backend");
};

export const deleteRequest = async (requestId: string) => {
  try {
    await deleteBackendRequest(requestId);
  } catch (error) {
    console.warn("API no disponible para eliminación:", error);
  }
};

export const assignDistributorToRequest = async (
  requestId: string,
  distributorId: string
) => {
  const dto: AssignDistributorDto = {
    distributorId,
  };

  return assignBackendRequestDistributor(requestId, dto);
};

export const assignApplicantToRequest = async (
  requestId: string,
  applicantId: string
) => {
  try {
    console.warn(
      "assignApplicantToRequest no está implementado en la API backend. Ningún cambio fue enviado.",
      { requestId, applicantId },
    );
    return Promise.resolve({ data: { success: true } });
  } catch (error) {
    console.warn("API no disponible para asignar cliente:", error);
    return Promise.resolve({ data: { success: true } });
  }
};

export const transformRequestForDisplay = (
  request: Request,
  included?: RequestsApiResponse["included"]
) => {
  try {
    const getIncludedEntityName = (
      entityId: string,
      entityType: string,
      included?: RequestsApiResponse["included"]
    ): string => {
      if (!included || !entityId) return "";

      const entity = included.find(
        (item) => item.id === entityId && item.type === entityType
      );

      if (entity) {
        if (entityType === "node--profile") {
          return (
            (entity.attributes?.field_full_name as string) ||
            (entity.attributes?.title as string) ||
            ""
          );
        } else if (entityType === "node--distributor") {
          return (
            (entity.attributes?.title as string) ||
            (entity.attributes?.name as string) ||
            ""
          );
        } else if (entityType.startsWith("taxonomy_term--")) {
          return (
            (entity.attributes?.name as string) ||
            (entity.attributes?.title as string) ||
            ""
          );
        }
        return (
          (entity.attributes?.name as string) ||
          (entity.attributes?.title as string) ||
          ""
        );
      }
      return "";
    };

    const applicantId = request.relationships?.field_applicant?.data?.id;
    const distributorId =
      request.relationships?.field_distributor_data?.data?.id;
    const subserviceId = request.relationships?.field_subservice?.data?.id;
    const applicationStatusId =
      request.relationships?.field_application_statuses?.data?.id;
    const serviceStatusId =
      request.relationships?.field_service_status?.data?.id;

    const applicantName =
      included && included.length > 0
        ? getIncludedEntityName(applicantId || "", "node--profile", included)
        : applicantId
        ? `Cliente ID: ${applicantId}`
        : "Sin asignar";

    const distributorName =
      included && included.length > 0
        ? getIncludedEntityName(
            distributorId || "",
            "node--distributor",
            included
          )
        : distributorId
        ? `Repartidor ID: ${distributorId}`
        : "Sin asignar";

    const subserviceName =
      included && included.length > 0
        ? getIncludedEntityName(
            subserviceId || "",
            "taxonomy_term--category",
            included
          )
        : subserviceId
        ? `Servicio ID: ${subserviceId}`
        : "Sin especificar";

    const statusName =
      included && included.length > 0
        ? getIncludedEntityName(
            applicationStatusId || "",
            "taxonomy_term--application_statuses",
            included
          )
        : applicationStatusId
        ? `Estado ID: ${applicationStatusId}`
        : "Sin estado";

    const serviceStatusName =
      included && included.length > 0
        ? getIncludedEntityName(
            serviceStatusId || "",
            "taxonomy_term--application_statuses",
            included
          )
        : serviceStatusId
        ? `Estado Servicio ID: ${serviceStatusId}`
        : "Sin estado";

    return {
      id: request.id,
      number: request.attributes?.field_application_number || "Sin número",
      title: request.attributes?.title || "Sin título",
      applicantName,
      applicantId,
      subserviceName,
      subserviceId,
      distributorName,
      distributorId,
      statusName,
      statusId: applicationStatusId,
      serviceStatusName,
      serviceStatusId,
      score: request.attributes?.field_application_score || 0,
      entryDate: request.attributes?.field_entry_date || "",
      estimatedHours: request.attributes?.field_estimated_application_hour || 0,
      logisticsCosts: request.attributes?.field_logistics_costs || 0,
      serviceValue: request.attributes?.field_service_value || 0,
      status: request.attributes?.status || false,
    };
  } catch (error) {
    console.error("Error in transformRequestForDisplay:", error);
    return {
      id: request.id || "unknown",
      number: "Error en datos",
      title: "Error en datos",
      applicantName: "Error en datos",
      applicantId: "",
      subserviceName: "Error en datos",
      subserviceId: "",
      distributorName: "Error en datos",
      distributorId: "",
      statusName: "Error en datos",
      statusId: "",
      serviceStatusName: "Error en datos",
      serviceStatusId: "",
      score: 0,
      entryDate: "",
      estimatedHours: 0,
      logisticsCosts: 0,
      serviceValue: 0,
      status: false,
    };
  }
};

// Funciones para obtener entidades relacionadas
export const fetchApplicants = async () => {
  try {
    const { customers } = await fetchProfiles("", "", "", 1, 100);

    return {
      data: customers.map((customer) => ({
        id: customer.id,
        attributes: {
          field_full_name: customer.fullName,
          field_document_number: customer.documentNumber,
        },
      })),
    };
  } catch (error) {
    console.warn("API no disponible para clientes:", error);
    return null;
  }
};

export const fetchDistributors = async () => {
  try {
    const response = await api.get("/distributors", {
      params: {
        page: 1,
        limit: 1000,
      },
    });

    const raw = response.data;

    const items: any[] = Array.isArray(raw)
      ? raw
      : raw && typeof raw === "object" && Array.isArray((raw as { data?: unknown }).data)
      ? (raw as { data: unknown[] }).data
      : raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items)
      ? (raw as { items: unknown[] }).items
      : [];

    return items;
  } catch (error) {
    console.error("Error fetching distributors:", error);
    return [];
  }
};

export const fetchSubservices = async () => {
  try {
    const response = await api.get("/api/taxonomy_term/category", {
      params: {
        "page[limit]": 100,
        "filter[parent.id][condition][path]": "parent.id",
        "filter[parent.id][condition][operator]": "IS NOT NULL",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching subservices:", error);
    return null;
  }
};

export const fetchPaymentStatuses = async () => {
  try {
    const response = await api.get("/api/taxonomy_term/payment_status", {
      params: {
        "page[limit]": 100,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching payment statuses:", error);
    return null;
  }
};

export const fetchUsedChannels = async () => {
  try {
    const response = await api.get("/api/taxonomy_term/used_channel", {
      params: {
        "page[limit]": 100,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching used channels:", error);
    return null;
  }
};

export const fetchApplicationStatuses = async () => {
  try {
    const response = await api.get("/api/taxonomy_term/application_statuses", {
      params: {
        "page[limit]": 100,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching application statuses:", error);
    return null;
  }
};

// Funciones para obtener nombres por ID
export const getCustomerNameById = async (
  customerId: string
): Promise<string> => {
  try {
    const response = await api.get(`/api/node/profile/${customerId}`);
    return (
      response.data.data.attributes.field_full_name || "Cliente no encontrado"
    );
  } catch (error) {
    console.warn(`Error obteniendo cliente ${customerId}:`, error);
    return "Cliente no encontrado";
  }
};

export const getDistributorNameById = async (
  distributorId: string
): Promise<string> => {
  try {
    const response = await api.get(`/api/node/distributor/${distributorId}`);
    return response.data.data.attributes.title || "Repartidor no encontrado";
  } catch (error) {
    console.warn(`Error obteniendo repartidor ${distributorId}:`, error);
    return "Repartidor no encontrado";
  }
};

export const getSubserviceNameById = async (
  subserviceId: string
): Promise<string> => {
  try {
    const response = await api.get(
      `/api/taxonomy_term/category/${subserviceId}`
    );
    return response.data.data.attributes.name || "Servicio no encontrado";
  } catch (error) {
    console.warn(`Error obteniendo subservicio ${subserviceId}:`, error);
    return "Servicio no encontrado";
  }
};

export const getStatusNameById = async (statusId: string): Promise<string> => {
  try {
    const response = await api.get(
      `/api/taxonomy_term/application_statuses/${statusId}`
    );
    return response.data.data.attributes.name || "Estado no encontrado";
  } catch (error) {
    console.warn(`Error obteniendo estado ${statusId}:`, error);
    return "Estado no encontrado";
  }
};

// Funciones para obtener servicios por categoría
export const fetchServicesByCategory = async (categoryId: string) => {
  try {
    const response = await api.get("/api/taxonomy_term/category", {
      params: {
        "filter[parent.id]": categoryId,
        "page[limit]": 100,
      },
    });

    const services = response.data.data.map((item: { id: string; attributes?: { name?: string } }) => ({
      id: item.id,
      name: item.attributes?.name || "",
      categoryId: categoryId,
    }));

    return { services, totalPages: 1 };
  } catch (error) {
    console.error("Error fetching services by category:", error);
    return { services: [], totalPages: 1 };
  }
};

export const fetchSubservicesByService = async (serviceId: string) => {
  try {
    const response = await api.get("/api/taxonomy_term/category", {
      params: {
        "filter[parent.id]": serviceId,
        "page[limit]": 100,
      },
    });

    const subservices = response.data.data.map((item: { id: string; attributes?: { name?: string } }) => ({
      id: item.id,
      name: item.attributes?.name || "",
      serviceId: serviceId,
    }));

    return { subservices, totalPages: 1 };
  } catch (error) {
    console.error("Error fetching subservices by service:", error);
    return { subservices: [], totalPages: 1 };
  }
};

// Function to get subservice with its parent service and category information
export const fetchSubserviceWithHierarchy = async (subserviceId: string) => {
  try {
    const response = await api.get(
      `/api/taxonomy_term/category/${subserviceId}`,
      {
        params: {
          include: "parent,parent.parent",
        },
      }
    );

    const subservice = response.data.data;
    const parentService = response.data.included?.find(
      (item: { type: string; id: string }) =>
        item.type === "taxonomy_term--category" &&
        item.id === subservice.relationships?.parent?.data?.[0]?.id
    ) as { id: string; attributes?: { name?: string }; relationships?: { parent?: { data?: Array<{ id: string }> } } } | undefined;
    const parentCategory = response.data.included?.find(
      (item: { type: string; id: string }) =>
        item.type === "taxonomy_term--category" &&
        item.id === parentService?.relationships?.parent?.data?.[0]?.id
    ) as { id: string; attributes?: { name?: string } } | undefined;

    return {
      subservice: {
        id: subservice.id,
        name: subservice.attributes?.name || "",
        serviceId: parentService?.id || "",
        categoryId: parentCategory?.id || "",
      },
      service: parentService
        ? {
            id: parentService.id,
            name: parentService.attributes?.name || "",
            categoryId: parentCategory?.id || "",
          }
        : null,
      category: parentCategory
        ? {
            uuid: parentCategory.id,
            name: parentCategory.attributes?.name || "",
          }
        : null,
    };
  } catch (error) {
    console.error("Error fetching subservice hierarchy:", error);
    return null;
  }
};



export const fetchBackendRequests = async (
  params: { page?: number; limit?: number } = {},
): Promise<RequestsListResponse> => {
  const response = await api.get("/requests", { params });
  const raw = response.data;

  if (Array.isArray(raw)) {
    return { data: raw as BackendRequest[] };
  }

  type RequestsListLike = { data?: unknown[] };

  if (
    raw &&
    typeof raw === "object" &&
    Array.isArray((raw as RequestsListLike).data)
  ) {
    return raw as RequestsListResponse;
  }

  return { data: [] };
};

export const fetchBackendRequestById = async (
  id: string,
): Promise<BackendRequest | null> => {
  const response = await api.get(`/requests/${id}`);
  const request = response.data;
  if (!request) return null;
  return request as BackendRequest;
};

export const createBackendRequest = async (
  dto: CreateRequestDto,
): Promise<BackendRequest> => {
  const payload = {
    applicantId: dto.applicantId,
    serviceId: dto.serviceId,
    title: dto.title ?? null,
    entryDate: dto.entryDate,
    data: dto.data.map((item) => ({
      fieldId: item.fieldId,
      value: item.value,
    })),
    paymentMethod: dto.paymentMethod ?? null,
    isPrioritized: dto.isPrioritized ?? false,
    requestStatus: dto.requestStatus ?? "EnProceso",
    attachment: dto.attachment ?? null,
    serviceValue: dto.serviceValue,
  };

  const response = await api.post("/requests", payload);
  return response.data as BackendRequest;
};

export const updateBackendRequest = async (
  id: string,
  dto: UpdateRequestMetaDto,
): Promise<BackendRequest> => {
  const response = await api.put(`/requests/${id}`, dto);
  return response.data as BackendRequest;
};

export const assignBackendRequestDistributor = async (
  id: string,
  dto: AssignDistributorDto,
): Promise<BackendRequest> => {
  const response = await api.patch(`/requests/${id}/assign`, dto);
  return response.data as BackendRequest;
};

export const updateBackendRequestStatus = async (
  id: string,
  dto: UpdateStatusDto,
): Promise<BackendRequest> => {
  const response = await api.patch(`/requests/${id}/status`, dto);
  return response.data as BackendRequest;
};

export const deleteBackendRequest = async (id: string): Promise<void> => {
  await api.delete(`/requests/${id}`);
};
