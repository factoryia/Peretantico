import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  User, 
  Truck, 
  Package, 
  FileText,
  FileCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Request } from "../types/request";
import api from "@/api";

// Interfaces para los tipos de entidades
interface ProfileInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  documentNumber: string;
  documentType: string;
  birthDate: string;
  gender: string;
  address: string;
}

interface DistributorInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  documentNumber: string;
  documentType: string;
  status: string;
}

interface TaxonomyInfo {
  id: string;
  name: string;
  description: string;
}

interface ServiceInfo {
  id: string;
  name: string;
  code: string;
  value: number;
  priorityValue: number;
}

interface RequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: Request | null;
}

export function RequestDetailModal({
  isOpen,
  onClose,
  request,
}: RequestDetailModalProps) {
  const [applicantInfo, setApplicantInfo] = useState<ProfileInfo | null>(null);
  const [distributorInfo, setDistributorInfo] = useState<DistributorInfo | null>(null);
  const [subserviceInfo, setSubserviceInfo] = useState<TaxonomyInfo | null>(null);
  const [applicationStatusInfo, setApplicationStatusInfo] = useState<TaxonomyInfo | null>(null);
  const [serviceStatusInfo, setServiceStatusInfo] = useState<TaxonomyInfo | null>(null);
  const [paymentStatusInfo, setPaymentStatusInfo] = useState<TaxonomyInfo | null>(null);
  const [usedChannelInfo, setUsedChannelInfo] = useState<TaxonomyInfo | null>(null);
  const [infoServiceInfo, setInfoServiceInfo] = useState<ServiceInfo | null>(null);
  const [loading, setLoading] = useState(false);

  // Función para obtener información de un perfil
  const fetchProfileInfo = async (profileId: string) => {
    try {
      const response = await api.get(`/api/node/profile/${profileId}?include=field_type_document,field_gender`);
      const profile = response.data.data;
      
      // Obtener información de las taxonomías relacionadas
      let documentType = "";
      let gender = "";
      
      if (response.data.included) {
        const documentTypeEntity = response.data.included.find(
          (item: any) => item.type === "taxonomy_term--document_type"
        );
        if (documentTypeEntity) {
          documentType = documentTypeEntity.attributes.name;
        }
        
        const genderEntity = response.data.included.find(
          (item: any) => item.type === "taxonomy_term--gender"
        );
        if (genderEntity) {
          gender = genderEntity.attributes.name;
        }
      }
      
      return {
        id: profile.id,
        name: profile.attributes.field_full_name || profile.attributes.title || "",
        email: profile.attributes.field_mail || profile.attributes.field_email || "",
        phone: profile.attributes.field_phone_number || profile.attributes.field_phone || "",
        documentNumber: profile.attributes.field_document_number || "",
        documentType,
        birthDate: profile.attributes.field_birth_date || "",
        gender,
        address: profile.attributes.field_address || ""
      };
    } catch (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
  };

  // Función para obtener información de un distribuidor
  const fetchDistributorInfo = async (distributorId: string) => {
    try {
      const response = await api.get(`/api/node/distributor/${distributorId}?include=field_type_document`);
      const distributor = response.data.data;
      
      let documentType = "";
      if (response.data.included) {
        const documentTypeEntity = response.data.included.find(
          (item: any) => item.type === "taxonomy_term--document_type"
        );
        if (documentTypeEntity) {
          documentType = documentTypeEntity.attributes.name;
        }
      }
      
      return {
        id: distributor.id,
        name: distributor.attributes.title || distributor.attributes.name || "",
        email: distributor.attributes.field_mail || distributor.attributes.field_email || "",
        phone: distributor.attributes.field_phone || distributor.attributes.field_phone_number || "",
        documentNumber: distributor.attributes.field_document_number || "",
        documentType,
        status: distributor.attributes.status ? "Activo" : "Inactivo"
      };
    } catch (error) {
      console.error("Error fetching distributor:", error);
      return null;
    }
  };

  // Función para obtener información de una taxonomía
  const fetchTaxonomyInfo = async (taxonomyId: string, taxonomyType: string) => {
    try {
      const response = await api.get(`/api/taxonomy_term/${taxonomyType}/${taxonomyId}`);
      const taxonomy = response.data.data;
      
      return {
        id: taxonomy.id,
        name: taxonomy.attributes.name || taxonomy.attributes.title || "",
        description: taxonomy.attributes.description || ""
      };
    } catch (error) {
      console.error(`Error fetching taxonomy ${taxonomyType}:`, error);
      return null;
    }
  };

  // Función para obtener información del servicio
  const fetchServiceInfo = async (serviceId: string) => {
    try {
      const response = await api.get(`/api/node/pharmacy_claims/${serviceId}`);
      const service = response.data.data;
      
      return {
        id: service.id,
        name: service.attributes.title || service.attributes.name || "",
        code: service.attributes.field_code || "",
        value: service.attributes.field_value || 0,
        priorityValue: service.attributes.field_priority_value || 0
      };
    } catch (error) {
      console.error("Error fetching service info:", error);
      return null;
    }
  };

  // Cargar toda la información cuando se abre el modal
  useEffect(() => {
    if (!isOpen || !request) return;

    const loadAllInfo = async () => {
      setLoading(true);
      
      try {
        // Obtener información del solicitante
        if (request.relationships?.field_applicant?.data?.id) {
          const applicant = await fetchProfileInfo(request.relationships.field_applicant.data.id);
          setApplicantInfo(applicant);
        }
        
        // Obtener información del distribuidor
        if (request.relationships?.field_distributor_data?.data?.id) {
          const distributor = await fetchDistributorInfo(request.relationships.field_distributor_data.data.id);
          setDistributorInfo(distributor);
        }
        
        // Obtener información de las taxonomías
        if (request.relationships?.field_subservice?.data?.id) {
          const subservice = await fetchTaxonomyInfo(
            request.relationships.field_subservice.data.id,
            "category"
          );
          setSubserviceInfo(subservice);
        }
        
        if (request.relationships?.field_application_statuses?.data?.id) {
          const status = await fetchTaxonomyInfo(
            request.relationships.field_application_statuses.data.id,
            "application_statuses"
          );
          setApplicationStatusInfo(status);
        }
        
        if (request.relationships?.field_service_status?.data?.id) {
          const serviceStatus = await fetchTaxonomyInfo(
            request.relationships.field_service_status.data.id,
            "application_statuses"
          );
          setServiceStatusInfo(serviceStatus);
        }
        
        if (request.relationships?.field_payment_status?.data?.id) {
          const paymentStatus = await fetchTaxonomyInfo(
            request.relationships.field_payment_status.data.id,
            "payment_status"
          );
          setPaymentStatusInfo(paymentStatus);
        }
        
        if (request.relationships?.field_used_channel?.data?.id) {
          const usedChannel = await fetchTaxonomyInfo(
            request.relationships.field_used_channel.data.id,
            "used_channel"
          );
          setUsedChannelInfo(usedChannel);
        }
        
        // Obtener información del servicio
        if (request.relationships?.field_info_service?.data?.id) {
          const service = await fetchServiceInfo(request.relationships.field_info_service.data.id);
          setInfoServiceInfo(service);
        }
        
      } catch (error) {
        console.error("Error loading request details:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAllInfo();
  }, [isOpen, request]);

  if (!request) return null;



  // Función helper para mostrar campo o mensaje de "Sin datos"
  const showFieldOrEmpty = (value: string | number | undefined, fieldName: string = "Sin datos") => {
    if (value === undefined || value === null || value === "") {
      return fieldName;
    }
    return String(value);
  };

  // Función helper para mostrar campo con mejor formato
  const showFieldOrDash = (value: string | number | undefined) => {
    if (value === undefined || value === null || value === "") {
      return "—";
    }
    return String(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return "";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };



  // Verificar que request tenga los datos necesarios
  if (!request || !request.attributes || !request.relationships) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[700px] p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold text-red-600">
                Error al cargar la solicitud
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="px-6 py-4">
            <p className="text-red-600">No se pudo cargar la información de la solicitud.</p>
            <p className="text-sm text-gray-600 mt-2">
              Los datos de la solicitud no están disponibles o son inválidos.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1000px] p-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <FileText className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  Detalle de Solicitud
                </DialogTitle>
                <DialogDescription>
                  {loading ? "Cargando información..." : "Información completa de la solicitud seleccionada"}
                </DialogDescription>
              </div>
            </div>
            {loading && (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">Cargando...</span>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-6">
          {/* Información Principal */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
              <FileText className="h-5 w-5" />
              Información Principal
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">
                  Número de Solicitud
                </Label>
                <p className="text-base font-medium bg-gray-50 p-2 rounded border">
                  {showFieldOrEmpty(request.attributes.field_application_number)}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Título</Label>
                <p className="text-base font-medium bg-gray-50 p-2 rounded border">
                  {showFieldOrEmpty(request.attributes.title)}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Fecha de Recepción</Label>
                <p className="text-base bg-gray-50 p-2 rounded border">
                  {showFieldOrEmpty(formatDate(request.attributes.field_entry_date || ""))}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Estado de Solicitud</Label>
                <div className="mt-1">
                  <Badge variant="outline" className="text-sm">
                    {showFieldOrEmpty(applicationStatusInfo?.name)}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Calificación</Label>
                <p className="text-base font-medium bg-gray-50 p-2 rounded border">
                  {showFieldOrEmpty(request.attributes.field_application_score ? `${String(request.attributes.field_application_score)}/5` : undefined)}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Valor Priorizado</Label>
                <p className="text-base font-medium p-2 rounded border ">
                  {request.attributes.field_prioritized_value ? formatCurrency(request.attributes.field_prioritized_value) : "Sin datos"}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Tiempo Priorizado (horas)</Label>
                <p className={`text-base font-medium p-2 rounded border `}>
                  {request.attributes.field_estimated_prioritized_hour ? `${String(request.attributes.field_estimated_prioritized_hour)}h` : "Sin datos"}
                </p>
              </div>
            </div>
          </div>

          {/* Datos del Solicitante */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
              <User className="h-5 w-5" />
              Datos del Solicitante
            </h3>
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">Nombre Solicitante</Label>
                  <p className="text-base font-medium">{showFieldOrEmpty(applicantInfo?.name)}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">Tipo de Documento</Label>
                  <p className="text-base bg-white p-2 rounded border">
                    {showFieldOrDash(applicantInfo?.documentType)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">Número de Documento</Label>
                  <p className="text-base bg-white p-2 rounded border">
                    {showFieldOrEmpty(applicantInfo?.documentNumber)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">Fecha de Nacimiento</Label>
                  <p className="text-base bg-white p-2 rounded border">
                    {showFieldOrDash(applicantInfo?.birthDate)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">Tipo de Sexo</Label>
                  <p className="text-base bg-white p-2 rounded border">
                    {showFieldOrEmpty(applicantInfo?.gender)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">Teléfono</Label>
                  <p className="text-base bg-white p-2 rounded border">
                    {showFieldOrEmpty(applicantInfo?.phone)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">Correo Electrónico</Label>
                  <p className="text-base bg-white p-2 rounded border">
                    {showFieldOrEmpty(applicantInfo?.email)}
                  </p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-sm font-medium text-gray-600">Dirección</Label>
                  <p className="text-base bg-white p-2 rounded border">
                    {showFieldOrEmpty(applicantInfo?.address)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Detalle del Servicio */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
              <Package className="h-5 w-5" />
              Detalle del Servicio
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Subservicio</Label>
                <p className="text-base font-medium bg-gray-50 p-2 rounded border">
                  {showFieldOrEmpty(subserviceInfo?.name)}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Valor del Servicio</Label>
                <p className="text-base font-medium bg-gray-50 p-2 rounded border">
                  {showFieldOrEmpty(formatCurrency(request.attributes.field_service_value || 0))}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Valor Priorizado</Label>
                <p className={`text-base font-medium p-2 rounded border `}>
                  {request.attributes.field_prioritized_value ? formatCurrency(request.attributes.field_prioritized_value) : "Sin datos"}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Estado de Pago</Label>
                <div className="mt-1">
                  <Badge variant="outline" className="text-sm">
                    {showFieldOrEmpty(paymentStatusInfo?.name)}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Canal Usado</Label>
                <div className="mt-1">
                  <Badge variant="outline" className="text-sm">
                    {showFieldOrEmpty(usedChannelInfo?.name)}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Tiempo Estimado (horas)</Label>
                <p className="text-base font-medium bg-gray-50 p-2 rounded border">
                  {showFieldOrEmpty(request.attributes.field_estimated_application_hour ? `${String(request.attributes.field_estimated_application_hour)}h` : undefined)}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Tiempo Priorizado (horas)</Label>
                <p className={`text-base font-medium p-2 rounded border `}>
                  {request.attributes.field_estimated_prioritized_hour ? `${String(request.attributes.field_estimated_prioritized_hour)}h` : "Sin datos"}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Costos Logísticos</Label>
                <p className="text-base font-medium bg-gray-50 p-2 rounded border">
                  {showFieldOrEmpty(formatCurrency(request.attributes.field_logistics_costs || 0))}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Estado del Servicio</Label>
                <div className="mt-1">
                  <Badge variant="outline" className="text-sm">
                    {showFieldOrEmpty(serviceStatusInfo?.name)}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Recurrente</Label>
                <div className="mt-1">
                  <Badge variant="outline" className="text-sm">
                    {request.attributes.field_is_recurring ? "Sí" : "No"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Información Adicional del Servicio */}
          {infoServiceInfo && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                <FileCheck className="h-5 w-5" />
                Información Adicional del Servicio
              </h3>
              <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">Nombre del Servicio</Label>
                    <p className="text-base bg-white p-2 rounded border">
                      {showFieldOrEmpty(infoServiceInfo.name)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">Código de Servicio</Label>
                    <p className="text-base bg-white p-2 rounded border">
                      {showFieldOrEmpty(infoServiceInfo.code)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">Valor del Servicio</Label>
                    <p className="text-base bg-white p-2 rounded border">
                      {showFieldOrEmpty(formatCurrency(infoServiceInfo.value))}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">Valor Priorizado</Label>
                    <p className="text-base bg-white p-2 rounded border">
                      {showFieldOrEmpty(formatCurrency(infoServiceInfo.priorityValue))}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}



          {/* Repartidor Asignado */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
              <Truck className="h-5 w-5" />
              Repartidor Asignado
            </h3>
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">Nombre Completo</Label>
                  <p className="text-base font-medium">{showFieldOrEmpty(distributorInfo?.name)}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">Tipo de Documento</Label>
                  <p className="text-base bg-white p-2 rounded border">
                    {showFieldOrDash(distributorInfo?.documentType)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">Número de Documento</Label>
                  <p className="text-base bg-white p-2 rounded border">
                    {showFieldOrEmpty(distributorInfo?.documentNumber)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">Teléfono</Label>
                  <p className="text-base bg-white p-2 rounded border">
                    {showFieldOrEmpty(distributorInfo?.phone)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">Correo Electrónico</Label>
                  <p className="text-base bg-white p-2 rounded border">
                    {showFieldOrEmpty(distributorInfo?.email)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">Estado Actual</Label>
                  <p className="text-base bg-white p-2 rounded border">
                    {showFieldOrEmpty(distributorInfo?.status)}
                  </p>
                </div>
              </div>
            </div>
          </div>



          {/* Fechas del Sistema */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
              <Calendar className="h-5 w-5" />
              Fechas del Sistema
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Creado</Label>
                <p className="text-base bg-gray-50 p-2 rounded border">
                  {showFieldOrEmpty(formatDate(request.attributes.created || ""))}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Última Modificación</Label>
                <p className="text-base bg-gray-50 p-2 rounded border">
                  {showFieldOrEmpty(formatDate(request.attributes.changed || ""))}
                </p>
              </div>
            </div>
          </div>

          {/* Información del Sistema */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Información del Sistema</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">
                  Estado del Sistema
                </Label>
                <p className="text-base bg-gray-50 p-2 rounded border">
                  {request.attributes.status ? "Activo" : "Inactivo"}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">
                  ID de la Solicitud
                </Label>
                <p className=" bg-gray-50 p-2 rounded border font-mono text-sm">
                  {request.id}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end px-6 py-4 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose} className="hover:bg-gray-100">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
