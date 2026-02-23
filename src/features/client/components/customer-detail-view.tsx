"use client";

import { useQuery } from "@tanstack/react-query";
import { User, Mail, FileText, BadgeCheck } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Customer } from "../types";
import {
  fetchDocumentTypeTaxonomy,
  getNameFromId,
  fetchProfileById,
} from "../utils/customer";
import { DOCUMENT_TYPE_TAXONOMY_KEY } from "../constants";
import { DataPoint } from "@/features/home/components/data-point";
import { FaWhatsapp } from "react-icons/fa";
import { API_BASE_URL } from "@/features/auth/constants";

interface CustomerDetailViewProps {
  customer: Customer;
  onClose: () => void;
}

export function CustomerDetailView({
  customer,
  onClose,
}: CustomerDetailViewProps) {
  const { data: documentTypeOptions = [] } = useQuery({
    queryKey: [DOCUMENT_TYPE_TAXONOMY_KEY],
    queryFn: fetchDocumentTypeTaxonomy,
  });

  const { data: profileData } = useQuery({
    queryKey: ["profile-by-id", customer.id],
    queryFn: () => fetchProfileById(customer.id),
    enabled: !!customer.id,
  });

  const getDocTypeName = (id: string) => {
    return getNameFromId(id, documentTypeOptions) || id || "No especificado";
  };

  const getInitials = (name: string) => {
    return (
      name
        ?.split(" ")
        .map((word) => word.charAt(0))
        .join("")
        .toUpperCase()
        .slice(0, 2) || "CL"
    );
  };

  const formatValue = (
    value: string | null | undefined,
    fallback: string = "No proporcionado"
  ) => {
    if (!value || value.trim() === "")
      return (
        <span className="text-slate-400 italic font-normal">{fallback}</span>
      );
    return value;
  };

  return (
    <div className="flex flex-col animate-in fade-in duration-500 bg-white">
      {/* Header */}
      <div className="flex items-center gap-4 p-6 border-b bg-slate-50/50">
        <Avatar className="h-16 w-16 border-2 border-white shadow-sm">
          <AvatarFallback className="bg-linear-to-br from-blue-600 to-indigo-700 text-white text-xl font-bold">
            {getInitials(customer.fullName)}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-gray-900">
            {customer.fullName || "Sin nombre"}
          </h2>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 text-[10px] uppercase font-bold py-0 h-5"
            >
              <BadgeCheck className="w-3 h-3 mr-1" /> Cliente Activo
            </Badge>
          </div>
        </div>
      </div>

      {/* Content in single column */}
      <div className="p-6">
        <div className="text-[#6B7280] text-[12.8px] uppercase font-semibold flex items-center gap-2.5 pb-6">
          <User className="size-5 text-blue-600" />
          Datos del Cliente
        </div>

        <DataPoint
          label="Nombre Completo"
          value={formatValue(customer.fullName)}
        />

        <div className="grid grid-cols-2 gap-4">
          <DataPoint
            label="Tipo de Documento"
            value={formatValue(getDocTypeName(customer.documentType))}
          />
          <DataPoint
            label="Número de Documento"
            value={formatValue(customer.documentNumber)}
          />
        </div>

        <DataPoint
          label="Teléfono / WhatsApp"
          value={
            customer.phoneNumber ? (
              <span className="flex items-center gap-2">
                <FaWhatsapp className="text-green-600" /> {customer.phoneNumber}
              </span>
            ) : (
              formatValue(null, "Sin registro")
            )
          }
        />

        <DataPoint
          label="Correo Electrónico"
          value={
            customer.email ? (
              <span className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" /> {customer.email}
              </span>
            ) : (
              formatValue(null, "Sin registro")
            )
          }
        />

        <div className="grid grid-cols-2 gap-4">
          <DataPoint
            label="Departamento"
            value={formatValue(customer.department)}
          />
          <DataPoint
            label="Municipio"
            value={formatValue(customer.municipality)}
          />
        </div>

        <DataPoint
          label="Dirección de Residencia"
          value={formatValue(customer.address, "Sin dirección")}
          noBorder
        />

        {((profileData?.attachments && profileData.attachments.length > 0) ||
          (customer.attachments && customer.attachments.length > 0)) && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-[#6B7280] text-[12.8px] uppercase font-semibold flex items-center gap-2.5 mb-4">
              <FileText className="size-5 text-blue-600" />
              Documentos Adjuntos
            </div>
            <div className="space-y-2">
              {(profileData?.attachments ?? customer.attachments ?? []).map(
                (att: any) => {
                  const url =
                    typeof att.url === "string" && att.url.startsWith("http")
                      ? att.url
                      : `${API_BASE_URL}${att.url ?? ""}`;
                  return (
                    <div
                      key={att.id}
                      className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <FileText className="w-5 h-5 text-blue-600 mr-3" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {att.fileName || "Documento"}
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">
                          {att.mimeType || "Archivo"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 font-bold text-xs uppercase"
                        onClick={() => {
                          if (url) window.open(url, "_blank");
                        }}
                      >
                        Ver
                      </Button>
                      {/* Solo ver en detalles; eliminar se hace en edición */}
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end p-6 border-t bg-slate-50/30">
        <Button
          onClick={onClose}
          className="bg-slate-900 hover:bg-slate-800 px-8 text-white font-bold text-xs uppercase tracking-widest transition-all"
        >
          Cerrar Detalle
        </Button>
      </div>
    </div>
  );
}
