import { ClipboardCheck, Save, Loader2 } from "lucide-react";
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
  }) => Promise<void>;
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave({
        serviceValue: Number(formData.serviceValue),
        logisticsCost: Number(formData.logisticsCost),
        distributorId: formData.distributorId,
      });
    } finally {
      setIsSubmitting(false);
    }
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
                disabled={isSubmitting}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg font-inherit text-base transition-colors focus:outline-none focus:border-blue-600 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Ej: 15000"
                value={formData.serviceValue}
                onChange={(e) =>
                  setFormData({ ...formData, serviceValue: e.target.value })
                }
              />
            </div>
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
              disabled={isSubmitting}
              className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg font-inherit text-base transition-colors focus:outline-none focus:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
            disabled={isSubmitting}
            className="w-full bg-[#2563EB] text-white border-none px-6 py-3 rounded-lg text-base font-medium cursor-pointer transition-all hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {isSubmitting ? "Guardando..." : "Guardar y Actualizar Solicitud"}
          </button>
        </form>
      </div>
    </div>
  );
}
