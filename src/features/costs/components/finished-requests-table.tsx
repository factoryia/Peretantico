"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Request } from "../types";
import { Receipt } from "lucide-react";

interface FinishedRequestsTableProps {
  requests: Request[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function FinishedRequestsTable({
  requests,
  selectedIds,
  onSelectionChange,
}: FinishedRequestsTableProps) {
  const isAllSelected =
    requests.length > 0 && selectedIds.length === requests.length;

  const toggleAll = () => {
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(requests.map((r) => r.id));
    }
  };

  const toggleOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const getServiceTitle = (type: string | undefined) => {
    switch (type) {
      case "node--civil_registry_request":
        return "Solicitud Registro Civil";
      case "node--death_certificate_request":
        return "Partida de Defunción";
      case "node--marriage_certificate_request":
        return "Solicitud Partida Matrimonio";
      case "node--request_medication":
        return "Solicitud de Medicamentos";
      case "node--water_sample_fridge":
        return "Cert. Entrega Agua";
      case "node--property_certification":
        return "Cert. Propiedad";
      case "node--medical_bills":
        return "Solicitud Recibo Médico";
      case "node--property_unbundling_request":
        return "Desenglobe de predio";
      default:
        return "Solicitud";
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
        <Table className="w-full min-w-[1000px]">
          <TableHeader className="bg-gray-50/50">
            <TableRow className="hover:bg-transparent border-b border-gray-100">
              <TableHead className="w-[50px] text-center py-4">
                <div className="flex items-center justify-center">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </div>
              </TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 py-4 px-6">
                ID Solicitud
              </TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 py-4 px-6">
                Fecha
              </TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 py-4 px-6">
                Repartidor
              </TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 py-4 px-6">
                Cliente
              </TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 py-4 px-6">
                Tipo de Servicio
              </TableHead>
              <TableHead className="text-center font-bold text-[11px] uppercase tracking-wider text-slate-500 py-4 px-6">
                Estado
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-16 text-muted-foreground italic bg-slate-50/30"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Receipt className="h-8 w-8 text-slate-200" />
                    <span>
                      No se encontraron solicitudes finalizadas para este
                      repartidor.
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => {
                const isSelected = selectedIds.includes(request.id);
                return (
                  <TableRow
                    key={request.id}
                    className={`hover:bg-blue-50/30 transition-colors border-b border-gray-50 even:bg-slate-50/30 ${
                      isSelected ? "bg-blue-50/70 hover:bg-blue-50/80" : ""
                    }`}
                  >
                    <TableCell className="text-center py-4">
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleOne(request.id)}
                          aria-label={`Select ${request.applicationNumber}`}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-gray-900 py-4 px-6 text-[13px]">
                      {request.applicationNumber}
                    </TableCell>
                    <TableCell className="text-slate-500 font-medium py-4 px-6 text-sm">
                      {request.created
                        ? format(
                            new Date(request.created),
                            "dd/MM/yyyy HH:mm",
                            {
                              locale: es,
                            }
                          )
                        : "N/A"}
                    </TableCell>
                    <TableCell className="text-slate-600 font-semibold py-4 px-6 text-sm">
                      {request.distributor?.title || "Sin repartidor"}
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="flex flex-col">
                        {request.applicant?.fullName &&
                        request.applicant.fullName !== "Unknown" ? (
                          <span className="font-bold text-gray-900 text-[13px]">
                            {request.applicant.fullName}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-xs font-medium">
                            Sin nombre
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500 font-medium py-4 px-6 text-sm">
                      {getServiceTitle(request.infoServiceType)}
                    </TableCell>
                    <TableCell className="text-center py-4 px-6">
                      <Badge
                        variant="outline"
                        className="rounded-full shadow-none font-bold text-[10px] uppercase tracking-wider bg-green-100 text-green-700 border-none px-3"
                      >
                        {request.serviceStatus?.name || "Finalizado"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
