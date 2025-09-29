import api from "@/api";
import type {
  RequestsApiResponse,
  RequestFilters,
  CreateRequestPayload,
  UpdateRequestPayload,
  Request,
  AssignDistributorPayload,
  AssignApplicantPayload,
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
      page = 1,
      limit = 10,
    } = filters;

    const offset = (page - 1) * limit;
    const params: Record<string, string | number> = {
      "page[limit]": limit,
      "page[offset]": offset,
      include: "field_applicant,field_distributor_data,field_subservice,field_application_statuses,field_service_status,field_payment_status,field_used_channel",
      sort: "-created",
    };

    // Aplicar filtros
    if (status && status !== "all") {
      params["filter[field_application_statuses.name]"] = status;
    }

    if (subservice && subservice !== "all") {
      params["filter[field_subservice.id]"] = subservice;
    }

    if (assignedDistributor && assignedDistributor !== "all") {
      params["filter[field_distributor_data.id]"] = assignedDistributor;
    }

    if (requestNumber) {
      params["filter[field_application_number][condition][path]"] = "field_application_number";
      params["filter[field_application_number][condition][operator]"] = "CONTAINS";
      params["filter[field_application_number][condition][value]"] = requestNumber;
    }

    if (applicantName) {
      params["filter[field_applicant.field_full_name][condition][path]"] = "field_applicant.field_full_name";
      params["filter[field_applicant.field_full_name][condition][operator]"] = "CONTAINS";
      params["filter[field_applicant.field_full_name][condition][value]"] = applicantName;
    }

    const response = await api.get<RequestsApiResponse>("/api/node/request", {
      params,
    });

    // Obtener entidades relacionadas si no están incluidas
    if (response.data.data && (!response.data.included || response.data.included.length === 0)) {
      const requests = response.data.data;
      const allIncluded: Array<{ id: string; type: string; attributes: Record<string, unknown> }> = [];
      
      const applicantIds = new Set<string>();
      const distributorIds = new Set<string>();
      const subserviceIds = new Set<string>();
      const statusIds = new Set<string>();
      
      requests.forEach(request => {
        if (request.relationships.field_applicant?.data?.id) {
          applicantIds.add(request.relationships.field_applicant.data.id);
        }
        if (request.relationships.field_distributor_data?.data?.id) {
          distributorIds.add(request.relationships.field_distributor_data.data.id);
        }
        if (request.relationships.field_subservice?.data?.id) {
          subserviceIds.add(request.relationships.field_subservice.data.id);
        }
        if (request.relationships.field_application_statuses?.data?.id) {
          statusIds.add(request.relationships.field_application_statuses.data.id);
        }
        if (request.relationships.field_service_status?.data?.id) {
          statusIds.add(request.relationships.field_service_status.data.id);
        }
      });
      
      try {
        // Obtener clientes
        if (applicantIds.size > 0) {
          const applicantsResponse = await api.get("/api/node/profile", {
            params: {
              "filter[id][condition][path]": "id",
              "filter[id][condition][operator]": "IN",
              "filter[id][condition][value]": Array.from(applicantIds).join(","),
              "page[limit]": 100,
            }
          });
          
          if (applicantsResponse.data?.data) {
            applicantsResponse.data.data.forEach((item: Record<string, unknown>) => {
              allIncluded.push({
                id: item.id as string,
                type: "node--profile",
                attributes: { name: (item.attributes as Record<string, unknown>)?.field_full_name as string || "" }
              });
            });
          }
        }
        
        // Obtener repartidores
        if (distributorIds.size > 0) {
          const distributorsResponse = await api.get("/api/node/distributor", {
            params: {
              "filter[id][condition][path]": "id",
              "filter[id][condition][operator]": "IN",
              "filter[id][condition][value]": Array.from(distributorIds).join(","),
              "page[limit]": 100,
            }
          });
          
          if (distributorsResponse.data?.data) {
            distributorsResponse.data.data.forEach((item: Record<string, unknown>) => {
              allIncluded.push({
                id: item.id as string,
                type: "node--distributor",
                attributes: { name: (item.attributes as Record<string, unknown>)?.title as string || "" }
              });
            });
          }
        }
        
        // Obtener subservicios
        if (subserviceIds.size > 0) {
          const subservicesResponse = await api.get("/api/taxonomy_term/category", {
            params: {
              "filter[id][condition][path]": "id",
              "filter[id][condition][operator]": "IN",
              "filter[id][condition][value]": Array.from(subserviceIds).join(","),
              "page[limit]": 100,
            }
          });
          
          if (subservicesResponse.data?.data) {
            subservicesResponse.data.data.forEach((item: Record<string, unknown>) => {
              allIncluded.push({
                id: item.id as string,
                type: "taxonomy_term--category",
                attributes: { name: (item.attributes as Record<string, unknown>)?.name as string || "" }
              });
            });
          }
        }
        
        // Obtener estados
        if (statusIds.size > 0) {
          const statusResponse = await api.get("/api/taxonomy_term/application_statuses", {
            params: {
              "filter[id][condition][path]": "id",
              "filter[id][condition][operator]": "IN",
              "filter[id][condition][value]": Array.from(statusIds).join(","),
              "page[limit]": 100,
            }
          });
          
          if (statusResponse.data?.data) {
            statusResponse.data.data.forEach((item: Record<string, unknown>) => {
              allIncluded.push({
                id: item.id as string,
                type: "taxonomy_term--application_statuses",
                attributes: { name: (item.attributes as Record<string, unknown>)?.name as string || "" }
              });
            });
          }
        }
        
        response.data.included = allIncluded;
        
      } catch (error) {
        console.warn("Error obteniendo entidades relacionadas:", error);
      }
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching requests:", error);
    throw error;
  }
};

export const updateRequest = async (
  requestId: string,
  data: UpdateRequestPayload
) => {
  try {
    return api.patch(`/api/node/request/${requestId}`, data, {
      headers: {
        "Content-Type": "application/vnd.api+json",
      },
    });
  } catch (error) {
    console.warn("API no disponible para actualización:", error);
    return Promise.resolve({ data: { success: true } });
  }
};

export const createRequest = async (payload: CreateRequestPayload) => {
  try {
    let response;
    
    // Intentar JSON:API primero
    try {
      response = await api.post("/api/node/request", payload, {
        headers: {
          "Content-Type": "application/vnd.api+json",
        },
      });
      return response;
    } catch (jsonApiError: unknown) {
      if ((jsonApiError as { response?: { status?: number } })?.response?.status === 404) {
        // Intentar endpoints JSON:API alternativos
        const alternativeEndpoints = [
          "/api/node/requests",
          "/api/node/application",
          "/api/node/applications"
        ];
        
        for (const endpoint of alternativeEndpoints) {
          try {
            response = await api.post(endpoint, payload, {
              headers: {
                "Content-Type": "application/vnd.api+json",
              },
            });
            return response;
          } catch {
            continue;
          }
        }
        
        // Si todos los endpoints JSON:API fallan, intentar Drupal REST API
        // Convertir payload JSON:API al formato Drupal REST API
        const drupalPayload: Record<string, unknown> = {
          type: [{ target_id: "request_medication" }], // Usar el tipo de contenido correcto que existe
          title: [{ value: payload.data.attributes.title }],
          field_application_number: [{ value: payload.data.attributes.field_application_number }],
          field_application_score: [{ value: payload.data.attributes.field_application_score }],
          field_entry_date: [{ value: payload.data.attributes.field_entry_date }],
          field_estimated_application_hour: [{ value: payload.data.attributes.field_estimated_application_hour }],
          field_logistics_costs: [{ value: payload.data.attributes.field_logistics_costs }],
          field_service_value: [{ value: payload.data.attributes.field_service_value }],
          status: [{ value: payload.data.attributes.status ? 1 : 0 }],
          promote: [{ value: payload.data.attributes.promote ? 1 : 0 }],
          sticky: [{ value: payload.data.attributes.sticky ? 1 : 0 }],
        };
        
        // Agregar campos opcionales si existen
        if (payload.data.attributes.field_estimated_prioritized_hour) {
          drupalPayload.field_estimated_prioritized_hour = [{ value: payload.data.attributes.field_estimated_prioritized_hour }];
        }
        if (payload.data.attributes.field_prioritized_value) {
          drupalPayload.field_prioritized_value = [{ value: payload.data.attributes.field_prioritized_value }];
        }
        if (payload.data.attributes.field_is_recurring !== undefined) {
          drupalPayload.field_is_recurring = [{ value: payload.data.attributes.field_is_recurring ? 1 : 0 }];
        }
        if (payload.data.attributes.field_observations) {
          drupalPayload.field_observations = [{ value: payload.data.attributes.field_observations }];
        }
        
        // Agregar relaciones - convertir al formato Drupal
        if (payload.data.relationships) {
          if (payload.data.relationships.field_applicant?.data?.id) {
            drupalPayload.field_applicant = [{ target_id: payload.data.relationships.field_applicant.data.id }];
          }
          if (payload.data.relationships.field_distributor_data?.data?.id) {
            drupalPayload.field_distributor_data = [{ target_id: payload.data.relationships.field_distributor_data.data.id }];
          }
          if (payload.data.relationships.field_category?.data?.id) {
            drupalPayload.field_category = [{ target_id: payload.data.relationships.field_category.data.id }];
          }
          if (payload.data.relationships.field_service?.data?.id) {
            drupalPayload.field_service = [{ target_id: payload.data.relationships.field_service.data.id }];
          }
          if (payload.data.relationships.field_subservice?.data?.id) {
            drupalPayload.field_subservice = [{ target_id: payload.data.relationships.field_subservice.data.id }];
          }
          if (payload.data.relationships.field_info_service?.data?.id) {
            drupalPayload.field_info_service = [{ target_id: payload.data.relationships.field_info_service.data.id }];
          }
          if (payload.data.relationships.field_application_statuses?.data?.id) {
            drupalPayload.field_application_statuses = [{ target_id: payload.data.relationships.field_application_statuses.data.id }];
          }
          if (payload.data.relationships.field_service_status?.data?.id) {
            drupalPayload.field_service_status = [{ target_id: payload.data.relationships.field_service_status.data.id }];
          }
          if (payload.data.relationships.field_payment_status?.data?.id) {
            drupalPayload.field_payment_status = [{ target_id: payload.data.relationships.field_payment_status.data.id }];
          }
          if (payload.data.relationships.field_used_channel?.data?.id) {
            drupalPayload.field_used_channel = [{ target_id: payload.data.relationships.field_used_channel.data.id }];
          }
        }
        
        response = await api.post("/node?_format=json", drupalPayload, {
          headers: {
            "Content-Type": "application/json",
          },
        });
        
        return response;
      }
      
      // Re-lanzar el error original si no es un 404
      throw jsonApiError;
    }
  } catch (error: unknown) {
    
    if ((error as { response?: { status?: number } })?.response?.status === 403) {
      throw new Error("Error de permisos: No tienes autorización para crear solicitudes. Verifica tu autenticación.");
    }
    
    if ((error as { response?: { status?: number; data?: { errors?: Array<{ detail?: string; title?: string }> } } })?.response?.status === 422) {
      const errorObj = error as { response?: { data?: { errors?: Array<{ detail?: string; title?: string }> } } };
      const validationErrors = errorObj.response?.data?.errors || [];
      const errorMessages = validationErrors.map((err) => err.detail || err.title).join(", ");
      
      if (errorMessages) {
        throw new Error(`Error de validación: ${errorMessages}`);
      } else {
        throw new Error("Error de validación: Los datos enviados no son válidos. Verifica que todos los campos requeridos estén completos.");
      }
    }
    
    if ((error as { response?: { status?: number; data?: { errors?: Array<{ detail?: string; title?: string }>; message?: string; error?: string } } })?.response?.status === 400) {
      const errorObj = error as { response?: { data?: { errors?: Array<{ detail?: string; title?: string }>; message?: string; error?: string } } };
      const errorData = errorObj.response?.data;
      
      if (errorData?.errors && Array.isArray(errorData.errors)) {
        const errorMessages = errorData.errors.map((err) => err.detail || err.title).join(", ");
        throw new Error(`Error en la solicitud: ${errorMessages}`);
      } else if (errorData?.message) {
        throw new Error(`Error en la solicitud: ${errorData.message}`);
      } else if (errorData?.error) {
        throw new Error(`Error en la solicitud: ${errorData.error}`);
      } else {
        throw new Error("Error en la solicitud: Los datos enviados no son válidos. Verifica que todos los campos requeridos estén completos.");
      }
    }
    
    throw error;
  }
};

export const deleteRequest = async (requestId: string) => {
  try {
    return api.delete(`/api/node/request/${requestId}`);
  } catch (error) {
    console.warn("API no disponible para eliminación:", error);
    return Promise.resolve({ data: { success: true } });
  }
};

export const assignDistributorToRequest = async (
  requestId: string,
  distributorId: string
) => {
  try {
    const payload: AssignDistributorPayload = {
      data: {
        type: "node--request",
        id: requestId,
        relationships: {
          field_distributor_data: {
            data: { type: "node--distributor", id: distributorId }
          }
        }
      }
    };

    return api.patch(`/api/node/request/${requestId}`, payload, {
      headers: {
        "Content-Type": "application/vnd.api+json",
        "X-Csrf-Token": localStorage.getItem("csrf_token") || "",
      },
    });
  } catch (error) {
    console.warn("API no disponible para asignar repartidor:", error);
    return Promise.resolve({ data: { success: true } });
  }
};

export const assignApplicantToRequest = async (
  requestId: string,
  applicantId: string
) => {
  try {
    const payload: AssignApplicantPayload = {
      data: {
        type: "node--request",
        id: requestId,
        relationships: {
          field_applicant: {
            data: { type: "node--profile", id: applicantId }
          }
        }
      }
    };

    return api.patch(`/api/node/request/${requestId}`, payload, {
      headers: {
        "Content-Type": "application/vnd.api+json",
        "X-Csrf-Token": localStorage.getItem("csrf_token") || "",
      },
    });
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
      
      if (entity && entity.attributes) {
        const attrs = entity.attributes as Record<string, unknown>;
        if (entityType === "node--profile") {
          return (attrs?.field_full_name as string) || (attrs?.title as string) || "";
        } else if (entityType === "node--distributor") {
          return (attrs?.title as string) || (attrs?.name as string) || "";
        } else if (entityType.startsWith("taxonomy_term--")) {
          return (attrs?.name as string) || (attrs?.title as string) || "";
        }
        return (attrs?.name as string) || (attrs?.title as string) || "";
      }
      return "";
    };

    const applicantId = request.relationships?.field_applicant?.data?.id;
    const distributorId = request.relationships?.field_distributor_data?.data?.id;
    const subserviceId = request.relationships?.field_subservice?.data?.id;
    const applicationStatusId = request.relationships?.field_application_statuses?.data?.id;
    const serviceStatusId = request.relationships?.field_service_status?.data?.id;

    const applicantName = included && included.length > 0 
      ? getIncludedEntityName(applicantId || "", "node--profile", included)
      : applicantId ? `Cliente ID: ${applicantId}` : "Sin asignar";
      
    const distributorName = included && included.length > 0
      ? getIncludedEntityName(distributorId || "", "node--distributor", included)
      : distributorId ? `Repartidor ID: ${distributorId}` : "Sin asignar";
      
    const subserviceName = included && included.length > 0
      ? getIncludedEntityName(subserviceId || "", "taxonomy_term--category", included)
      : subserviceId ? `Servicio ID: ${subserviceId}` : "Sin especificar";
      
    const statusName = included && included.length > 0
      ? getIncludedEntityName(applicationStatusId || "", "taxonomy_term--application_statuses", included)
      : applicationStatusId ? `Estado ID: ${applicationStatusId}` : "Sin estado";
      
    const serviceStatusName = included && included.length > 0
      ? getIncludedEntityName(serviceStatusId || "", "taxonomy_term--application_statuses", included)
      : serviceStatusId ? `Estado Servicio ID: ${serviceStatusId}` : "Sin estado";

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
    const response = await api.get("/api/node/profile", {
      params: {
        "page[limit]": 100,
      },
    });
    return response.data;
  } catch (error) {
    console.warn("API no disponible para clientes:", error);
    return null;
  }
};

export const fetchDistributors = async () => {
  try {
    const response = await api.get("/api/node/distributor", {
      params: {
        "page[limit]": 100,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching distributors:", error);
    return null;
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
export const getCustomerNameById = async (customerId: string): Promise<string> => {
  try {
    const response = await api.get(`/api/node/profile/${customerId}`);
    return response.data.data.attributes.field_full_name || "Cliente no encontrado";
  } catch (error) {
    console.warn(`Error obteniendo cliente ${customerId}:`, error);
    return "Cliente no encontrado";
  }
};

export const getDistributorNameById = async (distributorId: string): Promise<string> => {
  try {
    const response = await api.get(`/api/node/distributor/${distributorId}`);
    return response.data.data.attributes.title || "Repartidor no encontrado";
  } catch (error) {
    console.warn(`Error obteniendo repartidor ${distributorId}:`, error);
    return "Repartidor no encontrado";
  }
};

export const getSubserviceNameById = async (subserviceId: string): Promise<string> => {
  try {
    const response = await api.get(`/api/taxonomy_term/category/${subserviceId}`);
    return response.data.data.attributes.name || "Servicio no encontrado";
  } catch (error) {
    console.warn(`Error obteniendo subservicio ${subserviceId}:`, error);
    return "Servicio no encontrado";
  }
};

export const getStatusNameById = async (statusId: string): Promise<string> => {
  try {
    const response = await api.get(`/api/taxonomy_term/application_statuses/${statusId}`);
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
    
    const services = response.data.data.map((item: Record<string, unknown>) => ({
      id: item.id as string,
      name: (item.attributes as Record<string, unknown>)?.name as string || "",
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
    
    const subservices = response.data.data.map((item: Record<string, unknown>) => ({
      id: item.id as string,
      name: (item.attributes as Record<string, unknown>)?.name as string || "",
      serviceId: serviceId,
    }));
    
    return { subservices, totalPages: 1 };
  } catch (error) {
    console.error("Error fetching subservices by service:", error);
    return { subservices: [], totalPages: 1 };
  }
};

// Función para obtener subservicio con información de servicio padre y categoría
export const fetchSubserviceWithHierarchy = async (subserviceId: string) => {
  try {
    const response = await api.get(`/api/taxonomy_term/category/${subserviceId}`, {
      params: {
        include: "parent,parent.parent",
      },
    });
    
    const subservice = response.data.data;
    const parentService = response.data.included?.find(
      (item: Record<string, unknown>) => item.type === "taxonomy_term--category" && item.id === subservice.relationships?.parent?.data?.[0]?.id
    );
    const parentCategory = response.data.included?.find(
      (item: Record<string, unknown>) => item.type === "taxonomy_term--category" && item.id === parentService?.relationships?.parent?.data?.[0]?.id
    );
    
    return {
      subservice: {
        id: subservice.id,
        name: subservice.attributes?.name || "",
        serviceId: parentService?.id || "",
        categoryId: parentCategory?.id || "",
      },
      service: parentService ? {
        id: parentService.id,
        name: parentService.attributes?.name || "",
        categoryId: parentCategory?.id || "",
      } : null,
      category: parentCategory ? {
        uuid: parentCategory.id,
        name: parentCategory.attributes?.name || "",
      } : null,
    };
  } catch (error) {
    console.error("Error fetching subservice hierarchy:", error);
    return null;
  }
};

// Función para obtener áreas de cobertura
export const fetchCoverageAreas = async () => {
  try {
    const accessToken = localStorage.getItem("peretantico_access_token");
    if (!accessToken) {
      return { coverageAreas: [] };
    }

    const response = await api.get("/jsonapi/taxonomy_term/coverage_area", {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/vnd.api+json",
      },
    });

    return response.data;
  } catch {
    // Retornar datos vacíos en lugar de lanzar error
    return { coverageAreas: [] };
  }
};

