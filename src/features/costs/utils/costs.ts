// utils/costs.ts
import api from "@/api";
import type {
  Distributor,
  Request,
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
) => {
  const total = baseValue + additionalValue - discountValue;
  return {
    baseValue,
    additionalValue,
    discountValue,
    total: Math.max(0, total), // Asegurar que el total no sea negativo
  };
};

// Función para obtener historial de pagos de un distribuidor desde backend /payments
export const fetchPaymentHistory = async (
  distributorId: string,
  limit: number = 5
): Promise<Payment[]> => {
  try {
    const response = await api.get("/payments", {
      params: { limit, distributorId },
    });

    const raw = response.data;
    const list: any[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.data)
      ? raw.data
      : [];

    return list.map((item) => ({
      id: item.id,
      title: item.title,
      observations: item.observations,
      baseValue: Number(item.baseValue ?? 0),
      additionalAmount: Number(item.additionalAmount ?? 0),
      discountAmount: Number(item.discountAmount ?? 0),
      totalAmount: Number(item.totalAmount ?? 0),
      status: item.status,
      distributorId: item.distributorId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    } satisfies Payment));
  } catch (error) {
    console.error("Error fetching payment history:", error);
    throw error;
  }
};

export const fetchFinishedRequestsByDistributorBackend = async (
  distributorId: string,
): Promise<Request[]> => {
  const response = await api.get("/requests", { 
    params: { 
      distributorId,
      requestStatus: "Finalizada",
      paymentStatus: "Pendiente"
    } 
  });
  const raw = response.data;
  const list: any[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
    ? raw.data
    : [];
  
  // Filtrar por seguridad en el frontend también, por si el backend no soporta los filtros en params
   const filteredList = list.filter(item => {
     const status = (item.requestStatus || item.field_request_status || "").toLowerCase();
     const payment = (item.paymentStatus || item.field_payment_status || "").toLowerCase();
     
     return (status === "finalizada" || status === "finalizada") && 
            (payment !== "pagado" && payment !== "paid");
   });

  return filteredList.map((item) => {
    const applicant = item.applicant || {};
    const distributor = item.distributor || null;
    const service = item.service || {};

    const mapRequestStatusToLabel = (status?: string | null) => {
      switch (status) {
        case "Atendida":
          return "Atendida";
        case "EnProceso":
          return "En proceso";
        case "Finalizada":
          return "Finalizada";
        case "Incompleta":
          return "Incompleta";
        default:
          return "En proceso";
      }
    };

    const statusLabel = mapRequestStatusToLabel(item.requestStatus || item.field_request_status);

    return {
      id: item.id,
      title: item.title || "",
      created: item.createdAt || item.entryDate || "",
      applicationNumber: item.applicationNumber || "",
      status: item.requestStatus || item.field_request_status || "EnProceso",
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
      paymentStatus: item.paymentStatus ? { id: item.paymentStatus, name: item.paymentStatus } : undefined,
      serviceStatus: { id: item.requestStatus || item.field_request_status || "en-proceso", name: statusLabel },
    };
  });
};
// Crear un nuevo registro de pago (soporta múltiples solicitudes)
export const createPayment = async (): Promise<void> => {};

export interface Payment {
  id: string;
  title: string;
  observations?: string;
  baseValue?: number;
  additionalAmount?: number;
  discountAmount?: number;
  totalAmount?: number;
  status?: string;
  distributorId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentDto {
  title: string;
  observations?: string;
  baseValue?: number;
  additionalAmount?: number;
  discountAmount?: number;
  totalAmount?: number;
  status?: string;
  distributorId?: string;
  requests?: string[];
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

  const payload: CreatePaymentDto = {
    title: dto.title,
    observations: dto.observations,
    baseValue: dto.baseValue,
    additionalAmount: dto.additionalAmount,
    discountAmount: dto.discountAmount,
    totalAmount,
    status: dto.status ?? "Pendiente",
    distributorId: dto.distributorId,
    requests: dto.requests ?? [],
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
