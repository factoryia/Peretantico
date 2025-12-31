import type {
  CompleteRequest,
  WaterSampleFridgeInfoService,
} from "../utils/complete-request";
import { DataPoint } from "./data-point";
import { cn } from "@/lib/utils";
import { Package } from "lucide-react";

interface WaterSampleFridgeInfoProps {
  request: CompleteRequest | null;
}

export function WaterSampleFridgeInfo({ request }: WaterSampleFridgeInfoProps) {
  const infoService = request?.infoService as
    | WaterSampleFridgeInfoService
    | undefined;

  if (!infoService || infoService.type !== "node--water_sample_fridge") {
    return null;
  }

  const formatDate = (dateString?: string) => {
    if (!dateString)
      return <span className="text-gray-400">Sin fecha especificada</span>;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime()))
        return <span className="text-gray-400">Sin fecha especificada</span>;

      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = String(date.getFullYear()).slice(-2);

      return `${day}/${month}/${year}`;
    } catch {
      return <span className="text-gray-400">Sin fecha especificada</span>;
    }
  };

  return (
    <div className="bg-white overflow-hidden h-full px-6 py-7 border-b border-l">
      <div className="text-[#6B7280] text-[12.8px] uppercase font-semibold flex items-center gap-2.5 pb-4">
        <Package className="w-5 h-5 text-blue-600" />
        Datos del Destinatario
      </div>
      <div className="flex flex-col gap-4">
        {/* Destinatario Section */}
        <div className="border-l-4 border-blue-600 bg-blue-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-blue-600 uppercase mb-1">
            Nombre / Entidad
          </p>
          <h2
            className={cn(
              "text-lg font-semibold",
              infoService.recipientFullName ? "text-[#004085]" : "text-gray-400"
            )}
          >
            {infoService.recipientFullName || "Sin nombre especificado"}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {infoService.waterService?.toLowerCase().includes("nevera") ? (
            <>
              <DataPoint
                label="Dirección Entrega"
                value={
                  infoService.deliveryAddress || "Sin dirección de entrega"
                }
              />

              <div>
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide border-b border-dotted border-gray-200 pb-1">
                  Código Laboratorio
                </p>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <p
                    className={cn(
                      "text-sm leading-relaxed italic",
                      infoService.labRegistrationCode
                        ? "text-gray-700"
                        : "text-gray-400"
                    )}
                  >
                    {infoService.labRegistrationCode ||
                      "Sin código de laboratorio"}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <DataPoint
                label="Fecha Nacimiento"
                value={formatDate(infoService.birthDate)}
              />

              <div>
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide border-b border-dotted border-gray-200 pb-1">
                  Contenido
                </p>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <p
                    className={cn(
                      "text-sm leading-relaxed italic",
                      infoService.packageContentDescription
                        ? "text-gray-700"
                        : "text-gray-400"
                    )}
                  >
                    {infoService.packageContentDescription
                      ? `"${infoService.packageContentDescription}"`
                      : "Sin contenido especificado"}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
