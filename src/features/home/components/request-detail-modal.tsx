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
  eps?: string;
  deliveryAddress?: string;
  authorizationNumber?: string;
  claimLocation?: string;
  ipsName?: string;
  ipsAddress?: string;
  isRecurring?: boolean;
  priority?: string;
  path?: string;
  relativeLocation?: string;
}

interface SubserviceSchema {
  bundle: string;
  label: string;
  description: string;
  schema: Record<string, {
    label: string;
    description: string | null;
    required: boolean;
    multiple: boolean;
    type: string;
  }>;
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
  const [subserviceSchema, setSubserviceSchema] = useState<SubserviceSchema | null>(null);
  const [subserviceFields, setSubserviceFields] = useState<any>({});
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

  const fetchServiceInfo = async (serviceId: string) => {
    try {
      // Usar el endpoint correcto con el target_id
      const response = await api.get(`/node/${serviceId}?_format=json`);
      const service = response.data;
      
      const serviceInfo = {
        id: service.uuid?.[0]?.value || serviceId,
        name: service.title?.[0]?.value || "",
        code: service.field_med_order_number?.[0]?.value || "",
        eps: service.field_eps?.[0]?.value || "",
        deliveryAddress: service.field_delivery_address?.[0]?.value || "",
        authorizationNumber: service.field_authorization_number?.[0]?.value || "",
        claimLocation: service.field_claim_location?.[0]?.value || "",
        ipsName: service.field_ips_name?.[0]?.value || "",
        ipsAddress: service.field_ips_address?.[0]?.value || "",
        isRecurring: service.field_is_recurring?.[0]?.value || false,
        priority: service.field_priority?.[0]?.value || "",
        path: service.field_path?.[0]?.uri || "",
        relativeLocation: service.field_relative_location?.[0]?.target_id ? String(service.field_relative_location[0].target_id) : ""
      };
      
      return serviceInfo;
    } catch (error) {
      console.error("Error fetching service info:", error);
      return null;
    }
  };

  // Función para obtener el schema del subservicio
  const fetchSubserviceSchema = async (subserviceType: string) => {
    try {
      const response = await api.get(`/api/node-type-schema/${subserviceType}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching subservice schema for ${subserviceType}:`, error);
      return null;
    }
  };

  // Función para obtener los campos específicos del subservicio
  const fetchSubserviceFields = async (subserviceId: string, subserviceType: string) => {
    try {
      const response = await api.get(`/node/${subserviceId}?_format=json`);
      const subservice = response.data;
      
      // Devolver todos los campos del subservicio
      return subservice;
    } catch (error) {
      console.error(`Error fetching subservice fields for ${subserviceType}:`, error);
      return {};
    }
  };

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
        
        // Obtener información del servicio o subservicio
        if (request.relationships?.field_info_service?.data?.meta?.drupal_internal__target_id) {
          const serviceId = String(request.relationships.field_info_service.data.meta.drupal_internal__target_id);
          const serviceType = request.relationships.field_info_service.data.type;
          
          // Si es un subservicio (no un servicio médico), no lo procesamos aquí
          if (serviceType && serviceType.includes('property_certification')) {
            // Es un subservicio, no un servicio médico
            setInfoServiceInfo(null);
          } else {
            // Es un servicio médico real
            const service = await fetchServiceInfo(serviceId);
            setInfoServiceInfo(service);
          }
        }


        
      } catch (error) {
        console.error("Error loading request details:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAllInfo();
  }, [isOpen, request]);

  // useEffect separado para obtener el schema del subservicio
  useEffect(() => {
    const loadSubserviceSchema = async () => {
      try {
        console.log("🔍 Iniciando carga del schema del subservicio...");
        
        let subserviceData = null;
        let subserviceId = null;
        
        // Intentar obtener desde field_info_service (que es el nodo real del subservicio)
        if (request?.relationships?.field_info_service?.data?.meta?.drupal_internal__target_id) {
          const serviceId = String(request.relationships.field_info_service.data.meta.drupal_internal__target_id);
          const serviceType = request.relationships.field_info_service.data.type;
          
          console.log("🔍 Service ID desde field_info_service:", serviceId);
          console.log("🔍 Service Type:", serviceType);
          
          // Solo procesar si es un subservicio (no un servicio médico)
          if (serviceType && serviceType.includes('property_certification')) {
            console.log("✅ Es un subservicio property_certification, obteniendo datos...");
            subserviceData = await fetchSubserviceFields(serviceId, '');
            subserviceId = serviceId;
            console.log("📋 Datos del subservicio desde field_info_service:", subserviceData);
          } else {
            console.log("❌ No es un subservicio property_certification");
          }
        }
        
        if (subserviceData && subserviceId) {
          // Buscar el tipo en los datos del subservicio
          const subserviceType = subserviceData.type?.[0]?.target_id;
          console.log("🎯 Tipo del subservicio encontrado:", subserviceType);
          
          if (subserviceType) {
            // Ahora obtener el schema usando el tipo correcto
            console.log("📚 Obteniendo schema para:", subserviceType);
            const schema = await fetchSubserviceSchema(subserviceType);
            console.log("📚 Schema obtenido:", schema);
            
            if (schema) {
              setSubserviceSchema(schema);
              setSubserviceFields(subserviceData);
              console.log("✅ Schema y campos establecidos correctamente");
            }
          }
        } else {
          console.log("❌ No se pudieron obtener datos del subservicio");
        }
      } catch (error) {
        console.error("Error loading subservice schema:", error);
      }
    };

    // Solo ejecutar si tenemos field_info_service y es un subservicio
    const hasInfoService = request?.relationships?.field_info_service?.data?.meta?.drupal_internal__target_id;
    const isPropertyCertification = request?.relationships?.field_info_service?.data?.type?.includes('property_certification');
    
    console.log("🔍 Condiciones para ejecutar:", { hasInfoService, isPropertyCertification });
    
    if (hasInfoService && isPropertyCertification) {
      console.log("✅ Ejecutando loadSubserviceSchema");
      loadSubserviceSchema();
    } else {
      console.log("❌ No se cumplen las condiciones para ejecutar");
    }
  }, [request]);

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

          {/* Información del Servicio Médico - Solo si existe y es realmente un servicio médico */}
          {infoServiceInfo && infoServiceInfo.name && infoServiceInfo.eps && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                <FileCheck className="h-5 w-5" />
                Información del Servicio Médico
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
                    <Label className="text-sm font-medium text-gray-600">Número de Orden Médica</Label>
                    <p className="text-base bg-white p-2 rounded border">
                      {showFieldOrEmpty(infoServiceInfo.code)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">Número de Autorización</Label>
                    <p className="text-base bg-white p-2 rounded border">
                      {showFieldOrEmpty(infoServiceInfo.authorizationNumber)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">EPS</Label>
                    <p className="text-base bg-white p-2 rounded border">
                      {showFieldOrEmpty(infoServiceInfo.eps)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">Dirección de Entrega</Label>
                    <p className="text-base bg-white p-2 rounded border">
                      {showFieldOrEmpty(infoServiceInfo.deliveryAddress)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">Ubicación del Reclamo</Label>
                    <p className="text-base bg-white p-2 rounded border">
                      {showFieldOrEmpty(infoServiceInfo.claimLocation)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">Nombre de la IPS</Label>
                    <p className="text-base bg-white p-2 rounded border">
                      {showFieldOrEmpty(infoServiceInfo.ipsName)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">Dirección de la IPS</Label>
                    <p className="text-base bg-white p-2 rounded border">
                      {showFieldOrEmpty(infoServiceInfo.ipsAddress)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">Es Recurrente</Label>
                    <div className="mt-1">
                      <Badge variant="outline" className="text-sm">
                        {infoServiceInfo.isRecurring ? "Sí" : "No"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">Prioridad</Label>
                    <p className="text-base bg-white p-2 rounded border">
                      {showFieldOrEmpty(infoServiceInfo.priority)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">Ubicación Relativa</Label>
                    <p className="text-base bg-white p-2 rounded border">
                      {showFieldOrEmpty(infoServiceInfo.relativeLocation)}
                    </p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-medium text-gray-600">Archivo Adjunto</Label>
                    <p className="text-base bg-white p-2 rounded border">
                      {infoServiceInfo.path ? (
                        <a 
                          href={infoServiceInfo.path} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          Ver archivo
                        </a>
                      ) : (
                        "Sin archivo"
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Campos Específicos del Subservicio */}
          {subserviceSchema && subserviceFields && (() => {
            // Contar solo los campos que empiecen con "field_" y tengan valores
            const fieldCount = Object.entries(subserviceFields).filter(([fieldKey, fieldValues]) => {
              return fieldKey.startsWith('field_') && fieldValues && Array.isArray(fieldValues) && fieldValues.length > 0;
            }).length;
            
            return fieldCount > 0;
          })() && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                <Package className="h-5 w-5" />
                Campos Específicos del Subservicio: {subserviceSchema.label}
              </h3>
              <div className="p-4 bg-gray-50 rounded-lg border">
                <p className="text-sm text-gray-600 mb-4">
                  {subserviceSchema.description}
                </p>
                
                {/* Información General del Subservicio */}
                <div className="mb-6 p-4 bg-white rounded-lg border">
                  <h4 className="text-md font-medium text-gray-700 mb-3">Información General</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-600">Título</Label>
                      <p className="text-base bg-gray-50 p-2 rounded border">
                        {subserviceFields.title?.[0]?.value || "Sin título"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-600">Estado</Label>
                      <div className="mt-1">
                        <Badge variant="outline" className="text-sm">
                          {subserviceFields.status?.[0]?.value ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-600">Creado</Label>
                      <p className="text-base bg-gray-50 p-2 rounded border">
                        {subserviceFields.created?.[0]?.value ? formatDate(subserviceFields.created[0].value) : "Sin fecha"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-600">Última Modificación</Label>
                      <p className="text-base bg-gray-50 p-2 rounded border">
                        {subserviceFields.changed?.[0]?.value ? formatDate(subserviceFields.changed[0].value) : "Sin fecha"}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Campos Específicos del Schema */}
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-3">Campos Específicos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(subserviceFields).map(([fieldKey, fieldValues]: [string, any]) => {
                      // Solo mostrar campos que empiecen con "field_" y tengan valores
                      if (!fieldKey.startsWith('field_') || !fieldValues || !Array.isArray(fieldValues) || fieldValues.length === 0) return null;
                      
                      const fieldSchema = subserviceSchema.schema[fieldKey];
                      const fieldLabel = fieldSchema?.label || fieldKey.replace('field_', '').replace(/_/g, ' ');
                      
                      return (
                        <div key={fieldKey} className="space-y-2">
                          <Label className="text-sm font-medium text-gray-600">
                            {fieldLabel}
                            {fieldSchema?.required && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          <div className="bg-white p-2 rounded border">
                            {fieldValues.map((fieldValue: any, index: number) => {
                              if (fieldValue.uri) {
                                // Campo de tipo archivo/enlace
                                return (
                                  <div key={index} className="mb-2">
                                    <a 
                                      href={fieldValue.uri} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 underline text-sm"
                                    >
                                      {fieldValue.title || 'Ver archivo'}
                                    </a>
                                  </div>
                                );
                              } else if (typeof fieldValue.value === 'boolean') {
                                // Campo booleano
                                return (
                                  <Badge key={index} variant="outline" className="text-sm">
                                    {fieldValue.value ? "Sí" : "No"}
                                  </Badge>
                                );
                              } else if (fieldValue.value) {
                                // Campo de texto/número
                                return (
                                  <p key={index} className="text-base">
                                    {String(fieldValue.value)}
                                  </p>
                                );
                              }
                              return null;
                            })}
                          </div>
                          {fieldSchema?.description && (
                            <p className="text-xs text-gray-500 italic">
                              {fieldSchema.description}
                            </p>
                          )}
                        </div>
                      );
                    })}
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
