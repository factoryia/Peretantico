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

const mockRequests: Request[] = [
  {
    id: "1",
    type: "node--request",
    attributes: {
      title: "Entrega de documentos urgente",
      field_application_number: "REQ-2024-001",
      field_application_score: 4,
      field_entry_date: "2024-01-15",
      field_estimated_application_hour: 2,
      field_logistics_costs: 50,
      field_service_value: 150,
      status: true,
      created: "2024-01-15T10:30:00Z",
      changed: "2024-01-15T14:20:00Z",
    },
    relationships: {
      field_applicant: {
        data: { id: "applicant1", type: "node--profile" },
      },
      field_distributor_data: {
        data: { id: "repartidor1", type: "node--distributor" },
      },
      field_subservice: {
        data: { id: "subservice1", type: "taxonomy_term--category" },
      },
      field_application_statuses: {
        data: { id: "status1", type: "taxonomy_term--application_statuses" },
      },
    },
  },
  {
    id: "2",
    type: "node--request",
    attributes: {
      title: "Recogida de paquete",
      field_application_number: "REQ-2024-002",
      field_application_score: 3,
      field_entry_date: "2024-01-14",
      field_estimated_application_hour: 1,
      field_logistics_costs: 30,
      field_service_value: 100,
      status: true,
      created: "2024-01-14T09:15:00Z",
      changed: "2024-01-14T09:15:00Z",
    },
    relationships: {
      field_applicant: {
        data: { id: "applicant2", type: "node--profile" },
      },
      field_subservice: {
        data: { id: "subservice2", type: "taxonomy_term--category" },
      },
      field_application_statuses: {
        data: { id: "status2", type: "taxonomy_term--application_statuses" },
      },
    },
  },
];



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
      sort: "-created", // Más reciente primero
    };

    // Filtro por estado de solicitud
    if (status && status !== "all") {
      params["filter[field_application_statuses.name]"] = status;
    }

    // Filtro por subservicio
    if (subservice && subservice !== "all") {
      params["filter[field_subservice.id]"] = subservice;
    }

    // Filtro por repartidor asignado
    if (assignedDistributor && assignedDistributor !== "all") {
      params["filter[field_distributor_data.id]"] = assignedDistributor;
    }

    // Filtro por número de solicitud
    if (requestNumber) {
      params["filter[field_application_number][condition][path]"] = "field_application_number";
      params["filter[field_application_number][condition][operator]"] = "CONTAINS";
      params["filter[field_application_number][condition][value]"] = requestNumber;
    }

    // Filtro por nombre del solicitante
    if (applicantName) {
      // Filtrar por el nombre del solicitante usando el campo field_full_name del perfil
      params["filter[field_applicant.field_full_name][condition][path]"] = "field_applicant.field_full_name";
      params["filter[field_applicant.field_full_name][condition][operator]"] = "CONTAINS";
      params["filter[field_applicant.field_full_name][condition][value]"] = applicantName;
    }



    const response = await api.get<RequestsApiResponse>("/api/node/request", {
      params,
    });

    // Si la API no incluye las entidades relacionadas, las obtenemos manualmente
    if (response.data.data && (!response.data.included || response.data.included.length === 0)) {
      const requests = response.data.data;
      const allIncluded: any[] = [];
      
      // Obtener todos los IDs únicos de entidades relacionadas
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
            applicantsResponse.data.data.forEach((item: any) => {
              allIncluded.push({
                id: item.id,
                type: "node--profile",
                attributes: { name: item.attributes.field_full_name }
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
            distributorsResponse.data.data.forEach((item: any) => {
              allIncluded.push({
                id: item.id,
                type: "node--distributor",
                attributes: { name: item.attributes.title }
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
            subservicesResponse.data.data.forEach((item: any) => {
              allIncluded.push({
                id: item.id,
                type: "taxonomy_term--category",
                attributes: { name: item.attributes.name }
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
            statusResponse.data.data.forEach((item: any) => {
              allIncluded.push({
                id: item.id,
                type: "taxonomy_term--application_statuses",
                attributes: { name: item.attributes.name }
              });
            });
          }
        }
        
        // Agregar las entidades incluidas a la respuesta
        response.data.included = allIncluded;
        console.log("Entidades incluidas obtenidas manualmente:", allIncluded);
        
      } catch (error) {
        console.warn("Error obteniendo entidades relacionadas:", error);
      }
    }

    return response.data;
  } catch (error) {
    console.warn("API no disponible, usando datos mock:", error);

    let filteredData = [...mockRequests];

    if (filters.requestNumber) {
      filteredData = filteredData.filter((item) =>
        item.attributes.field_application_number
          .toLowerCase()
          .includes(filters.requestNumber!.toLowerCase())
      );
    }

    if (filters.applicantName) {
      filteredData = filteredData.filter((item) =>
        item.attributes.title
          .toLowerCase()
          .includes(filters.applicantName!.toLowerCase())
      );
    }

    const { page = 1, limit = 10 } = filters;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      included: [
        {
          id: "applicant1",
          type: "node--profile",
          attributes: { name: "María González" },
        },
        {
          id: "applicant2",
          type: "node--profile",
          attributes: { name: "Carlos Rodríguez" },
        },
        {
          id: "repartidor1",
          type: "node--distributor",
          attributes: { name: "Juan Pérez" },
        },
        {
          id: "subservice1",
          type: "taxonomy_term--category",
          attributes: { name: "Entrega paquete" },
        },
        {
          id: "subservice2",
          type: "taxonomy_term--category",
          attributes: { name: "Recogida documento" },
        },
        {
          id: "status1",
          type: "taxonomy_term--application_statuses",
          attributes: { name: "En proceso" },
        },
        {
          id: "status2",
          type: "taxonomy_term--application_statuses",
          attributes: { name: "Pendiente" },
        },
      ],
      meta: {
        count: filteredData.length,
      },
    };
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
    console.log("Creating request with payload:", JSON.stringify(payload, null, 2));
    
    const response = await api.post("/api/node/request", payload, {
      headers: {
        "Content-Type": "application/vnd.api+json",
      },
    });
    
    console.log("Request created successfully:", response.data);
    return response;
  } catch (error: any) {
    console.error("Error creating request:", error);
    
    // Si es un error de permisos, dar información específica
    if (error.response?.status === 403) {
      throw new Error("Error de permisos: No tienes autorización para crear solicitudes. Verifica tu autenticación.");
    }
    
    // Si es un error de validación, dar información específica
    if (error.response?.status === 422) {
      console.error("Validation error details:", error.response.data);
      const validationErrors = error.response.data?.errors || [];
      const errorMessages = validationErrors.map((err: any) => err.detail || err.title).join(", ");
      
      if (errorMessages) {
        throw new Error(`Error de validación: ${errorMessages}`);
      } else {
        throw new Error("Error de validación: Los datos enviados no son válidos. Verifica que todos los campos requeridos estén completos.");
      }
    }
    
    // Para otros errores, propagar el error original
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
    // Función helper para obtener nombres de entidades relacionadas
    const getIncludedEntityName = (
      entityId: string,
      entityType: string,
      included?: RequestsApiResponse["included"]
    ): string => {
      try {
        if (!included || !entityId) {
          console.log(`No included data or entityId for ${entityType}`);
          return "";
        }
        
        const entity = included.find(
          (item) => item.id === entityId && item.type === entityType
        );
        
        if (entity) {
          // Manejar diferentes tipos de entidades con diferentes estructuras de atributos
          let name = "";
          
          if (entityType === "node--profile") {
            name = entity.attributes?.field_full_name || entity.attributes?.title || "";
          } else if (entityType === "node--distributor") {
            name = entity.attributes?.title || entity.attributes?.name || "";
          } else if (entityType.startsWith("taxonomy_term--")) {
            name = entity.attributes?.name || entity.attributes?.title || "";
          } else {
            name = entity.attributes?.name || entity.attributes?.title || "";
          }
          
          return name;
        } else {
          return "";
        }
      } catch (error) {
        console.error(`Error getting entity name for ${entityType}:`, error);
        return "";
      }
    };

    // Obtener IDs de las entidades relacionadas con verificación de seguridad
    const applicantId = request.relationships?.field_applicant?.data?.id;
    const distributorId = request.relationships?.field_distributor_data?.data?.id;
    const subserviceId = request.relationships?.field_subservice?.data?.id;
    const applicationStatusId = request.relationships?.field_application_statuses?.data?.id;
    const serviceStatusId = request.relationships?.field_service_status?.data?.id;



    // Si no hay entidades incluidas, mostrar los IDs en lugar de "Sin asignar"
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

    const result = {
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

    return result;
  } catch (error) {
    console.error("Error in transformRequestForDisplay:", error);
    // Retornar un objeto básico en caso de error
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

export const fetchApplicants = async () => {
  try {
    const response = await api.get("/api/node/profile", {
      params: {
        "page[limit]": 100,
        include: "field_type_document,field_gender,field_parent_type",
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
        include: "field_type_document,field_coverage_area,field_type_transportation",
      },
    });
    return response.data;
  } catch (error) {
    console.warn("API no disponible para repartidores:", error);
    return null;
  }
};

export const fetchServices = async () => {
  try {
    const response = await api.get("/api/taxonomy_tree/category", {
      params: {
        "page[limit]": 100,
      },
    });
    return response.data;
  } catch (error) {
    console.warn("API no disponible para servicios:", error);
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
    console.warn("API no disponible para subservicios:", error);
    return null;
  }
};

// Función para obtener nombre de cliente por ID
export const getCustomerNameById = async (customerId: string): Promise<string> => {
  try {
    const response = await api.get(`/api/node/profile/${customerId}`);
    return response.data.data.attributes.field_full_name || "Cliente no encontrado";
  } catch (error) {
    console.warn(`Error obteniendo cliente ${customerId}:`, error);
    return "Cliente no encontrado";
  }
};

// Función para obtener nombre de repartidor por ID
export const getDistributorNameById = async (distributorId: string): Promise<string> => {
  try {
    const response = await api.get(`/api/node/distributor/${distributorId}`);
    return response.data.data.attributes.title || "Repartidor no encontrado";
  } catch (error) {
    console.warn(`Error obteniendo repartidor ${distributorId}:`, error);
    return "Repartidor no encontrado";
  }
};

// Función para obtener nombre de subservicio por ID
export const getSubserviceNameById = async (subserviceId: string): Promise<string> => {
  try {
    const response = await api.get(`/api/taxonomy_term/category/${subserviceId}`);
    return response.data.data.attributes.name || "Servicio no encontrado";
  } catch (error) {
    console.warn(`Error obteniendo subservicio ${subserviceId}:`, error);
    return "Servicio no encontrado";
  }
};

// Función para obtener nombre de estado por ID
export const getStatusNameById = async (statusId: string): Promise<string> => {
  try {
    const response = await api.get(`/api/taxonomy_term/application_statuses/${statusId}`);
    return response.data.data.attributes.name || "Estado no encontrado";
  } catch (error) {
    console.warn(`Error obteniendo estado ${statusId}:`, error);
    return "Estado no encontrado";
  }
};
