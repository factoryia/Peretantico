import { useState } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, CheckCircle2, ZoomIn } from "lucide-react";
import type { CompleteRequest } from "../utils/complete-request";
import { ImageModal } from "./image-modal";
import { DistributorDeliveryForm } from "./distributor-delivery-form";

interface DistributorRequestCardProps {
  request: CompleteRequest;
  onSuccess?: () => void;
  onViewDetail?: (request: CompleteRequest) => void;
}

export function DistributorRequestCard({
  request,
  onSuccess,
  onViewDetail,
}: DistributorRequestCardProps) {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [modalImageData, setModalImageData] = useState({ url: "", caption: "" });

  const mapRequestStatusToLabel = (status?: string | null) => {
    switch (status) {
      case "Finalizada":
        return "Finalizada";
      case "Atendida":
        return "Atendida";
      case "EnProceso":
        return "En proceso";
      case "Incompleta":
        return "Incompleta";
      default:
        return "Sin estado";
    }
  };

  const statusName = mapRequestStatusToLabel(request.requestStatus);
  const isClosed = statusName === "Finalizada" || statusName === "Atendida";

  const getStatusStyles = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes("atendida") || lowerStatus.includes("finalizada")) {
      return "bg-green-100 text-green-700 border-green-200";
    }
    if (lowerStatus.includes("proceso")) {
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    }
    if (lowerStatus.includes("incompleta")) {
      return "bg-red-100 text-red-700 border-red-200";
    }
    return "bg-blue-100 text-blue-700 border-blue-200";
  };

  const getAddress = () => {
    const info = request.infoService;
    if (info?.type === "node--water_sample_fridge") {
      return (
        (info as any).deliveryAddress ||
        (info as any).recipientAddress ||
        (info as any).senderAddress ||
        "Sin dirección"
      );
    }
    if (info?.type === "node--medical_bills") {
      return (info as any).recipientAddress || (info as any).senderAddress || "Sin dirección";
    }
    if (info?.type === "node--request_medication") {
      return (info as any).address || request.applicant?.address || "Sin dirección";
    }
    return request.applicant?.address || "Sin dirección";
  };

  const getFullName = () => {
    const info = request.infoService;
    if (info?.type === "node--water_sample_fridge" || info?.type === "node--medical_bills") {
      return (
        (info as any).recipientFullName ||
        (info as any).senderFullName ||
        request.applicant?.name ||
        "Sin nombre"
      );
    }
    return request.applicant?.name || "Sin nombre";
  };

  return (
    <Card className="overflow-hidden border-2 transition-all hover:shadow-md py-0">
      <CardHeader className="bg-gray-50/50 pb-3 pt-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Solicitud
            </span>
            <CardTitle className="text-sm font-mono font-bold text-blue-600">
              {request.field_application_number}
            </CardTitle>
          </div>
          <Badge className={`rounded-full px-3 py-0.5 text-[10px] font-semibold border ${getStatusStyles(statusName)}`}>
            {statusName}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4 flex-1">
        <div className="space-y-3">
          <div>
            <Label className="text-[10px] uppercase text-gray-400 font-bold tracking-tight">
              Cliente / Destinatario
            </Label>
            <p className="text-sm font-semibold text-gray-800">{getFullName()}</p>
          </div>
          <div>
            <Label className="text-[10px] uppercase text-gray-400 font-bold tracking-tight">
              Dirección de Entrega
            </Label>
            <p className="text-sm text-gray-600 leading-snug">{getAddress()}</p>
          </div>
          <div>
            <Label className="text-[10px] uppercase text-gray-400 font-bold tracking-tight">
              Detalle del Servicio
            </Label>
            <p className="text-sm text-gray-600 line-clamp-2 italic">"{request.title}"</p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="bg-gray-50/30 pt-4 pb-6 border-t flex flex-col gap-3">
        <Button
          variant="secondary"
          className="w-full h-9 bg-white hover:bg-blue-50 hover:text-blue-600 text-gray-600 border border-gray-100 rounded-lg font-semibold text-xs shadow-sm"
          onClick={() => onViewDetail?.(request)}
        >
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          Ver detalle de solicitud
        </Button>

        {request.evidenceImage ? (
          <div className="w-full">
            <Label className="text-[10px] uppercase text-gray-400 font-bold tracking-tight mb-2 block">
              Evidencia de Entrega
            </Label>
            <div
              className="relative rounded-lg overflow-hidden border aspect-video cursor-pointer group"
              onClick={() => {
                setModalImageData({ url: request.evidenceImage!.uri, caption: "Evidencia de entrega" });
                setIsImageModalOpen(true);
              }}
            >
              <img src={request.evidenceImage.uri} alt="Evidencia" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center">
                <ZoomIn className="text-white opacity-0 group-hover:opacity-100 w-8 h-8" />
              </div>
            </div>
          </div>
        ) : null}

        {isClosed ? (
          <div className="w-full flex items-center justify-center py-2 text-green-600 gap-2">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-semibold">Servicio completado</span>
          </div>
        ) : (
          <div className="w-full space-y-2 border-t border-dashed border-gray-200 pt-3">
            <Label className="text-[10px] uppercase text-blue-700 font-bold tracking-tight block">
              Completar entrega — subir fotos aquí
            </Label>
            <DistributorDeliveryForm
            requestId={request.id}
            initialObservations={request.field_observations}
            onPreviewImage={(url, caption) => {
              setModalImageData({ url, caption });
              setIsImageModalOpen(true);
            }}
            onSuccess={onSuccess}
          />
          </div>
        )}
      </CardFooter>

      <ImageModal
        isOpen={isImageModalOpen}
        imageUrl={modalImageData.url}
        caption={modalImageData.caption}
        onClose={() => setIsImageModalOpen(false)}
      />
    </Card>
  );
}
