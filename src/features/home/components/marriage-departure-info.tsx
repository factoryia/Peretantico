import { AlertTriangle, Gavel } from "lucide-react";
import type { CompleteRequest } from "../utils/complete-request";

interface MarriageDepartureInfoProps {
  request: CompleteRequest | null;
}

export function MarriageDepartureInfo({ request }: MarriageDepartureInfoProps) {
  const infoService = request?.infoService as any;

  if (
    !infoService ||
    infoService.type !== "node--marriage_certificate_request"
  ) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500 mb-2">TIPO DE PARTIDA</p>
        <div className="inline-block bg-blue-100 text-blue-700 px-4 py-2 rounded-md font-semibold">
          {infoService.marriageType || "-"}
        </div>
      </div>

      {/* Registro en Registraduría */}
      <div>
        <p className="text-sm text-gray-500 mb-2">
          ¿Está rgistrado en Notaria o Registraduria?
        </p>
        <p className="text-lg font-semibold text-gray-900">
          {infoService.marriageRegistry || "-"}
        </p>
      </div>

      {/* Motivo de la Solicitud */}
      <div>
        <p className="text-sm text-gray-500 mb-2">MOTIVO DE LA SOLICITUD</p>
        <div className="flex items-center gap-2">
          <Gavel className="h-5 w-5 text-pink-600" />
          <p className="text-lg font-bold text-pink-600">
            {infoService.marriageCase || "-"}
          </p>
        </div>
      </div>

      {/* Información Adicional */}
      {/* <div>
        <p className="text-sm text-gray-500 mb-2">
          INFORMACIÓN ADICIONAL (SERIAL/COPIA)
        </p>
        <p className="text-base text-gray-900">
          Usuario adjuntó copia en imagen (Ver adjuntos).
        </p>
      </div> */}

      {/* Nota para el Asesor */}
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r">
        <div className="flex gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-700 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-800">
              Nota para el Asesor:{" "}
              <span className="font-normal text-yellow-700">
                Informar al cliente el valor adicional que cobra la
                Notaría/Registraduría.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
