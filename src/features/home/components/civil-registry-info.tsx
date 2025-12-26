import React from "react";
import type { CompleteRequest } from "../utils/complete-request";

interface CivilRegistryInfoProps {
  request: CompleteRequest | null;
}

export function CivilRegistryInfo({ request }: CivilRegistryInfoProps) {
  const infoService = request?.infoService;

  if (!infoService || infoService.type !== "node--civil_registry_request") {
    return null;
  }

  return (
    <>
      {/* Titular Section with Blue Border */}
      <div className="border-l-4 border-blue-600 bg-blue-50 p-4 rounded-lg">
        <p className="text-sm font-medium text-blue-600 uppercase mb-1">
          Titular del Registro (A quien pertenece)
        </p>
        <h2 className="text-lg font-semibold text-[#004085]">
          {infoService.registrantFullName || "-"}
        </h2>
      </div>

      {/* Two Column Info Section */}
      <div className="grid grid-cols-2 gap-6 my-4">
        <div>
          <p className="text-sm text-gray-500 mb-1">¿TIENE NÚMERO?</p>
          <p className="text-lg text-gray-900">
            {infoService.hasRegistrationNumber ? "Sí" : "No"}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">NÚMERO DE REGISTRO</p>
          <p className="text-lg text-gray-900">
            {infoService.registrantRegistrationCode || "-"}
          </p>
        </div>
      </div>

      {/* Notaría Section */}
      <div className="pt-2">
        <p className="text-sm text-gray-500 mb-1">NOTARÍA INSCRITA</p>
        <p className="text-lg font-semibold text-gray-900">
          {infoService.registryNotaryNumber || "-"}
        </p>
      </div>

      {/* Three Column Bottom Section with Separators */}
      <div className="grid grid-cols-3 gap-6 pt-4 border-t bg-[#F9F9F9] p-1 rounded-lg mt-3">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">TOMO</p>
          <p className="text-base font-semibold text-[#333333]">
            {infoService.registryTomeNumber || "0"}
          </p>
        </div>
        <div className="text-center border-x border-gray-200">
          <p className="text-sm text-gray-500 mb-1">FOLIO</p>
          <p className="text-base font-semibold text-[#333333]">
            {infoService.registryFolioNumber || "0"}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">SERIAL</p>
          <p className="text-base font-semibold text-[#333333]">
            {infoService.registrySerialNumber || "0"}
          </p>
        </div>
      </div>
    </>
  );
}
