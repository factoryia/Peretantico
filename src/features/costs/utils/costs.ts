// utils/costs.ts
import api from "@/api";
import type {
  Distributor,
  Request,
  CostRecord,
  PaymentCalculation,
} from "../types";
import type { AxiosResponse } from "axios";

// Función para obtener todos los distribuidores (solo ID y Título)
export const fetchDistributors = async (): Promise<Distributor[]> => {
  try {
    const response: AxiosResponse<unknown> = await api.get("/distributors", {
      params: {
        limit: 100,
      },
    });

    const raw = response.data;

    const items =
      Array.isArray(raw) && raw.length > 0
        ? raw
        : raw &&
          typeof raw === "object" &&
          Array.isArray((raw as { data?: unknown }).data)
        ? (raw as { data: unknown[] }).data
        : [];

    return items
      .filter(
        (item): item is { [key: string]: unknown } =>
          item !== null && typeof item === "object"
      )
      .map((item) => {
        const getString = (key: string, fallback = "") => {
          const value = item[key];
          return typeof value === "string" ? value : fallback;
        };
        const getBoolean = (key: string, fallback = false) => {
          const value = item[key];
          if (typeof value === "boolean") return value;
          if (typeof value === "number") return value !== 0;
          return fallback;
        };

        const documentType = getString("documentType");
        const coverageArea = getString("coverageArea");
        const transportationType = getString("transportationType");

        return {
          id: getString("id"),
          title: getString("title"),
          status: getBoolean("status"),
          currentAvailability: getBoolean("currentAvailability"),
          documentNumber: getString("documentNumber"),
          entryDate: getString("entryDate"),
          vehicleId: getString("vehicleId"),
          email: getString("email"),
          observations: getString("observations") || null,
          phoneNumber: getString("phoneNumber"),
          documentType: {
            id: documentType,
            name: documentType,
          },
          coverageArea: {
            id: coverageArea,
            name: coverageArea,
          },
          transportationType: {
            id: transportationType,
            name: transportationType,
          },
        } satisfies Distributor;
      });
  } catch (error) {
    console.error("Error fetching distributors:", error);
    throw error;
  }
};

// Función para obtener solicitudes finalizadas por distribuidor
export const fetchFinishedRequestsByDistributor = async (
  distributorId: string,
) => fetchFinishedRequestsByDistributorBackend(distributorId);

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

      void payload;
      void totalValue;
      throw new Error("JSON:API payment creation is no longer supported");
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

    await api.patch(`/requests/${requestId}/status`, {
      status: true,
      observations: `Estado de pago actualizado a ${statusName}`,
    });
  } catch (error) {
    console.error("Error updating request payment status:", error);
    throw error;
  }
};

// Función para obtener historial de pagos de un distribuidor desde backend /payments
export const fetchPaymentHistory = async (
  distributorId: string,
  limit: number = 5
): Promise<CostRecord[]> => {
  try {
    const response = await api.get("/payments", {
      params: { limit },
    });

    const raw = response.data;
    const list: any[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.data)
      ? raw.data
      : [];

    return list
      .filter((item) => item.distributorId === distributorId)
      .map((item) => {
        const baseValue = Number(item.baseValue ?? 0);
        const additionalValue = Number(item.additionalAmount ?? 0);
        const discountValue = Number(item.discountAmount ?? 0);
        const total = calculatePayment(
          baseValue,
          additionalValue,
          discountValue
        ).total;

        return {
          id: item.id,
          distributorId: item.distributorId || distributorId,
          requestId: "",
          requestApplicationNumber: undefined,
          paymentCalculation: {
            baseValue,
            additionalValue,
            discountValue,
            total,
          },
          paymentStatus: item.status
            ? { id: item.status, name: item.status }
            : undefined,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        } satisfies CostRecord;
      });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    throw error;
  }
};

export const fetchFinishedRequestsByDistributorBackend = async (
  distributorId: string,
): Promise<Request[]> => {
  const response = await api.get("/requests", { params: { distributorId } });
  const raw = response.data;
  const list: any[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
    ? raw.data
    : [];
  return list.map((item) => {
    const applicant = item.applicant || {};
    const distributor = item.distributor || null;
    const service = item.service || {};
    return {
      id: item.id,
      title: item.title || "",
      created: item.createdAt || item.entryDate || "",
      applicationNumber: item.applicationNumber || "",
      status: "finalizado",
      entryDate: item.entryDate || "",
      estimatedApplicationHour: item.estimatedApplicationHour?.toString() ?? null,
      estimatedPrioritizedHour: item.estimatedPrioritizedHour?.toString() ?? null,
      isRecurring: !!item.isRecurring,
      logisticsCosts: Number(item.logisticsCosts || 0),
      serviceValue: Number(item.serviceValue || 0),
      prioritizedValue: Number(item.prioritizedValue || 0),
      applicationScore: Number(item.applicationScore || 0),
      applicant: {
        id: applicant.id || "",
        fullName:
          applicant.fullName || applicant.title || applicant.name || "Unknown",
        documentNumber: applicant.documentNumber || "",
        phoneNumber: applicant.phoneNumber || "",
        email: applicant.email || "",
        address: applicant.address || "",
      },
      category: { id: "", name: "" },
      service: { id: service.id || "", name: service.name || "" },
      subservice: { id: service.id || "", name: service.name || "" },
      distributor: distributor
        ? { id: distributor.id, title: distributor.title || distributor.name }
        : undefined,
      infoServiceType: service.code || undefined,
      applicationStatus: undefined,
      paymentStatus: undefined,
      serviceStatus: { id: "finished", name: "Finalizado" },
    };
  });
};
// Crear un nuevo registro de pago (soporta múltiples solicitudes)
export const createPayment = async (): Promise<void> => {};

export interface Payment {
  id: string;
  title: string;
  observations: string | null;
  baseValue: number | null;
  additionalAmount: number | null;
  discountAmount: number | null;
  totalAmount: number | null;
  status: string | null;
  distributorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentDto {
  title: string;
  observations?: string | null;
  baseValue?: number | null;
  additionalAmount?: number | null;
  discountAmount?: number | null;
  totalAmount?: number | null;
  status?: string;
  distributorId?: string | null;
}

export interface PaymentsListResponse {
  data: Payment[];
  total?: number;
  page?: number;
  limit?: number;
}

export const fetchPayments = async (
  params: { page?: number; limit?: number } = {},
): Promise<PaymentsListResponse> => {
  const response = await api.get("/payments", { params });
  const raw = response.data;

  if (Array.isArray(raw)) {
    return { data: raw as Payment[] };
  }

  if (raw && typeof raw === "object" && Array.isArray((raw as any).data)) {
    return raw as PaymentsListResponse;
  }

  return { data: [] };
};

export const fetchPaymentById = async (
  id: string,
): Promise<Payment | null> => {
  const response = await api.get(`/payments/${id}`);
  const payment = response.data;
  if (!payment) return null;
  return payment as Payment;
};

export const createPaymentRecord = async (
  dto: CreatePaymentDto,
): Promise<Payment> => {
  const totalAmount =
    dto.totalAmount ??
    ((dto.baseValue || 0) +
      (dto.additionalAmount || 0) -
      (dto.discountAmount || 0));

  const payload = {
    title: dto.title,
    observations: dto.observations ?? null,
    baseValue: dto.baseValue ?? null,
    additionalAmount: dto.additionalAmount ?? null,
    discountAmount: dto.discountAmount ?? null,
    totalAmount,
    status: dto.status ?? "PENDING",
    distributorId: dto.distributorId ?? null,
  };

  const response = await api.post("/payments", payload);
  return response.data as Payment;
};

export const updatePaymentRecord = async (
  id: string,
  dto: Partial<CreatePaymentDto>,
): Promise<Payment> => {
  const response = await api.put(`/payments/${id}`, dto);
  return response.data as Payment;
};

export const deletePaymentRecord = async (id: string): Promise<void> => {
  await api.delete(`/payments/${id}`);
};
