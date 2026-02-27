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
import {
  Eye,
  Camera,
  CheckCircle2,
  Loader2,
  Upload,
  ZoomIn,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { CompleteRequest } from "../utils/complete-request";
import { uploadEvidence, completeRequestWithEvidence } from "../utils/evidence";
import { API_BASE_URL } from "@/features/auth/constants";
import { ImageModal } from "./image-modal";

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
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [modalImageData, setModalImageData] = useState<{
    url: string;
    caption: string;
  }>({ url: "", caption: "" });

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
        return "Sin estado";
    }
  };

  const statusName = mapRequestStatusToLabel(request.requestStatus);

  const openImageModal = (url: string, caption: string) => {
    setModalImageData({ url, caption });
    setIsImageModalOpen(true);
  };

  const getStatusStyles = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (
      lowerStatus.includes("atendida") ||
      lowerStatus.includes("finalizada") ||
      lowerStatus.includes("exito")
    ) {
      return "bg-green-100 text-green-700 border-green-200";
    }
    if (lowerStatus.includes("proceso")) {
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    }
    if (lowerStatus.includes("incompleta") || lowerStatus.includes("cancel")) {
      return "bg-red-100 text-red-700 border-red-200";
    }
    return "bg-blue-100 text-blue-700 border-blue-200";
  };

  const isCompleted =
    statusName.toLowerCase().includes("atendida") ||
    statusName.toLowerCase().includes("exito");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const ALLOWED_EXTENSIONS = ["png", "gif", "jpg", "jpeg", "webp"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Por favor selecciona una evidencia (foto/archivo)");
      return;
    }

    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    if (!fileExtension || !ALLOWED_EXTENSIONS.includes(fileExtension)) {
      toast.error(
        `Formato no válido. Solo se permiten: ${ALLOWED_EXTENSIONS.join(", ")}`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const fileUuid = await uploadEvidence(file);
      await completeRequestWithEvidence(request.id, fileUuid);
      toast.success("¡Solicitud completada con éxito!");
      setFile(null);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error al completar la solicitud:", error);
      toast.error(
        "Hubo un error al subir la evidencia. Por favor intenta de nuevo."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resolver dirección adecuadamente para el repartidor
  const getAddress = () => {
    const info = request.infoService;
    if (info?.type === "node--water_sample_fridge") {
      return (
        (info as any).deliveryAddress ||
        (info as any).recipientAddress ||
        (info as any).senderAddress ||
        "Sin dirección"
      );
    } else if (info?.type === "node--medical_bills") {
      return (
        (info as any).recipientAddress ||
        (info as any).senderAddress ||
        "Sin dirección"
      );
    } else if (info?.type === "node--request_medication") {
      return (
        (info as any).address || request.applicant?.address || "Sin dirección"
      );
    }
    return request.applicant?.address || "Sin dirección";
  };

  // Resolver nombre adecuadamente para el repartidor
  const getFullName = () => {
    const info = request.infoService;
    if (info?.type === "node--water_sample_fridge") {
      return (
        (info as any).recipientFullName ||
        (info as any).senderFullName ||
        request.applicant?.name ||
        "Sin nombre"
      );
    } else if (info?.type === "node--medical_bills") {
      return (
        (info as any).recipientFullName ||
        (info as any).senderFullName ||
        request.applicant?.name ||
        "Sin nombre"
      );
    }
    return request.applicant?.name || "Sin nombre";
  };

  const fullName = getFullName();

  const address = getAddress();

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
          <Badge
            className={`rounded-full px-3 py-0.5 text-[10px] font-semibold border ${getStatusStyles(
              statusName
            )}`}
          >
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
            <p className="text-sm font-semibold text-gray-800">{fullName}</p>
          </div>

          <div>
            <Label className="text-[10px] uppercase text-gray-400 font-bold tracking-tight">
              Dirección de Entrega
            </Label>
            <p className="text-sm text-gray-600 leading-snug">{address}</p>
          </div>

          <div>
            <Label className="text-[10px] uppercase text-gray-400 font-bold tracking-tight">
              Detalle del Servicio
            </Label>
            <p className="text-sm text-gray-600 line-clamp-2 italic">
              "{request.title}"
            </p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="bg-gray-50/30 pt-4 pb-6 border-t flex flex-col gap-3">
        <Button
          variant="secondary"
          className="w-full h-9 bg-white hover:bg-blue-50 hover:text-blue-600 text-gray-600 border border-gray-100 rounded-lg transition-colors font-semibold text-xs shadow-sm"
          onClick={() => onViewDetail?.(request)}
        >
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          Ver detalle de solicitud
        </Button>

        {request.evidenceImage && (
          <div className="w-full mt-2">
            <Label className="text-[10px] uppercase text-gray-400 font-bold tracking-tight mb-2 block">
              Evidencia de Entrega
            </Label>
            <div
              className="relative rounded-lg overflow-hidden border border-gray-100 shadow-sm bg-gray-50 aspect-video cursor-pointer hover:ring-2 hover:ring-blue-500/50 transition-all group"
              onClick={() =>
                openImageModal(
                  API_BASE_URL + request.evidenceImage!.uri,
                  "Evidencia de entrega"
                )
              }
            >
              <img
                src={API_BASE_URL + request.evidenceImage.uri}
                alt="Evidencia de entrega"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  (
                    e.target as HTMLImageElement
                  ).src = `https://placehold.co/600x400?text=Error+al+cargar+imagen`;
                }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center transition-all">
                <ZoomIn className="text-white opacity-0 group-hover:opacity-100 w-8 h-8 drop-shadow-lg" />
              </div>
            </div>
          </div>
        )}

        {isCompleted ? (
          <div className="w-full flex flex-col items-center justify-center py-2 text-green-600 gap-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-semibold">Servicio Finalizado</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full space-y-3">
            {file && (
              <div
                className="relative rounded-lg overflow-hidden border border-blue-100 aspect-video mb-2 bg-blue-50/30 cursor-pointer hover:ring-2 hover:ring-blue-500/50 transition-all group"
                onClick={() =>
                  openImageModal(
                    URL.createObjectURL(file),
                    "Vista previa de evidencia"
                  )
                }
              >
                <img
                  src={URL.createObjectURL(file)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  alt="Vista previa"
                />
                <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 flex items-center justify-center transition-all">
                  <ZoomIn className="text-white opacity-0 group-hover:opacity-100 w-8 h-8 drop-shadow-lg" />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 rounded-full z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            <div className="relative group">
              <input
                type="file"
                id={`evidence-${request.id}`}
                className="hidden"
                onChange={handleFileChange}
                accept=".png,.gif,.jpg,.jpeg,.webp"
                disabled={isSubmitting}
              />
              <label
                htmlFor={`evidence-${request.id}`}
                className={`flex items-center justify-center gap-2 w-full p-3 rounded-xl border-2 border-dashed transition-all cursor-pointer
                  ${
                    file
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-500"
                  } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {file ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs font-medium truncate max-w-[200px]">
                      {file.name}
                    </span>
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4" />
                    <span className="text-xs font-medium">
                      Adjuntar Evidencia
                    </span>
                  </>
                )}
              </label>
            </div>

            <Button
              type="submit"
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
              disabled={!file || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Completar Solicitud
                </>
              )}
            </Button>
          </form>
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
