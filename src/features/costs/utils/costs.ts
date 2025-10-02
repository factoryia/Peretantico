// utils/costs.ts
import api from "@/api";
import type { Distributor, Request, CostRecord, PaymentCalculation } from "../types";
import type { AxiosResponse } from "axios";

// Interfaces para las respuestas de la API
interface DistributorsApiResponse {
  data: Array<{
    id: string;
    attributes: {
      title: string;
      status: boolean;
      field_current_availability: boolean;
      field_document_number: string;
      field_entry_date: string;
      field_id_vehicle: string;
      field_mail: string;
      field_observations: string | null;
      field_phone_number: string;
    };
    relationships: {
      field_type_document: { data: { id: string } };
      field_coverage_area: { data: { id: string } };
      field_type_transportation: { data: { id: string } };
    };
  }>;
  included?: Array<{
    id: string;
    type: string;
    attributes: { name: string };
  }>;
  meta?: { count: number };
}

interface RequestsApiResponse {
  data: Array<{
    id: string;
    attributes: {
      title: string;
      field_application_number: string;
      field_entry_date: string;
      field_estimated_application_hour: number;
      field_logistics_costs: number;
      field_service_value: number;
      status: boolean;
    };
    relationships: {
      field_applicant?: { data?: { id: string } };
      field_distributor_data?: { data?: { id: string } };
      field_subservice?: { data?: { id: string } };
      field_service?: { data?: { id: string } };
      field_category?: { data?: { id: string } };
      field_application_statuses?: { data?: { id: string } };
      field_payment_status?: { data?: { id: string } };
    };
  }>;
  included?: Array<{
    id: string;
    type: string;
    attributes: Record<string, unknown>;
  }>;
  meta?: { count: number };
}

interface PaymentsApiResponse {
  data: Array<{
    id: string;
    attributes: {
      title: string;
      field_base_value?: number;
      field_additional_value?: number;
      field_discount_value?: number;
      field_total_value?: number;
      field_additional_amount?: number;
      field_discount_amount?: number;
      created: string;
      changed: string;
    };
    relationships: {
      field_distributor_data?: { data?: { id: string } };
      field_request?: { data?: { id: string } | Array<{ id: string }> };
      field_payment_status?: { data?: { id: string } };
    };
  }>;
  included?: Array<{
    id: string;
    type: string;
    attributes: Record<string, unknown>;
  }>;
  meta?: { count: number };
}

// Función para obtener todos los distribuidores
export const fetchDistributors = async (): Promise<Distributor[]> => {
  try {
    const response: AxiosResponse<DistributorsApiResponse> = await api.get("/api/node/distributor", {
      params: {
        "page[limit]": 100,
        include: "field_type_document,field_coverage_area,field_type_transportation",
      },
    });

    // Procesar distribuidores
    const distributors: Distributor[] = response.data.data.map((item) => {
      // Buscar datos relacionados en el array included
      const documentType = response.data.included?.find(
        (included) =>
          included.type === "taxonomy_term--document_type" &&
          included.id === item.relationships.field_type_document.data.id
      );
      const coverageArea = response.data.included?.find(
        (included) =>
          included.type === "taxonomy_term--coverage_area" &&
          included.id === item.relationships.field_coverage_area.data.id
      );
      const transportationType = response.data.included?.find(
        (included) =>
          included.type === "taxonomy_term--type_transportation" &&
          included.id === item.relationships.field_type_transportation.data.id
      );

      return {
        id: item.id,
        title: item.attributes.title,
        status: item.attributes.status,
        currentAvailability: item.attributes.field_current_availability,
        documentNumber: item.attributes.field_document_number,
        entryDate: item.attributes.field_entry_date,
        vehicleId: item.attributes.field_id_vehicle,
        email: item.attributes.field_mail,
        observations: item.attributes.field_observations,
        phoneNumber: item.attributes.field_phone_number,
        documentType: {
          id: item.relationships.field_type_document.data.id,
          name: documentType?.attributes.name || "Unknown",
        },
        coverageArea: {
          id: item.relationships.field_coverage_area.data.id,
          name: coverageArea?.attributes.name || "Unknown",
        },
        transportationType: {
          id: item.relationships.field_type_transportation.data.id,
          name: transportationType?.attributes.name || "Unknown",
        },
      };
    });

    return distributors;
  } catch (error) {
    console.error("Error fetching distributors:", error);
    throw error;
  }
};

// Función para obtener solicitudes asignadas a un distribuidor
export const fetchAssignedRequests = async (distributorId: string): Promise<Request[]> => {
  try {
    console.log("Fetching requests for distributor:", distributorId);
    
    // Intentar diferentes filtros para encontrar el correcto
    const filterOptions = [
      // Opción 1: Filtro directo por ID
      { "filter[field_distributor_data.id]": distributorId },
      // Opción 2: Filtro con condición
      { 
        "filter[field_distributor_data][condition][path]": "field_distributor_data.id",
        "filter[field_distributor_data][condition][operator]": "=",
        "filter[field_distributor_data][condition][value]": distributorId
      },
      // Opción 3: Filtro por target_id
      { "filter[field_distributor_data.target_id]": distributorId },
      // Opción 4: Sin filtro (obtener todas)
      {}
    ];

    let response: AxiosResponse<RequestsApiResponse> | null = null;
    let lastError: unknown = null;

    for (let i = 0; i < filterOptions.length; i++) {
      try {
        console.log(`Trying filter option ${i + 1}:`, filterOptions[i]);
        
        response = await api.get("/api/node/request", {
          params: {
            "page[limit]": 100,
            include: "field_subservice,field_distributor_data,field_payment_status",
            sort: "-created",
            ...filterOptions[i],
          },
        });

        console.log(`Filter option ${i + 1} success:`, response?.data);
        break; // Si funciona, salir del loop
      } catch (error) {
        console.log(`Filter option ${i + 1} failed:`, error);
        lastError = error;
        continue;
      }
    }

    if (!response) {
      throw lastError || new Error("All filter options failed");
    }

    // Procesar solicitudes
    const requests: Request[] = response.data.data.map((item) => {
      // Buscar datos relacionados en el array included
      const applicant = response.data.included?.find(
        (included) =>
          included.type === "node--profile" &&
          included.id === item.relationships.field_applicant?.data?.id
      );
      const distributor = response.data.included?.find(
        (included) =>
          included.type === "node--distributor" &&
          included.id === item.relationships.field_distributor_data?.data?.id
      );
      const subservice = response.data.included?.find(
        (included) =>
          included.type === "taxonomy_term--category" &&
          included.id === item.relationships.field_subservice?.data?.id
      );
      // Como solo incluimos field_subservice, usamos valores por defecto para service y category

      return {
        id: item.id,
        title: item.attributes.title,
        applicationNumber: item.attributes.field_application_number,
        status: "pending", // Valor por defecto ya que no incluimos status
        entryDate: item.attributes.field_entry_date,
        estimatedApplicationHour: item.attributes.field_estimated_application_hour,
        logisticsCosts: item.attributes.field_logistics_costs,
        serviceValue: item.attributes.field_service_value,
        applicant: {
          id: item.relationships.field_applicant?.data?.id || "",
          fullName: applicant?.attributes.field_full_name as string || "Unknown",
          documentNumber: applicant?.attributes.field_document_number as string || "",
          phoneNumber: applicant?.attributes.field_phone_number as string || "",
          email: applicant?.attributes.field_mail as string || "",
        },
        category: {
          id: item.relationships.field_category?.data?.id || "",
          name: "Categoría", // Valor por defecto ya que no lo incluimos
        },
        service: {
          id: item.relationships.field_service?.data?.id || "",
          name: "Servicio", // Valor por defecto ya que no lo incluimos
        },
        subservice: {
          id: item.relationships.field_subservice?.data?.id || "",
          name: subservice?.attributes.name as string || "Unknown",
        },
        distributor: distributor ? {
          id: distributor.id,
          title: distributor.attributes.title as string,
        } : undefined,
        paymentStatus: item.relationships.field_payment_status?.data?.id
          ? {
              id: item.relationships.field_payment_status.data.id,
              name: "Unknown",
            }
          : undefined,
      };
    });

    // Buscar nombres de estados de pago en included y actualizar
    requests.forEach((request) => {
      if (request.paymentStatus?.id) {
        const paymentStatusIncluded = response.data.included?.find(
          (inc) => inc.id === request.paymentStatus!.id && inc.type === "taxonomy_term--payment_status"
        );
        if (paymentStatusIncluded?.attributes?.name) {
          request.paymentStatus.name = paymentStatusIncluded.attributes.name as string;
        }
      }
    });

    // Debug: Verificar los datos de las solicitudes
    console.log("🔍 Debug - DistributorId buscado:", distributorId);
    console.log("🔍 Debug - API Response included:", response.data.included);
    console.log("🔍 Debug - Requests procesadas:", requests.map(r => ({
      id: r.id,
      title: r.title,
      distributorId: r.distributor?.id,
      distributorTitle: r.distributor?.title,
      hasDistributor: !!r.distributor
    })));

    // Filtrar por distribuidor en el frontend como respaldo
    const filteredRequests = requests.filter(request => {
      const requestDistributorId = request.distributor?.id;
      const matches = requestDistributorId === distributorId;
      console.log(`🔍 Debug - Request ${request.id}: distributorId=${requestDistributorId}, buscado=${distributorId}, matches=${matches}`);
      console.log(`🔍 Debug - Request distributor object:`, request.distributor);
      return matches;
    });

    console.log("Processed requests:", requests.length);
    console.log("Filtered requests:", filteredRequests.length);
    console.log("Filtered requests details:", filteredRequests);
    
    return filteredRequests;
  } catch (error) {
    console.error("Error fetching assigned requests:", error);
    throw error;
  }
};

// Función alternativa para obtener todas las solicitudes y filtrar en el frontend
export const fetchAllRequestsAndFilter = async (distributorId: string): Promise<Request[]> => {
  try {
    console.log("Fetching all requests and filtering for distributor:", distributorId);
    
    const response: AxiosResponse<RequestsApiResponse> = await api.get("/api/node/request", {
      params: {
        "page[limit]": 100,
        include: "field_subservice,field_distributor_data,field_payment_status",
        sort: "-created",
      },
    });

    console.log("All requests API Response:", response.data);

    // Procesar todas las solicitudes
    const allRequests: Request[] = response.data.data.map((item) => {
      // Buscar datos relacionados en el array included
      const applicant = response.data.included?.find(
        (included) =>
          included.type === "node--profile" &&
          included.id === item.relationships.field_applicant?.data?.id
      );
      const distributor = response.data.included?.find(
        (included) =>
          included.type === "node--distributor" &&
          included.id === item.relationships.field_distributor_data?.data?.id
      );
      const subservice = response.data.included?.find(
        (included) =>
          included.type === "taxonomy_term--category" &&
          included.id === item.relationships.field_subservice?.data?.id
      );
      // Como solo incluimos field_subservice, usamos valores por defecto para service y category

      return {
        id: item.id,
        title: item.attributes.title,
        applicationNumber: item.attributes.field_application_number,
        status: "pending", // Valor por defecto ya que no incluimos status
        entryDate: item.attributes.field_entry_date,
        estimatedApplicationHour: item.attributes.field_estimated_application_hour,
        logisticsCosts: item.attributes.field_logistics_costs,
        serviceValue: item.attributes.field_service_value,
        applicant: {
          id: item.relationships.field_applicant?.data?.id || "",
          fullName: applicant?.attributes.field_full_name as string || "Unknown",
          documentNumber: applicant?.attributes.field_document_number as string || "",
          phoneNumber: applicant?.attributes.field_phone_number as string || "",
          email: applicant?.attributes.field_mail as string || "",
        },
        category: {
          id: item.relationships.field_category?.data?.id || "",
          name: "Categoría", // Valor por defecto ya que no lo incluimos
        },
        service: {
          id: item.relationships.field_service?.data?.id || "",
          name: "Servicio", // Valor por defecto ya que no lo incluimos
        },
        subservice: {
          id: item.relationships.field_subservice?.data?.id || "",
          name: subservice?.attributes.name as string || "Unknown",
        },
        distributor: distributor ? {
          id: distributor.id,
          title: distributor.attributes.title as string,
        } : undefined,
        paymentStatus: item.relationships.field_payment_status?.data?.id
          ? {
              id: item.relationships.field_payment_status.data.id,
              name: "Unknown",
            }
          : undefined,
      };
    });

    // Buscar nombres de estados de pago en included y actualizar
    allRequests.forEach((request) => {
      if (request.paymentStatus?.id) {
        const paymentStatusIncluded = response.data.included?.find(
          (inc) => inc.id === request.paymentStatus!.id && inc.type === "taxonomy_term--payment_status"
        );
        if (paymentStatusIncluded?.attributes?.name) {
          request.paymentStatus.name = paymentStatusIncluded.attributes.name as string;
        }
      }
    });

    // Filtrar por distribuidor en el frontend
    const assignedRequests = allRequests.filter(request => 
      request.distributor?.id === distributorId
    );

    console.log("All requests:", allRequests.length);
    console.log("Assigned requests:", assignedRequests.length);
    console.log("Assigned requests details:", assignedRequests);

    return assignedRequests;
  } catch (error) {
    console.error("Error fetching all requests:", error);
    throw error;
  }
};

// Función para calcular el total de pago
export const calculatePayment = (baseValue: number, additionalValue: number, discountValue: number): PaymentCalculation => {
  const total = baseValue + additionalValue - discountValue;
  return {
    baseValue,
    additionalValue,
    discountValue,
    total: Math.max(0, total) // Asegurar que el total no sea negativo
  };
};

// Función para guardar un registro de costo
type CreatedPaymentNode = {
  id: string;
  attributes: {
    field_base_value?: number;
    field_additional_value?: number;
    field_discount_value?: number;
    field_total_value?: number;
    field_additional_amount?: number;
    field_discount_amount?: number;
    field_observations?: string;
    created?: string;
    changed?: string;
  };
  relationships: {
    field_request?: { data?: { id?: string } | Array<{ id?: string }> };
    field_payment_status?: { data?: { id?: string } };
  };
};

export const saveCostRecord = async (costData: {
  distributorId: string;
  requestId: string;
  baseValue: number;
  additionalValue: number;
  discountValue: number;
  observations?: string;
}): Promise<CostRecord> => {
  try {
    const totalValue = calculatePayment(
      costData.baseValue,
      costData.additionalValue,
      costData.discountValue
    ).total;

    // Intentar crear el pago con JSON:API
    try {
      const payload = {
        data: {
          type: "node--payment",
          attributes: {
            title: `Pago solicitud ${costData.requestId}`,
            field_observations: costData.observations || "",
            // Solo enviar montos necesarios
            field_additional_amount: costData.additionalValue,
            field_discount_amount: costData.discountValue,
            status: true,
          },
          relationships: {
            field_distributor_data: {
              data: { type: "node--distributor", id: costData.distributorId },
            },
            // El backend espera arreglo de requests
            field_request: {
              data: [
                { type: "node--request", id: costData.requestId },
              ],
            },
            // Se establecerá más abajo cuando obtengamos el id de "Recibido"
          },
        },
      };

      // Buscar el estado "Recibido"
      try {
        const statusesResponse = await api.get("/api/taxonomy_term/payment_status", { params: { "page[limit]": 100 } });
        const statuses: Array<{ id: string; attributes: { name?: string } }> = statusesResponse?.data?.data || [];
        const recibido = statuses.find((s) => (s.attributes?.name || "").toLowerCase() === "recibido");
        if (recibido?.id) {
          (payload.data as unknown as { relationships: { field_payment_status?: { data: { type: string; id: string } } } }).relationships.field_payment_status = {
            data: { type: "taxonomy_term--payment_status", id: recibido.id },
          };
        }
      } catch {
        // Si falla, continua sin estado (el backend puede aplicar por defecto)
      }

      const response: AxiosResponse<{ data: CreatedPaymentNode }> = await api.post(
        "/api/node/payment",
        payload,
        {
          headers: { "Content-Type": "application/vnd.api+json" },
        }
      );

      // Normalizar respuesta a CostRecord
      const created = response.data.data;
      const attributes = created?.attributes || {};
      const relationships = created?.relationships || {};
      const requestRel = relationships?.field_request?.data as
        | { id?: string }
        | Array<{ id?: string }>
        | undefined;
      const requestIdFromRel = Array.isArray(requestRel)
        ? requestRel[0]?.id
        : (requestRel as { id?: string } | undefined)?.id;

      const additionalFromAttr: number | undefined =
        (attributes as { field_additional_amount?: number; field_additional_value?: number }).field_additional_amount ??
        (attributes as { field_additional_value?: number }).field_additional_value;
      const discountFromAttr: number | undefined =
        (attributes as { field_discount_amount?: number; field_discount_value?: number }).field_discount_amount ??
        (attributes as { field_discount_value?: number }).field_discount_value;

      const computedTotal = calculatePayment(
        costData.baseValue,
        additionalFromAttr ?? costData.additionalValue,
        discountFromAttr ?? costData.discountValue
      ).total;

      const record: CostRecord = {
        id: created?.id || `payment_${Date.now()}`,
        distributorId: costData.distributorId,
        requestId: requestIdFromRel || costData.requestId,
        paymentCalculation: {
          baseValue: costData.baseValue,
          additionalValue: additionalFromAttr ?? costData.additionalValue,
          discountValue: discountFromAttr ?? costData.discountValue,
          total: computedTotal,
        },
        paymentStatus: relationships?.field_payment_status?.data?.id
          ? { id: relationships.field_payment_status.data.id, name: "Recibido" }
          : undefined,
        createdAt: attributes?.created || new Date().toISOString(),
        updatedAt: attributes?.changed || new Date().toISOString(),
      };
      // Después de crear el pago exitosamente, actualizar el estado de la solicitud a "Recibido"
      try {
        await updateRequestPaymentStatus(costData.requestId, "recibido");
      } catch (updateError) {
        console.error("Error updating request payment status:", updateError);
        // No lanzar el error para que el pago se guarde aunque falle la actualización del estado
      }

      return record;
    } catch {
      // Fallback: intentar Drupal REST si JSON:API no está disponible
      const restPayload: Record<string, unknown> = {
        type: [{ target_id: "payment" }],
        title: [{ value: `Pago solicitud ${costData.requestId}` }],
        field_observations: [{ value: costData.observations || "" }],
        field_additional_amount: [{ value: costData.additionalValue }],
        field_discount_amount: [{ value: costData.discountValue }],
        field_distributor_data: [{ target_id: costData.distributorId }],
        field_request: [{ target_id: costData.requestId }],
        status: [{ value: 1 }],
      };

      const response = await api.post("/node?_format=json", restPayload, {
        headers: { "Content-Type": "application/json" },
      });

      return {
        id: response.data?.nid?.[0]?.value?.toString?.() || `payment_${Date.now()}`,
        distributorId: costData.distributorId,
        requestId: costData.requestId,
        paymentCalculation: {
          baseValue: costData.baseValue,
          additionalValue: costData.additionalValue,
          discountValue: costData.discountValue,
          total: totalValue,
        },
        paymentStatus: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error("Error saving cost record:", error);
    throw error;
  }
};

// Actualizar estado de pago de la solicitud
export const updateRequestPaymentStatus = async (requestId: string, statusName: string): Promise<void> => {
  try {
    // Obtener taxonomías de estados de pago y buscar el estado
    const statusesResponse = await api.get("/api/taxonomy_term/payment_status", {
      params: { "page[limit]": 100 },
    });
    const statuses: Array<{ id: string; attributes: { name?: string } }> = statusesResponse?.data?.data || [];
    const status = statuses.find((s) => (s.attributes?.name || "").toLowerCase() === statusName.toLowerCase());

    if (!status?.id) {
      throw new Error(`No se encontró el estado de pago '${statusName}'`);
    }

    const payload = {
      data: {
        type: "node--request",
        id: requestId,
        relationships: {
          field_payment_status: {
            data: { type: "taxonomy_term--payment_status", id: status.id },
          },
        },
      },
    };

    await api.patch(`/api/node/request/${requestId}`, payload, {
      headers: {
        "Content-Type": "application/vnd.api+json",
        "X-Csrf-Token": localStorage.getItem("csrf_token") || "",
      },
    });
  } catch (error) {
    console.error("Error updating request payment status:", error);
    throw error;
  }
};

// Cambiar estado de pago de la solicitud a "Pagado"
export const markRequestPaymentAsPaid = async (requestId: string): Promise<void> => {
  try {
    // Obtener taxonomías de estados de pago y buscar "Pagado"
    const statusesResponse = await api.get("/api/taxonomy_term/payment_status", {
      params: { "page[limit]": 100 },
    });
    const statuses: Array<{ id: string; attributes: { name?: string } }> = statusesResponse?.data?.data || [];
    const paid = statuses.find((s) => (s.attributes?.name || "").toLowerCase() === "pagado");

    if (!paid?.id) {
      throw new Error("No se encontró el estado de pago 'Pagado'");
    }

    const payload = {
      data: {
        type: "node--request",
        id: requestId,
        relationships: {
          field_payment_status: {
            data: { type: "taxonomy_term--payment_status", id: paid.id },
          },
        },
      },
    };

    await api.patch(`/api/node/request/${requestId}`, payload, {
      headers: {
        "Content-Type": "application/vnd.api+json",
        "X-Csrf-Token": localStorage.getItem("csrf_token") || "",
      },
    });
  } catch (error) {
    console.error("Error marcando solicitud como pagada:", error);
    throw error;
  }
};

// Función para obtener historial de pagos de un distribuidor
export const fetchPaymentHistory = async (distributorId: string, limit: number = 5): Promise<CostRecord[]> => {
  try {
    const response: AxiosResponse<PaymentsApiResponse> = await api.get("/api/node/payment", {
      params: {
        "page[limit]": limit,
        "filter[field_distributor_data.id]": distributorId,
        sort: "-created",
        include: "field_distributor_data,field_request,field_payment_status",
      },
    });

    // Procesar pagos
    const payments: CostRecord[] = response.data.data.map((item) => {
      // Buscar nombre de estado en included
      const paymentStatusRelId = item.relationships.field_payment_status?.data?.id;
      const statusIncluded = response.data.included?.find(
        (inc) => inc.id === paymentStatusRelId && inc.type === "taxonomy_term--payment_status"
      );
      const paymentStatusName = (statusIncluded?.attributes as { name?: string } | undefined)?.name || "";

      // Extraer requestId (puede venir como objeto o arreglo)
      const requestRel = item.relationships.field_request?.data as
        | { id: string }
        | Array<{ id: string }>
        | undefined;
      const requestId = Array.isArray(requestRel) ? requestRel[0]?.id ?? "" : requestRel?.id ?? "";

      // Inferir base desde la solicitud incluida si está disponible
      const requestIncluded = response.data.included?.find(
        (inc) => inc.id === requestId && inc.type === "node--request"
      );
      const requestAttributes = (requestIncluded?.attributes || {}) as { field_service_value?: number; field_application_number?: string };
      const baseFromRequest = requestAttributes.field_service_value ?? item.attributes.field_base_value ?? 0;

      // Montos adicionales/descuentos con compatibilidad de nombres
      const additional = item.attributes.field_additional_amount ?? item.attributes.field_additional_value ?? 0;
      const discount = item.attributes.field_discount_amount ?? item.attributes.field_discount_value ?? 0;

      const total = calculatePayment(baseFromRequest, additional, discount).total;

      return {
        id: item.id,
        distributorId: distributorId,
        requestId,
        requestApplicationNumber: requestAttributes.field_application_number ?? undefined,
        paymentCalculation: {
          baseValue: baseFromRequest,
          additionalValue: additional,
          discountValue: discount,
          total,
        },
        paymentStatus: paymentStatusRelId
          ? { id: paymentStatusRelId, name: paymentStatusName }
          : undefined,
        createdAt: item.attributes.created,
        updatedAt: item.attributes.changed,
      };
    });

    return payments;
  } catch (error) {
    console.error("Error fetching payment history:", error);
    throw error;
  }
};

// Función para obtener registros de costos de un distribuidor (mantener compatibilidad)
export const fetchCostRecords = async (distributorId: string): Promise<CostRecord[]> => {
  return fetchPaymentHistory(distributorId, 10);
};
