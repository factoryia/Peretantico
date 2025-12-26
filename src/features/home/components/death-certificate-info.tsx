import type { CompleteRequest } from "../utils/complete-request";

interface DeathCertificateInfoProps {
  request: CompleteRequest | null;
}

export function DeathCertificateInfo({ request }: DeathCertificateInfoProps) {
  return (
    <>
      {/* Motivo Section with Blue Border */}
      <div className="border-l-4 border-blue-600 bg-gray-50 p-4 rounded-lg">
        <p className="text-sm font-medium text-gray-500 uppercase mb-2">
          Motivo de la solicitud
        </p>
        <p className="text-lg font-semibold text-gray-900">
          "{request?.infoService?.title || "-"}"
        </p>
      </div>

      {/* Documento Base Section */}
      {/* <div>
        <p className="text-sm text-gray-500 mb-2">DOCUMENTO BASE</p>
        <p className="text-base text-gray-900">
          Usuario adjuntó copia/foto de la partida anterior (Ver adjuntos).
        </p>
      </div> */}
    </>
  );
}
