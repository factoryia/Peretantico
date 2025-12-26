import { ClipboardCheck, Save } from "lucide-react";
import { useState } from "react";

export interface Distributor {
  id: string;
  name: string;
}

interface RequestManagementCardProps {
  serviceValue?: number;
  logisticsCost?: number;
  assignedDistributor?: string;
  distributors: Distributor[];
  onSave: (data: {
    serviceValue: number;
    logisticsCost: number;
    distributorId: string;
  }) => void;
}

export function RequestManagementCard({
  serviceValue = 0,
  logisticsCost = 0,
  assignedDistributor = "",
  distributors,
  onSave,
}: RequestManagementCardProps) {
  const [formData, setFormData] = useState({
    serviceValue: serviceValue || "",
    logisticsCost: logisticsCost || "",
    distributorId: assignedDistributor || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      serviceValue: Number(formData.serviceValue),
      logisticsCost: Number(formData.logisticsCost),
      distributorId: formData.distributorId,
    });
  };

  return (
    <div className="bg-[#F8F9FA] overflow-hidden h-full px-6 py-7">
      <div className="text-[#6B7280] text-[12.8px] uppercase font-semibold flex items-center gap-2.5 pb-4">
        <ClipboardCheck className="w-5 h-5" />
        Gestión / Asignación
      </div>
      <div>
        <form onSubmit={handleSubmit}>
          <div className="flex gap-5 mb-5">
            <div className="flex-1">
              <label
                htmlFor="valorServicio"
                className="block mb-2 font-medium text-gray-800"
              >
                Valor Total del Servicio ($)
              </label>
              <input
                type="number"
                id="valorServicio"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg font-inherit text-base transition-colors focus:outline-none focus:border-blue-600 bg-white"
                placeholder="Ej: 15000"
                value={formData.serviceValue}
                onChange={(e) =>
                  setFormData({ ...formData, serviceValue: e.target.value })
                }
              />
            </div>
            {/* <div className="flex-1">
              <label
                htmlFor="costoLogistica"
                className="block mb-2 font-medium text-gray-800"
              >
                Costo Logística ($)
              </label>
              <input
                type="number"
                id="costoLogistica"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg font-inherit text-base transition-colors focus:outline-none focus:border-blue-600"
                placeholder="Ej: 5000"
                value={formData.logisticsCost}
                onChange={(e) =>
                  setFormData({ ...formData, logisticsCost: e.target.value })
                }
              />
            </div> */}
          </div>

          <div className="mb-6">
            <label
              htmlFor="asignarRepartidor"
              className="block mb-2 font-medium text-gray-800"
            >
              Asignar Repartidor
            </label>
            <select
              id="asignarRepartidor"
              className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg font-inherit text-base transition-colors focus:outline-none focus:border-blue-600"
              value={formData.distributorId}
              onChange={(e) =>
                setFormData({ ...formData, distributorId: e.target.value })
              }
            >
              <option value="">Seleccionar repartidor...</option>
              {distributors.map((distributor) => (
                <option key={distributor.id} value={distributor.id}>
                  {distributor.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-[#2563EB] text-white border-none px-6 py-3 rounded-lg text-base font-medium cursor-pointer transition-colors hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            Guardar y Actualizar Solicitud
          </button>
        </form>
      </div>
    </div>
  );
}
