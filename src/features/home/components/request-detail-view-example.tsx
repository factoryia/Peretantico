import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RequestHeader } from "./request-header";
import { PatientDataCard } from "./patient-data-card";
import { RequestDetailCard } from "./request-detail-card";
import { AttachmentsCard, type Attachment } from "./attachments-card";
import { PaymentPriorityCard } from "./payment-priority-card";
import {
  RequestManagementCard,
  type Distributor,
} from "./request-management-card";
import type { Request } from "../types/request";
import { useEffect, useState } from "react";
import api from "@/api";

interface RequestDetailViewModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  request: Request | null;
}

/**
 * Modal que muestra el detalle completo de una solicitud.
 * Utiliza los componentes extraídos del HTML original para mostrar
 * la información de manera visual y organizada.
 */
export function RequestDetailViewModal({
  isOpen,
  onOpenChange,
  request,
}: RequestDetailViewModalProps) {
  const [applicantInfo, setApplicantInfo] = useState<{
    fullName: string;
    documentType: string;
    documentNumber: string;
    phone: string;
    address: string;
    municipality: string;
  } | null>(null);

  const [subserviceInfo, setSubserviceInfo] = useState<{
    name: string;
  } | null>(null);

  const [statusInfo, setStatusInfo] = useState<{
    name: string;
  } | null>(null);

  const [paymentStatusInfo, setPaymentStatusInfo] = useState<{
    name: string;
  } | null>(null);

  const [distributorsList, setDistributorsList] = useState<Distributor[]>([]);

  // Cargar información del solicitante
  useEffect(() => {
    const applicantId = request?.relationships?.field_applicant?.data?.id;
    if (!applicantId) {
      setApplicantInfo(null);
      return;
    }

    const fetchApplicantInfo = async () => {
      try {
        const response = await api.get(
          `/api/node/profile/${applicantId}?include=field_type_document,field_gender`
        );
        const profile = response.data.data;

        let documentType = "Cédula de Ciudadanía";
        if (response.data.included) {
          const documentTypeEntity = response.data.included.find(
            (item: { type: string }) => item.type === "taxonomy_term--document_type"
          );
          if (documentTypeEntity?.attributes?.name) {
            documentType = documentTypeEntity.attributes.name;
          }
        }

        setApplicantInfo({
          fullName: profile.attributes.field_full_name || profile.attributes.title || "Sin nombre",
          documentType,
          documentNumber: profile.attributes.field_document_number || "Sin documento",
          phone: profile.attributes.field_phone_number || profile.attributes.field_phone || "Sin teléfono",
          address: profile.attributes.field_address || "Sin dirección",
          municipality: profile.attributes.field_municipality || "Sin municipio",
        });
      } catch (error) {
        console.error("Error fetching applicant info:", error);
        setApplicantInfo(null);
      }
    };

    fetchApplicantInfo();
  }, [request]);

  // Cargar información del subservicio
  useEffect(() => {
    const subserviceId = request?.relationships?.field_subservice?.data?.id;
    if (!subserviceId) {
      setSubserviceInfo(null);
      return;
    }

    const fetchSubserviceInfo = async () => {
      try {
        const response = await api.get(
          `/api/taxonomy_term/category/${subserviceId}`
        );
        setSubserviceInfo({
          name: response.data.data.attributes.name || "Sin subservicio",
        });
      } catch (error) {
        console.error("Error fetching subservice info:", error);
        setSubserviceInfo(null);
      }
    };

    fetchSubserviceInfo();
  }, [request]);

  // Cargar información del estado
  useEffect(() => {
    const statusId = request?.relationships?.field_application_statuses?.data?.id;
    if (!statusId) {
      setStatusInfo(null);
      return;
    }

    const fetchStatusInfo = async () => {
      try {
        const response = await api.get(
          `/api/taxonomy_term/application_statuses/${statusId}`
        );
        setStatusInfo({
          name: response.data.data.attributes.name || "Sin estado",
        });
      } catch (error) {
        console.error("Error fetching status info:", error);
        setStatusInfo(null);
      }
    };

    fetchStatusInfo();
  }, [request]);

  // Cargar información del estado de pago
  useEffect(() => {
    const paymentStatusId = request?.relationships?.field_payment_status?.data?.id;
    if (!paymentStatusId) {
      setPaymentStatusInfo(null);
      return;
    }

    const fetchPaymentStatusInfo = async () => {
      try {
        const response = await api.get(
          `/api/taxonomy_term/payment_status/${paymentStatusId}`
        );
        setPaymentStatusInfo({
          name: response.data.data.attributes.name || "Sin estado de pago",
        });
      } catch (error) {
        console.error("Error fetching payment status info:", error);
        setPaymentStatusInfo(null);
      }
    };

    fetchPaymentStatusInfo();
  }, [request]);

  // Cargar lista de distribuidores
  useEffect(() => {
    const fetchDistributors = async () => {
      try {
        const response = await api.get("/api/node/distributor");
        const distributors = response.data.data.map((dist: { id: string; attributes: { title: string } }) => ({
          id: dist.id,
          name: dist.attributes.title || "Sin nombre",
        }));
        setDistributorsList(distributors);
      } catch (error) {
        console.error("Error fetching distributors:", error);
        setDistributorsList([]);
      }
    };

    if (isOpen) {
      fetchDistributors();
    }
  }, [isOpen]);

  // Datos de ejemplo para adjuntos (placeholder)
  const sampleAttachments: Attachment[] = [
    {
      url: "https://via.placeholder.com/150x100?text=Cedula+Frente",
      label: "Cédula Frente",
      alt: "Cédula Frente",
    },
    {
      url: "https://via.placeholder.com/150x100?text=Cedula+Dorso",
      label: "Cédula Dorso",
      alt: "Cédula Dorso",
    },
    {
      url: "https://via.placeholder.com/150?text=Orden+Medica",
      label: "Orden/Mipres",
      alt: "Orden Médica",
    },
    {
      url: "https://via.placeholder.com/150?text=Comprobante+Pago",
      label: "Pago",
      alt: "Pago",
    },
  ];

  const handleSave = (data: {
    serviceValue: number;
    logisticsCost: number;
    distributorId: string;
  }) => {
    console.log("Datos guardados:", data);
    // Aquí iría la lógica para guardar los datos
  };

  if (!request) return null;

  // Formatear fecha de creación
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Fecha no disponible";
    }
  };

  // Determinar variante del estado
  const getStatusVariant = (statusName: string): "nuevo" | "en-proceso" | "completado" => {
    const lowerStatus = statusName.toLowerCase();
    if (lowerStatus.includes("nuevo")) return "nuevo";
    if (lowerStatus.includes("proceso") || lowerStatus.includes("asignado")) return "en-proceso";
    if (lowerStatus.includes("completado") || lowerStatus.includes("entregado") || lowerStatus.includes("cancelado")) return "completado";
    return "nuevo";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Detalle de Solicitud</DialogTitle>
        </DialogHeader>
        
        <div className="bg-gray-50 min-h-screen p-5 font-['Poppins',sans-serif]">
          <RequestHeader
            requestId={request.attributes.field_application_number || "Sin número"}
            createdDate={formatDate(request.attributes.created)}
            status={statusInfo?.name || "Sin estado"}
            statusVariant={getStatusVariant(statusInfo?.name || "")}
          />

          {/* Primera fila de tarjetas */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(350px,1fr))] gap-6 mb-6">
            <PatientDataCard
              fullName={applicantInfo?.fullName || "Cargando..."}
              documentType={applicantInfo?.documentType || "Cargando..."}
              documentNumber={applicantInfo?.documentNumber || "Cargando..."}
              phone={applicantInfo?.phone || "Cargando..."}
              address={applicantInfo?.address || "Cargando..."}
              municipality={applicantInfo?.municipality || "Cargando..."}
            />

            <RequestDetailCard
              serviceType={subserviceInfo?.name || "Cargando..."}
              eps="N/A"
              drugstore="N/A"
              observations={request.attributes.field_observations || "Sin observaciones"}
            />

            <AttachmentsCard attachments={sampleAttachments} />
          </div>

          {/* Segunda fila de tarjetas */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(350px,1fr))] gap-6">
            <PaymentPriorityCard
              priority="normal"
              paymentMethod={paymentStatusInfo?.name || "Sin método de pago"}
            />

            <RequestManagementCard
              serviceValue={request.attributes.field_service_value || 0}
              logisticsCost={request.attributes.field_logistics_costs || 0}
              assignedDistributor={request.relationships?.field_distributor_data?.data?.id || ""}
              distributors={distributorsList}
              onSave={handleSave}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
