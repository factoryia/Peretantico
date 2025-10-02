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
      field_base_value: number;
      field_additional_value: number;
      field_discount_value: number;
      field_total_value: number;
      created: string;
      changed: string;
    };
    relationships: {
      field_distributor_data?: { data?: { id: string } };
      field_request?: { data?: { id: string } };
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
            include: "field_subservice,field_distributor_data",
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
      };
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
        include: "field_subservice,field_distributor_data",
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
      };
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
export const saveCostRecord = async (costData: {
  distributorId: string;
  requestId: string;
  baseValue: number;
  additionalValue: number;
  discountValue: number;
}): Promise<CostRecord> => {
  try {
    // TODO: Implementar endpoint real para guardar costos
    // Por ahora, simulamos la respuesta
    const paymentCalculation = calculatePayment(costData.baseValue, costData.additionalValue, costData.discountValue);
    const costRecord: CostRecord = {
      id: `cost_${Date.now()}`,
      distributorId: costData.distributorId,
      requestId: costData.requestId,
      paymentCalculation,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Simular llamada a API
    return new Promise((resolve) => {
      setTimeout(() => resolve(costRecord), 500);
    });
  } catch (error) {
    console.error("Error saving cost record:", error);
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
        include: "field_distributor_data,field_request",
      },
    });

    // Procesar pagos
    const payments: CostRecord[] = response.data.data.map((item) => {
      return {
        id: item.id,
        distributorId: distributorId,
        requestId: item.relationships.field_request?.data?.id || "",
        paymentCalculation: {
          baseValue: item.attributes.field_base_value,
          additionalValue: item.attributes.field_additional_value,
          discountValue: item.attributes.field_discount_value,
          total: item.attributes.field_total_value,
        },
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
