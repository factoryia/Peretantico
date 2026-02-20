// utils/costs.ts
import api from "@/api";
import type {
  Distributor,
  Request,
  CostRecord,
  PaymentCalculation,
} from "../types";
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
      created?: string;
      field_application_number: string;
      field_entry_date: string;
      field_estimated_application_hour?: number | string | null;
      field_estimated_prioritized_hour?: number | string | null;
      field_is_recurring?: boolean;
      field_logistics_costs: number;
      field_service_value: number;
      field_prioritized_value?: number;
      field_application_score?: number;
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
      field_service_status?: { data?: { id: string } };
      field_info_service?: { data?: { id: string; type: string } };
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

// Función para obtener todos los distribuidores (solo ID y Título)
export const fetchDistributors = async (): Promise<Distributor[]> => {
  try {
    const response: AxiosResponse<DistributorsApiResponse> = await api.get(
      "/api/node/distributor",
      {
        params: {
          "page[limit]": 100,
        },
      }
    );

    return response.data.data.map((item) => ({
      id: item.id,
      title: item.attributes.title,
      status: item.attributes.status,
      // Los demás campos pueden ser por defecto ya que no los necesitamos para el select de la página de pagos
      currentAvailability: item.attributes.field_current_availability || false,
      documentNumber: item.attributes.field_document_number || "",
      entryDate: item.attributes.field_entry_date || "",
      vehicleId: item.attributes.field_id_vehicle || "",
      email: item.attributes.field_mail || "",
      observations: item.attributes.field_observations || "",
      phoneNumber: item.attributes.field_phone_number || "",
      documentType: { id: "", name: "" },
      coverageArea: { id: "", name: "" },
      transportationType: { id: "", name: "" },
    }));
  } catch (error) {
    console.error("Error fetching distributors:", error);
    throw error;
  }
};

// Función para obtener solicitudes finalizadas por distribuidor
export const fetchFinishedRequestsByDistributor = async (
  distributorId: string
): Promise<Request[]> => {
  try {
    const response: AxiosResponse<RequestsApiResponse> = await api.get(
      "/api/node/request",
      {
        params: {
          "page[limit]": 100,
          include:
            "field_applicant,field_application_statuses,field_distributor_data,field_info_service,field_payment_status,field_service_status",
          "filter[field_distributor_data.id]": distributorId,
          sort: "-created",
        },
      }
    );

    // Procesar solicitudes
    const requests: Request[] = response.data.data.map((item) => {
      const applicant = response.data.included?.find(
        (inc) =>
          inc.type === "node--profile" &&
          inc.id === item.relationships.field_applicant?.data?.id
      );
      const distributor = response.data.included?.find(
        (inc) =>
          inc.type === "node--distributor" &&
          inc.id === item.relationships.field_distributor_data?.data?.id
      );
      const subservice = response.data.included?.find(
        (inc) =>
          inc.type === "taxonomy_term--category" &&
          inc.id === item.relationships.field_subservice?.data?.id
      );
      const infoService = response.data.included?.find(
        (inc) => inc.id === item.relationships.field_info_service?.data?.id
      );
      const infoServiceType = item.relationships.field_info_service?.data?.type;
      const infoAttrs = infoService?.attributes as any;

      const applicationStatus = response.data.included?.find(
        (inc) =>
          inc.type === "taxonomy_term--application_statuses" &&
          inc.id === item.relationships.field_application_statuses?.data?.id
      );
      const paymentStatus = response.data.included?.find(
        (inc) =>
          inc.type === "taxonomy_term--payment_status" &&
          inc.id === item.relationships.field_payment_status?.data?.id
      );
      const serviceStatus = response.data.included?.find(
        (inc) =>
          inc.type === "taxonomy_term--application_statuses" &&
          inc.id === item.relationships.field_service_status?.data?.id
      );

      // Resolución de nombre del cliente basado en el tipo de servicio
      let resolvedClientName =
        (applicant?.attributes as any)?.field_full_name ||
        (applicant?.attributes as any)?.title ||
        "Unknown";

      if (
        infoServiceType === "node--water_sample_fridge" ||
        infoServiceType === "node--medical_bills"
      ) {
        resolvedClientName =
          infoAttrs?.field_full_name ||
          infoAttrs?.field_sender_full_name ||
          resolvedClientName;
      } else if (infoServiceType === "node--property_certification") {
        resolvedClientName = infoAttrs?.field_owner_name || resolvedClientName;
      } else if (infoServiceType === "node--property_unbundling_request") {
        resolvedClientName = infoAttrs?.field_full_name || resolvedClientName;
      }

      return {
        id: item.id,
        title: item.attributes.title,
        created: (item.attributes as any).created,
        applicationNumber: item.attributes.field_application_number,
        status: "pending", // fallback
        entryDate: item.attributes.field_entry_date,
        estimatedApplicationHour: (
          item.attributes.field_estimated_application_hour as any
        )?.toString(),
        estimatedPrioritizedHour: (
          item.attributes as any
        ).field_estimated_prioritized_hour?.toString(),
        isRecurring: item.attributes.field_is_recurring,
        logisticsCosts: item.attributes.field_logistics_costs,
        serviceValue: item.attributes.field_service_value,
        prioritizedValue: item.attributes.field_prioritized_value,
        applicationScore: item.attributes.field_application_score,
        applicant: {
          id: item.relationships.field_applicant?.data?.id || "",
          fullName: resolvedClientName,
          documentNumber:
            (applicant?.attributes as any)?.field_document_number || "",
          phoneNumber: (applicant?.attributes as any)?.field_phone_number || "",
          email: (applicant?.attributes as any)?.field_mail || "",
          address: (applicant?.attributes as any)?.field_address || "",
        },
        category: { id: "", name: "" }, // fallback
        service: { id: "", name: "" }, // fallback
        subservice: {
          id: item.relationships.field_subservice?.data?.id || "",
          name: (subservice?.attributes as any)?.name || "Unknown",
        },
        distributor: distributor
          ? {
              id: distributor.id,
              title: distributor.attributes.title as string,
            }
          : undefined,
        infoServiceType,
        applicationStatus: applicationStatus
          ? {
              id: applicationStatus.id,
              name: (applicationStatus.attributes as any).name,
            }
          : undefined,
        paymentStatus: paymentStatus
          ? {
              id: paymentStatus.id,
              name: (paymentStatus.attributes as any).name,
            }
          : undefined,
        serviceStatus: serviceStatus
          ? {
              id: serviceStatus.id,
              name: (serviceStatus.attributes as any).name,
            }
          : undefined,
      };
    });

    // Filtrar solicitudes que ya han sido pagadas (tienen estado de pago "Recibido")
    return requests.filter(
      (r) => r.paymentStatus?.name?.toLowerCase() !== "recibido"
    );
  } catch (error) {
    console.error("Error fetching finished requests:", error);
    throw error;
  }
};

// Función para calcular el total de pago
export const calculatePayment = (
  baseValue: number,
  additionalValue: number,
  discountValue: number
): PaymentCalculation => {
  const total = baseValue + additionalValue - discountValue;
  return {
    baseValue,
    additionalValue,
    discountValue,
    total: Math.max(0, total), // Asegurar que el total no sea negativo
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
              data: [{ type: "node--request", id: costData.requestId }],
            },
            // Se establecerá más abajo cuando obtengamos el id de "Recibido"
          },
        },
      };

      // Buscar el estado "Recibido"
      try {
        const statusesResponse = await api.get(
          "/api/taxonomy_term/payment_status",
          { params: { "page[limit]": 100 } }
        );
        const statuses: Array<{ id: string; attributes: { name?: string } }> =
          statusesResponse?.data?.data || [];
        const recibido = statuses.find(
          (s) => (s.attributes?.name || "").toLowerCase() === "recibido"
        );
        if (recibido?.id) {
          (
            payload.data as unknown as {
              relationships: {
                field_payment_status?: { data: { type: string; id: string } };
              };
            }
          ).relationships.field_payment_status = {
            data: { type: "taxonomy_term--payment_status", id: recibido.id },
          };
        }
      } catch {
        // Si falla, continua sin estado (el backend puede aplicar por defecto)
      }

      const response: AxiosResponse<{ data: CreatedPaymentNode }> =
        await api.post("/api/node/payment", payload, {
          headers: { "Content-Type": "application/vnd.api+json" },
        });

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
        (
          attributes as {
            field_additional_amount?: number;
            field_additional_value?: number;
          }
        ).field_additional_amount ??
        (attributes as { field_additional_value?: number })
          .field_additional_value;
      const discountFromAttr: number | undefined =
        (
          attributes as {
            field_discount_amount?: number;
            field_discount_value?: number;
          }
        ).field_discount_amount ??
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
      } catch {
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
        id:
          response.data?.nid?.[0]?.value?.toString?.() ||
          `payment_${Date.now()}`,
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
export const updateRequestPaymentStatus = async (
  requestId: string,
  statusName: string
): Promise<void> => {
  try {
    // Obtener taxonomías de estados de pago y buscar el estado
    const statusesResponse = await api.get(
      "/api/taxonomy_term/payment_status",
      {
        params: { "page[limit]": 100 },
      }
    );
    const statuses: Array<{ id: string; attributes: { name?: string } }> =
      statusesResponse?.data?.data || [];
    const status = statuses.find(
      (s) =>
        (s.attributes?.name || "").toLowerCase() === statusName.toLowerCase()
    );

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

// Función para obtener historial de pagos de un distribuidor
export const fetchPaymentHistory = async (
  distributorId: string,
  limit: number = 5
): Promise<CostRecord[]> => {
  try {
    const response: AxiosResponse<PaymentsApiResponse> = await api.get(
      "/api/node/payment",
      {
        params: {
          "page[limit]": limit,
          "filter[field_distributor_data.id]": distributorId,
          sort: "-created",
          include: "field_distributor_data,field_request,field_payment_status",
        },
      }
    );

    // Procesar pagos
    const payments: CostRecord[] = response.data.data.map((item) => {
      // Buscar nombre de estado en included
      const paymentStatusRelId =
        item.relationships.field_payment_status?.data?.id;
      const statusIncluded = response.data.included?.find(
        (inc) =>
          inc.id === paymentStatusRelId &&
          inc.type === "taxonomy_term--payment_status"
      );
      const paymentStatusName =
        (statusIncluded?.attributes as { name?: string } | undefined)?.name ||
        "";

      // Extraer requestId (puede venir como objeto o arreglo)
      const requestRel = item.relationships.field_request?.data as
        | { id: string }
        | Array<{ id: string }>
        | undefined;
      const requestId = Array.isArray(requestRel)
        ? requestRel[0]?.id ?? ""
        : requestRel?.id ?? "";

      // Inferir base desde la solicitud incluida si está disponible
      const requestIncluded = response.data.included?.find(
        (inc) => inc.id === requestId && inc.type === "node--request"
      );
      const requestAttributes = (requestIncluded?.attributes || {}) as {
        field_service_value?: number;
        field_application_number?: string;
      };
      const baseFromRequest =
        requestAttributes.field_service_value ??
        item.attributes.field_base_value ??
        0;

      // Montos adicionales/descuentos con compatibilidad de nombres
      const additional =
        item.attributes.field_additional_amount ??
        item.attributes.field_additional_value ??
        0;
      const discount =
        item.attributes.field_discount_amount ??
        item.attributes.field_discount_value ??
        0;

      const total = calculatePayment(
        baseFromRequest,
        additional,
        discount
      ).total;

      return {
        id: item.id,
        distributorId: distributorId,
        requestId,
        requestApplicationNumber:
          requestAttributes.field_application_number ?? undefined,
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

// Crear un nuevo registro de pago (soporta múltiples solicitudes)
export const createPayment = async (paymentData: any): Promise<void> => {
  try {
    const payload = {
      data: {
        type: "node--payment",
        attributes: {
          title: paymentData.title,
          field_observations: paymentData.observations || "",
          field_additional_amount: paymentData.additionalAmount || 0,
          field_discount_amount: paymentData.discountAmount || 0,
          status: true,
        },
        relationships: {
          field_distributor_data: {
            data: {
              type: "node--distributor",
              id: paymentData.distributorId,
            },
          },
          field_request: {
            data: paymentData.requestIds.map((id: string) => ({
              type: "node--request",
              id: id,
            })),
          },
          field_payment_status: {
            data: {
              type: "taxonomy_term--payment_status",
              id: paymentData.paymentStatusId,
            },
          },
        },
      },
    };

    await api.post("/api/node/payment", payload, {
      headers: { "Content-Type": "application/vnd.api+json" },
    });

    // Actualizar el estado de pago de todas las solicitudes a "recibido"
    // (O al estado que corresponda según la lógica de negocio)
    for (const requestId of paymentData.requestIds) {
      try {
        await updateRequestPaymentStatus(requestId, "recibido");
      } catch (error) {
        console.error(`Error updating status for request ${requestId}:`, error);
      }
    }
  } catch (error) {
    console.error("Error creating payment:", error);
    throw error;
  }
};
