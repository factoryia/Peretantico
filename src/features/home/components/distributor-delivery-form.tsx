import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, ImagePlus, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@convex/_generated/dataModel";

const ALLOWED_EXTENSIONS = ["png", "gif", "jpg", "jpeg", "webp"];

type DeliveryAttachmentInput = {
  storageId: Id<"_storage">;
  fileName: string;
  mimeType?: string;
  kind: "delivery_radicado" | "delivery_photo";
};

export function DistributorDeliveryForm({
  requestId,
  initialObservations,
  onSuccess,
  onPreviewImage,
}: {
  requestId: string;
  initialObservations?: string;
  onSuccess?: () => void;
  onPreviewImage?: (url: string, caption: string) => void;
}) {
  const [radicadoFile, setRadicadoFile] = useState<File | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<"Atendida" | "Incompleta" | "EnProceso">("Atendida");
  const [observations, setObservations] = useState(initialObservations ?? "");

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const distributorUpdateRequest = useMutation(api.requests.distributorUpdateRequest);
  const deliveryRequirements = useQuery(api.requests.getDeliveryRequirements, {
    id: requestId as Id<"requests">,
  });

  const requiresFilingPhoto = deliveryRequirements?.requiresFilingPhoto === true;

  const validateFile = (file: File) => {
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    if (!fileExtension || !ALLOWED_EXTENSIONS.includes(fileExtension)) {
      throw new Error(`Formato no válido. Solo: ${ALLOWED_EXTENSIONS.join(", ")}`);
    }
  };

  const uploadFile = async (file: File) => {
    validateFile(file);
    const postUrl = await generateUploadUrl();
    const result = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!result.ok) throw new Error(`No se pudo subir ${file.name}`);
    const { storageId } = await result.json();
    return {
      storageId: storageId as Id<"_storage">,
      fileName: file.name,
      mimeType: file.type,
    };
  };

  const handleAdditionalFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    try {
      files.forEach(validateFile);
      setAdditionalFiles((prev) => [...prev, ...files]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Archivo no válido");
    }
    e.target.value = "";
  };

  const renderPreview = (file: File, onRemove: () => void, caption: string) => (
    <div
      className="relative rounded-lg overflow-hidden border border-blue-100 aspect-video bg-blue-50/30 cursor-pointer hover:ring-2 hover:ring-blue-500/50 transition-all group"
      onClick={() => onPreviewImage?.(URL.createObjectURL(file), caption)}
    >
      <img
        src={URL.createObjectURL(file)}
        className="w-full h-full object-cover"
        alt={caption}
      />
      <Button
        type="button"
        variant="destructive"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 rounded-full z-10"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (outcome === "Atendida") {
      if (requiresFilingPhoto && !radicadoFile) {
        toast.error("Adjunta la foto del radicado o sello de recibido");
        return;
      }
      if (!requiresFilingPhoto && !evidenceFile) {
        toast.error("Adjunta evidencia para marcar como completada");
        return;
      }
    }

    if ((outcome === "Incompleta" || outcome === "EnProceso") && !observations.trim()) {
      toast.error("Escribe qué pasó con la solicitud");
      return;
    }

    setIsSubmitting(true);
    try {
      const deliveryAttachments: DeliveryAttachmentInput[] = [];

      if (outcome === "Atendida") {
        if (requiresFilingPhoto && radicadoFile) {
          deliveryAttachments.push({ ...(await uploadFile(radicadoFile)), kind: "delivery_radicado" });
        }
        for (const file of additionalFiles) {
          deliveryAttachments.push({ ...(await uploadFile(file)), kind: "delivery_photo" });
        }
        if (!requiresFilingPhoto && evidenceFile) {
          deliveryAttachments.push({ ...(await uploadFile(evidenceFile)), kind: "delivery_photo" });
        }
      }

      await distributorUpdateRequest({
        id: requestId as Id<"requests">,
        requestStatus: outcome,
        observations: observations.trim() || undefined,
        evidenceStorageId: deliveryAttachments[0]?.storageId,
        deliveryAttachments: deliveryAttachments.length > 0 ? deliveryAttachments : undefined,
      });

      toast.success(
        outcome === "Atendida"
          ? "Entrega registrada con fotos"
          : outcome === "Incompleta"
            ? "Solicitud marcada como incompleta"
            : "Solicitud quedó pendiente"
      );
      setRadicadoFile(null);
      setAdditionalFiles([]);
      setEvidenceFile(null);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-blue-100 bg-blue-50/40 px-4 py-3 text-sm text-blue-900">
        Sube aquí las fotos de la entrega. Si el servicio requiere radicado, la foto del sello es obligatoria.
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase text-gray-500">Resultado de la visita</Label>
        <Select
          value={outcome}
          onValueChange={(value) => setOutcome(value as "Atendida" | "Incompleta" | "EnProceso")}
        >
          <SelectTrigger className="h-10 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Atendida">Completada</SelectItem>
            <SelectItem value="Incompleta">Incompleta (a medias)</SelectItem>
            <SelectItem value="EnProceso">Pendiente / no completada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase text-gray-500">Observaciones</Label>
        <Textarea
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          className="min-h-[80px] resize-none bg-white"
          placeholder="Notas de la entrega o motivo si quedó pendiente"
        />
      </div>

      {outcome === "Atendida" ? (
        <div className="space-y-3">
          {requiresFilingPhoto ? (
            <>
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Este servicio requiere foto del radicado o sello de recibido.
              </p>
              {radicadoFile ? renderPreview(radicadoFile, () => setRadicadoFile(null), "Radicado") : null}
              <div>
                <input
                  type="file"
                  id={`radicado-form-${requestId}`}
                  className="hidden"
                  accept=".png,.gif,.jpg,.jpeg,.webp"
                  disabled={isSubmitting}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      validateFile(file);
                      setRadicadoFile(file);
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Archivo no válido");
                    }
                  }}
                />
                <label
                  htmlFor={`radicado-form-${requestId}`}
                  className="flex items-center justify-center gap-2 w-full p-3 rounded-xl border-2 border-dashed border-amber-200 hover:bg-amber-50 cursor-pointer text-sm text-amber-800"
                >
                  <Camera className="h-4 w-4" />
                  Foto radicado / sello (obligatoria)
                </label>
              </div>
              {additionalFiles.map((file, index) =>
                renderPreview(file, () => {
                  setAdditionalFiles((prev) => prev.filter((_, i) => i !== index));
                }, `Adicional ${index + 1}`)
              )}
              <div>
                <input
                  type="file"
                  id={`additional-form-${requestId}`}
                  className="hidden"
                  multiple
                  accept=".png,.gif,.jpg,.jpeg,.webp"
                  disabled={isSubmitting}
                  onChange={handleAdditionalFilesChange}
                />
                <label
                  htmlFor={`additional-form-${requestId}`}
                  className="flex items-center justify-center gap-2 w-full p-3 rounded-xl border-2 border-dashed border-gray-200 hover:bg-gray-50 cursor-pointer text-sm text-gray-600"
                >
                  <ImagePlus className="h-4 w-4" />
                  Fotos adicionales (opcional)
                </label>
              </div>
            </>
          ) : (
            <>
              {evidenceFile ? renderPreview(evidenceFile, () => setEvidenceFile(null), "Evidencia") : null}
              <div>
                <input
                  type="file"
                  id={`evidence-form-${requestId}`}
                  className="hidden"
                  accept=".png,.gif,.jpg,.jpeg,.webp"
                  disabled={isSubmitting}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      validateFile(file);
                      setEvidenceFile(file);
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Archivo no válido");
                    }
                  }}
                />
                <label
                  htmlFor={`evidence-form-${requestId}`}
                  className="flex items-center justify-center gap-2 w-full p-3 rounded-xl border-2 border-dashed border-gray-200 hover:bg-gray-50 cursor-pointer text-sm text-gray-600"
                >
                  <Camera className="h-4 w-4" />
                  Adjuntar evidencia (obligatoria)
                </label>
              </div>
            </>
          )}
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Guardando...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Guardar entrega con fotos
          </>
        )}
      </Button>
    </form>
  );
}
