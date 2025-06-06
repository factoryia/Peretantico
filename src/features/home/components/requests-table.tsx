import { Eye, Edit, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import type { RequestDetail } from "../types";
import { RequestDetailModal } from "./request-detail-modal";

const solicitudes: RequestDetail[] = [
  {
    id: "SOL-001",
    fecha: "2025-05-22",
    solicitante: {
      nombre: "María González",
      documento: "12345678",
      telefono: "3001234567",
      direccion: "Calle 123 #45-67",
    },
    servicio: {
      categoria: "Medicamentos",
      servicio: "Reclamación medicamentos EPS",
      eps: "Compensar",
      ordenMedica: "OM-12345",
    },
    gestion: {
      repartidor: "Carlos Ruiz",
      estado: "En proceso",
      observaciones: "",
    },
  },
  {
    id: "SOL-002",
    fecha: "2025-05-22",
    solicitante: {
      nombre: "José Martínez",
      documento: "87654321",
      telefono: "3109876543",
      direccion: "Carrera 45 #12-34",
    },
    servicio: {
      categoria: "Trámites",
      servicio: "Trámites notariales",
      eps: "Sura",
      ordenMedica: "N/A",
    },
    gestion: {
      repartidor: "Ana López",
      estado: "Finalizado",
      observaciones: "Entregado exitosamente",
    },
  },
  {
    id: "SOL-003",
    fecha: "2025-05-21",
    solicitante: {
      nombre: "Carmen Rodríguez",
      documento: "11223344",
      telefono: "3156677889",
      direccion: "Avenida 80 #23-45",
    },
    servicio: {
      categoria: "Paquetes",
      servicio: "Recogida de paquetes",
      eps: "Nueva EPS",
      ordenMedica: "N/A",
    },
    gestion: {
      repartidor: "Pedro Sánchez",
      estado: "Nuevo",
      observaciones: "",
    },
  },
];

function getStatusBadge(estado: string) {
  switch (estado) {
    case "Nuevo":
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          Nuevo
        </Badge>
      );
    case "En proceso":
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          En proceso
        </Badge>
      );
    case "Finalizado":
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          Finalizado
        </Badge>
      );
    default:
      return <Badge variant="secondary">{estado}</Badge>;
  }
}

export function RequestsTable() {
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestDetail | null>(
    null
  );

  const handleViewDetails = (request: RequestDetail) => {
    setSelectedRequest(request);
    setIsDetailModalOpen(true);
  };

  return (
    <>
      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold text-gray-700 px-6">
                SOLICITUD
              </TableHead>
              <TableHead className="font-semibold text-gray-700 px-6">
                SOLICITANTE
              </TableHead>
              <TableHead className="font-semibold text-gray-700 px-6">
                SERVICIO
              </TableHead>
              <TableHead className="font-semibold text-gray-700 px-6">
                REPARTIDOR
              </TableHead>
              <TableHead className="font-semibold text-gray-700 px-6">
                ESTADO
              </TableHead>
              <TableHead className="font-semibold text-gray-700 px-6">
                ACCIONES
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {solicitudes.map((solicitud) => (
              <TableRow key={solicitud.id} className="hover:bg-gray-50">
                <TableCell className="px-6 py-4">
                  <div>
                    <div className="font-medium">{solicitud.id}</div>
                    <div className="text-sm text-gray-500">
                      {solicitud.fecha}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4">
                  <div>
                    <div className="font-medium">
                      {solicitud.solicitante.nombre}
                    </div>
                    <div className="text-sm text-gray-500">
                      {solicitud.solicitante.documento}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4">
                  <div>
                    <div className="font-medium">
                      {solicitud.servicio.categoria}
                    </div>
                    <div className="text-sm text-gray-500">
                      {solicitud.servicio.servicio}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4">
                  <div className="font-medium">
                    {solicitud.gestion.repartidor}
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4">
                  {getStatusBadge(solicitud.gestion.estado)}
                </TableCell>
                <TableCell className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(solicitud)}
                    >
                      <Eye className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(solicitud)}
                    >
                      <Edit className="h-4 w-4 text-emerald-500" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <UserPlus className="h-4 w-4 text-purple-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <RequestDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        request={selectedRequest}
      />
    </>
  );
}
