import { UserCircle } from "lucide-react";
import { DataPoint } from "./data-point";

interface PatientDataCardProps {
  fullName: string;
  documentType: string;
  documentNumber: string;
  phone: string;
  address: string;
  municipality: string;
}

export function PatientDataCard({
  fullName,
  documentType,
  documentNumber,
  phone,
  address,
  municipality,
}: PatientDataCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full">
      <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 text-lg font-semibold flex items-center gap-2.5">
        <UserCircle className="w-5 h-5 text-blue-600" />
        Datos del Paciente
      </div>
      <div className="p-5">
        <DataPoint label="Nombre Completo" value={fullName} />
        
        <div className="flex gap-5">
          <div className="flex-1">
            <DataPoint label="Tipo de Documento" value={documentType} />
          </div>
          <div className="flex-1">
            <DataPoint label="Número de Documento" value={documentNumber} />
          </div>
        </div>

        <DataPoint
          label="Teléfono de Contacto"
          value={
            <span className="flex items-center gap-1">
              <i className="fab fa-whatsapp text-green-600"></i> {phone}
            </span>
          }
        />

        <DataPoint
          label="Dirección de Entrega y Municipio"
          value={`${address}, ${municipality}`}
          noBorder
        />
      </div>
    </div>
  );
}
