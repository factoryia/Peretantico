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
import { useEffect, useState, useCallback } from "react";
import type { Request } from "@/features/home/types/request";
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
  schema: Record<
    string,
    {
      label: string;
      description: string | null;
      required: boolean;
      multiple: boolean;
      type: string;
    }
  >;
}

interface RequestDetailModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  request: Request | null;
}

export function RequestDetailModal({
  isOpen,
  onOpenChange,
  request,
}: RequestDetailModalProps) {
  const [applicantInfo, setApplicantInfo] = useState<ProfileInfo | null>(null);
  const [distributorInfo, setDistributorInfo] =
    useState<DistributorInfo | null>(null);
  const [subserviceInfo, setSubserviceInfo] = useState<TaxonomyInfo | null>(
    null
  );
  const [applicationStatusInfo, setApplicationStatusInfo] =
    useState<TaxonomyInfo | null>(null);
  const [serviceStatusInfo, setServiceStatusInfo] =
    useState<TaxonomyInfo | null>(null);
  const [paymentStatusInfo, setPaymentStatusInfo] =
    useState<TaxonomyInfo | null>(null);
  const [usedChannelInfo, setUsedChannelInfo] = useState<TaxonomyInfo | null>(
    null
  );
  const [infoServiceInfo, setInfoServiceInfo] = useState<ServiceInfo | null>(
    null
  );
  const [subserviceSchema, setSubserviceSchema] =
    useState<SubserviceSchema | null>(null);
  const [subserviceFields, setSubserviceFields] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);

  // Función para obtener información de un perfil
  const fetchProfileInfo = async (profileId: string) => {
    try {
      const response = await api.get(
        `/api/node/profile/${profileId}?include=field_type_document,field_gender`
      );
      const profile = response.data.data;

      // Obtener información de las taxonomías relacionadas
      let documentType = "";
      let gender = "";

      if (response.data.included) {
        const documentTypeEntity = response.data.included.find(
          (item: Record<string, unknown>) => item.type === "taxonomy_term--document_type"
        );
        if (documentTypeEntity) {
          documentType = documentTypeEntity.attributes.name;
        }

        const genderEntity = response.data.included.find(
          (item: Record<string, unknown>) => item.type === "taxonomy_term--gender"
        );
        if (genderEntity) {
          gender = genderEntity.attributes.name;
        }
      }

      return {
        id: profile.id,
        name:
          profile.attributes.field_full_name || profile.attributes.title || "",
        email:
          profile.attributes.field_mail || profile.attributes.field_email || "",
        phone:
          profile.attributes.field_phone_number ||
          profile.attributes.field_phone ||
          "",
        documentNumber: profile.attributes.field_document_number || "",
        documentType,
        birthDate: profile.attributes.field_birth_date || "",
        gender,
        address: profile.attributes.field_address || "",
      };
    } catch {
      return null;
    }
  };

  // Función para obtener información de un distribuidor
  const fetchDistributorInfo = async (distributorId: string) => {
    try {
      const response = await api.get(
        `/api/node/distributor/${distributorId}?include=field_type_document`
      );
      const distributor = response.data.data;

      let documentType = "";
      if (response.data.included) {
        const documentTypeEntity = response.data.included.find(
          (item: Record<string, unknown>) => item.type === "taxonomy_term--document_type"
        );
        if (documentTypeEntity) {
          documentType = documentTypeEntity.attributes.name;
        }
      }

      return {
        id: distributor.id,
        name: distributor.attributes.title || distributor.attributes.name || "",
        email:
          distributor.attributes.field_mail ||
          distributor.attributes.field_email ||
          "",
        phone:
          distributor.attributes.field_phone ||
          distributor.attributes.field_phone_number ||
          "",
        documentNumber: distributor.attributes.field_document_number || "",
        documentType,
        status: distributor.attributes.status ? "Activo" : "Inactivo",
      };
    } catch {
      return null;
    }
  };

  // Función para obtener información de una taxonomía
  const fetchTaxonomyInfo = async (
    taxonomyId: string,
    taxonomyType: string
  ) => {
    try {
      const response = await api.get(
        `/api/taxonomy_term/${taxonomyType}/${taxonomyId}`
      );
      const taxonomy = response.data.data;

      return {
        id: taxonomy.id,
        name: taxonomy.attributes.name || taxonomy.attributes.title || "",
        description: taxonomy.attributes.description || "",
      };
    } catch {
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
        authorizationNumber:
          service.field_authorization_number?.[0]?.value || "",
        claimLocation: service.field_claim_location?.[0]?.value || "",
        ipsName: service.field_ips_name?.[0]?.value || "",
        ipsAddress: service.field_ips_address?.[0]?.value || "",
        isRecurring: service.field_is_recurring?.[0]?.value || false,
        priority: service.field_priority?.[0]?.value || "",
        path: service.field_path?.[0]?.uri || "",
        relativeLocation: service.field_relative_location?.[0]?.target_id
          ? String(service.field_relative_location[0].target_id)
          : "",
      };

      return serviceInfo;
    } catch {
      return null;
    }
  };

  // Función para mapear nombres de subservicios a tipos (igual que en new-request-modal)
  const mapSubserviceNameToType = useCallback(
    (subserviceName: string): string | null => {
      const mapping: Record<string, string> = {
        // Certificaciones y Propiedades
        "Certificación de propiedad": "property_certification",

        // Farmacia y Medicamentos
        "Reclamos de farmacia": "pharmacy_claims",
        "Reclamo de medicamentos": "pharmacy_claims",
        "Reclamo en una (1) o más farmacias": "pharmacy_claims",
        "Diferentes farmacias de la mesa": "pharmacy_claims",
        "Diferentes EPS la mesa": "authorizations_claims",

        // Correspondencia y Documentos
        "Radicación y sello de recibido": "document_processing",
        "Con evidencia fotográfica": "mail_delivery",

        // Transporte
        "Bogotá-La Mesa o Viceversa": "transport_service",

        // Registros Civiles y Documentos Legales
        "Solicitud registros civiles": "civil_records_request",
        "Partidas de matrimonio": "marriage_certificate",
        "Partidas de defunción": "death_certificate",
        "Copia de escrituras": "property_deed_copy",

        // Trámites Catastrales
        "Certificado de solvencia": "desenglobes_solicit",
        "Plan de estudios": "planos_solicit",
        "Solicitudes desenglobes": "desenglobes_solicit",
        "Solicitudes planes": "planos_solicit",
        "Solicitudes planos": "planos_solicit",
        "Solicitud de planos": "planos_solicit",

        // Agregar más mapeos según sea necesario
      };

      return mapping[subserviceName] || null;
    },
    []
  );

  // Función para crear schema por defecto cuando no esté disponible (igual que en new-request-modal)
  const createDefaultSchema = useCallback((subserviceType: string): SubserviceSchema => {
    const defaultSchemas: Record<string, SubserviceSchema> = {
      pharmacy_claims: {
        bundle: "pharmacy_claims",
        label: "Reclamos de Farmacia",
        description: "Información adicional para reclamos de farmacia",
        schema: {
          field_eps: {
            label: "Nombre de la EPS",
            description: "Nombre de la EPS autorizada",
            required: false,
            multiple: false,
            type: "string",
          },
          field_drugstore: {
            label: "Nombre de la Droguería",
            description: "Dirección donde se entregará el medicamento",
            required: false,
            multiple: false,
            type: "string",
          },
          field_ips_address: {
            label: "Dirección de la IPS",
            description: "Dirección de la IPS",
            required: false,
            multiple: false,
            type: "string",
          },
          field_path: {
            label: "Adjunta tu orden medica, MIPRES o autorización si es el caso",
            description: "Archivos adjuntos (jpg, jpeg, png, pdf)",
            required: true,
            multiple: true,
            type: "file",
          },
        },
      },
      authorizations_claims: {
        bundle: "authorizations_claims",
        label: "Autorizaciones EPS",
        description: "Información adicional para autorizaciones EPS",
        schema: {
          field_eps: {
            label: "Nombre de la EPS",
            description: "Nombre de la EPS",
            required: false,
            multiple: false,
            type: "string",
          },
          field_path: {
            label: "Adjunta tu historia clínica, orden médica y MIPRES si es el caso",
            description: "Archivos adjuntos (jpg, jpeg, png, pdf)",
            required: true,
            multiple: true,
            type: "file",
          },
        },
      },
      mail_delivery: {
        bundle: "mail_delivery",
        label: "Entrega de Correspondencia",
        description: "Información adicional para entrega de correspondencia por paquete",
        schema: {
          field_sender_address: {
            label: "Dirección del remitente",
            description: "Dirección completa del remitente",
            required: false,
            multiple: false,
            type: "string",
          },
          field_recipient_name: {
            label: "Nombre del destinatario",
            description: "Nombre completo de quien recibe la correspondencia",
            required: false,
            multiple: false,
            type: "string",
          },
          field_delivery_address: {
            label: "Dirección del destinatario",
            description: "Dirección completa del destinatario",
            required: false,
            multiple: false,
            type: "string",
          },
          field_package_description: {
            label: "Descripcion del paquete",
            description: "Descripcion del paquete a entregar",
            required: false,
            multiple: false,
            type: "string",
          },
          field_package_weight: {
            label: "Peso del paquete",
            description: "Peso aproximado del paquete en kilogramos",
            required: false,
            multiple: false,
            type: "string",
          },
          field_priority_value: {
            label: "Entrega urgente",
            description: "Indica si la entrega es urgente",
            required: false,
            multiple: false,
            type: "boolean",
          },
          field_files: {
            label: "Adjunte fotos del paquete",
            description: "Envíe fotografía del paquete a entregar (jpg, png, pdf)",
            required: false,
            multiple: true,
            type: "file",
          },
        },
      },
      document_processing: {
        bundle: "document_processing",
        label: "Radicación y sello de recibido",
        description: "Información adicional para entrega de correspondencia",
        schema: {
          field_recipient_name: {
            label: "Nombre completo del destinatario",
            description: "Nombre y apellido del destinatario",
            required: true,
            multiple: false,
            type: "string",
          },
          field_delivery_address: {
            label: "Dirección del destinatario",
            description: "Dirección completa del destinatario",
            required: true,
            multiple: false,
            type: "string",
          },
          field_recipient_phone: {
            label: "Teléfono de contacto del destinatario",
            description: "Número de teléfono de contacto",
            required: true,
            multiple: false,
            type: "string",
          },
          field_required_stamp: {
            label: "Requiere radicado",
            description: "Indica si el envío requiere radicado",
            required: false,
            multiple: false,
            type: "boolean",
          },
          field_files: {
            label: "Adjunte documentos",
            description: "Envíe fotografía del radicado/sello (jpg, png, pdf)",
            required: false,
            multiple: true,
            type: "file",
          },
        },
      },
      civil_records_request: {
        bundle: "civil_records_request",
        label: "Solicitud de Registros Civiles",
        description: "Información adicional para solicitud de registros civiles",
        schema: {
          field_registrant_full_name: {
            label: "Nombre(s) y apellido(s) de quien pertenece el registro",
            description: "Nombre de quien pertenece el registro",
            required: false,
            multiple: false,
            type: "string",
          },
          field_registrant_registration_co: {
            label: "Número de registro",
            description: "Número del registro civil",
            required: false,
            multiple: false,
            type: "string",
          },
          field_registry_notary_number: {
            label: "Número de la notaria",
            description: "Número de la notaria",
            required: false,
            multiple: false,
            type: "string",
          },
          field_registry_tome_number: {
            label: "Número del tomo",
            description: "Número del tomo",
            required: false,
            multiple: false,
            type: "number",
          },
          field_registry_folio_number: {
            label: "Número del folio",
            description: "Número del folio",
            required: false,
            multiple: false,
            type: "number",
          },
          field_registry_serial_number: {
            label: "Número del serial",
            description: "Número del serial",
            required: false,
            multiple: false,
            type: "number",
          },
          field_path: {
            label: "Adjunte documentos",
            description: "Adjunte copia de identidad y otros documentos (jpg, png, pdf)",
            required: false,
            multiple: true,
            type: "file",
          },
        },
      },
      marriage_certificate: {
        bundle: "marriage_certificate",
        label: "Partida de Matrimonio",
        description: "Información adicional para partida de matrimonio",
        schema: {
          field_marriage_type: {
            label: "Tipo partida de matrimonio",
            description: "Seleccione el tipo de partida de matrimonio",
            required: true,
            multiple: false,
            type: "select",
          },
          field_motive_type: {
            label: "Solicitud de divorcio o juicio de separación",
            description: "Seleccione el tipo de solicitud de divorcio o juicio de separación",
            required: true,
            multiple: false,
            type: "select",
          },
          field_path: {
            label: "Adjunte documentos",
            description: "Adjunte copia de identidad y otros documentos (jpg, png, pdf)",
            required: false,
            multiple: true,
            type: "file",
          },
        },
      },
      death_certificate: {
        bundle: "death_certificate",
        label: "Partida de Defunción",
        description: "Información adicional para partida de defunción",
        schema: {
          field_motive_type: {
            label: "Motivo de la partida de defunción",
            description: "Motivo de la partida de defunción",
            required: true,
            multiple: false,
            type: "string",
          },
          field_path: {
            label: "Adjunte documentos",
            description: "Adjunte copia de identidad y otros documentos (jpg, png, pdf)",
            required: false,
            multiple: true,
            type: "file",
          },
        },
      },
      property_deed_copy: {
        bundle: "property_deed_copy",
        label: "Copia de Escrituras",
        description: "Información adicional para copia de escrituras",
        schema: {
          field_type_property: {
            label: "Tipo de persona",
            description: "Seleccione el tipo de persona",
            required: true,
            multiple: false,
            type: "select",
          },
          field_deed_number: {
            label: "Número de escritura",
            description: "Número de la escritura pública",
            required: true,
            multiple: false,
            type: "number",
          },
          field_deed_year: {
            label: "Año de la escritura",
            description: "Año en que se otorgó la escritura",
            required: false,
            multiple: false,
            type: "date",
          },
          field_deed_city: {
            label: "Ciudad donde se otorgó la escritura",
            description: "Ciudad donde se otorgó la escritura",
            required: false,
            multiple: false,
            type: "string",
          },
          field_path: {
            label: "Adjunte documentos",
            description: "Adjunte copia de la escritura y otros documentos (jpg, png, pdf)",
            required: false,
            multiple: true,
            type: "file",
          },
        },
      },
      // Agregar más schemas según sea necesario...
    };

    return (
      defaultSchemas[subserviceType] || {
        bundle: subserviceType,
        label: `Subservicio ${subserviceType}`,
        description: `Información adicional para ${subserviceType}`,
        schema: {},
      }
    );
  }, []);

  // Función para obtener el schema del subservicio formato (usando el mismo mapeo que en new-request-modal)
  const fetchSubserviceSchema = useCallback(async (subserviceType: string) => {
    try {
      const response = await api.get(`/api/node-type-schema/${subserviceType}`);
      return response.data;
    } catch {
      // Si no encontramos el schema en el API, usar los schemas por defecto del new-request-modal
      return createDefaultSchema(subserviceType);
    }
  }, [createDefaultSchema]);

  useEffect(() => {
    if (!isOpen || !request) return;

    const loadAllInfo = async () => {
      setLoading(true);

      try {
        // Obtener información del solicitante
        if (request.relationships?.field_applicant?.data?.id) {
          const applicant = await fetchProfileInfo(
            request.relationships.field_applicant.data.id
          );
          setApplicantInfo(applicant);
        }

        // Obtener información del distribuidor
        if (request.relationships?.field_distributor_data?.data?.id) {
          const distributor = await fetchDistributorInfo(
            request.relationships.field_distributor_data.data.id
          );
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
        if (
          request.relationships?.field_info_service?.data &&
          request.relationships.field_info_service.data.meta
            ?.drupal_internal__target_id
        ) {
          const serviceId = String(
            request.relationships.field_info_service.data.meta
              .drupal_internal__target_id
          );
          const serviceType =
            request.relationships.field_info_service.data.type;

          // Si es un subservicio (no un servicio médico), no lo procesamos aquí
          if (serviceType && serviceType.includes("property_certification")) {
            // Es un subservicio, no un servicio médico
            setInfoServiceInfo(null);
          } else {
            // Es un servicio médico real
            const service = await fetchServiceInfo(serviceId);
            setInfoServiceInfo(service);
          }
        } else {
          // Si field_info_service es null, no hay servicio asociado
          setInfoServiceInfo(null);
        }
      } catch {
        // Manejar error silenciosamente
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
        // Verificar si tenemos información del subservicio en las relaciones
        const subserviceId = request?.relationships?.field_subservice?.data?.id;
        
        if (!subserviceId) {
          setSubserviceSchema(null);
          setSubserviceFields({});
          return;
        }

        // Necesitamos obtener el nombre del subservicio para mapearlo al tipo
        try {
          const subserviceResponse = await api.get(`/api/taxonomy_term/category/${subserviceId}`);
          const subserviceName = subserviceResponse.data.data.attributes?.name || "";
          
          // Mapear el nombre a tipo
          const subserviceType = mapSubserviceNameToType(subserviceName);

          if (subserviceType) {
            // Obtener el schema usando el tipo
            const schema = await fetchSubserviceSchema(subserviceType);

            if (schema) {
              setSubserviceSchema(schema);
              
              // Los campos específicos están en los atributos de la solicitud
              const requestSpecificFields = {};
              
              // Extraer campos específicos del subservicio desde request.attributes
              Object.keys(schema.schema).forEach(fieldKey => {
                if (request?.attributes && fieldKey in request.attributes) {
                  (requestSpecificFields as Record<string, unknown>)[fieldKey] = (request.attributes as Record<string, unknown>)[fieldKey];
                }
              });
              
              setSubserviceFields(requestSpecificFields);
            }
          }
        } catch (error) {
          console.warn("Error obteniendo información del subservicio:", error);
          // Limpiar el estado en caso de error
          setSubserviceSchema(null);
          setSubserviceFields({});
        }
      } catch {
        // Manejar error silenciosamente
        setSubserviceSchema(null);
        setSubserviceFields({});
      }
    };

    // Ejecutar solo si tenemos una solicitud
    if (request) {
      loadSubserviceSchema();
    } else {
      setSubserviceSchema(null);
      setSubserviceFields({});
    }
  }, [request, mapSubserviceNameToType, fetchSubserviceSchema]);

  if (!request || !isOpen) return null;

  // Función helper para mostrar campo o mensaje de "Sin datos"
  const showFieldOrEmpty = (
    value: string | number | undefined,
    fieldName: string = "Sin datos"
  ) => {
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
      return new Date(dateString).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Función helper para renderizar valores de campos específicos
  const renderFieldValue = (fieldValue: unknown, fieldType?: string) => {
    // Si es un array (formato antiguo con objetos {uri, title, options})
    if (Array.isArray(fieldValue) && fieldValue.length > 0) {
      return fieldValue.map((fieldData: Record<string, unknown>, index: number) => {
        if (fieldData.uri) {
          // Campo de tipo archivo/enlace
          return (
            <div key={index} className="mb-2">
              <a
                href={fieldData.uri as string}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline text-sm"
              >
                {fieldData.title as string || "Ver archivo"}
              </a>
            </div>
          );
        } else if (typeof fieldData.value === "boolean") {
          // Campo booleano
          return (
            <Badge
              key={index}
              variant="outline"
              className="text-sm"
            >
              {fieldData.value ? "Sí" : "No"}
            </Badge>
          );
        } else if (fieldData.value) {
          // Campo de texto/número
          return (
            <p key={index} className="text-base">
              {String(fieldData.value)}
            </p>
          );
        }
        return null;
      });
    }
    
    // Si es un valor directo (nuevo formato)
    if (fieldType === "boolean" || typeof fieldValue === "boolean") {
      return (
        <Badge variant="outline" className="text-sm">
          {fieldValue ? "Sí" : "No"}
        </Badge>
      );
    }
    
    if (fieldType === "file" && typeof fieldValue === "string" && fieldValue.includes("data:")) {
      // Campo de archivo en Base64
      return (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="text-sm text-gray-700">
            Archivo adjunto (Base64)
          </span>
        </div>
      );
    }
    
    // Campo de texto/número normal
    return (
      <p className="text-base">
        {String(fieldValue)}
      </p>
    );
  };

  // Verificar que request tenga los datos necesarios
  if (!request || !request.attributes || !request.relationships) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
                  {loading
                    ? "Cargando información..."
                    : "Información completa de la solicitud seleccionada"}
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
                  {showFieldOrEmpty(
                    request.attributes.field_application_number
                  )}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">
                  Título
                </Label>
                <p className="text-base font-medium bg-gray-50 p-2 rounded border">
                  {showFieldOrEmpty(request.attributes.title)}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">
                  Fecha de Recepción
                </Label>
                <p className="text-base bg-gray-50 p-2 rounded border">
                  {showFieldOrEmpty(
                    formatDate(request.attributes.field_entry_date || "")
                  )}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">
                  Estado de Solicitud
                </Label>
                <div className="mt-1">
                  <Badge variant="outline" className="text-sm">
                    {showFieldOrEmpty(applicationStatusInfo?.name)}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">
                  Calificación
                </Label>
                <p className="text-base font-medium bg-gray-50 p-2 rounded border">
                  {showFieldOrEmpty(
                    request.attributes.field_application_score
                      ? `${String(
                          request.attributes.field_application_score
                        )}/5`
                      : undefined
                  )}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">
                  Valor Priorizado
                </Label>
                <p className="text-base font-medium p-2 rounded border ">
                  {request.attributes.field_prioritized_value
                    ? formatCurrency(request.attributes.field_prioritized_value)
                    : "Sin datos"}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">
                  Tiempo Priorizado (horas)
                </Label>
                <p className={`text-base font-medium p-2 rounded border `}>
                  {request.attributes.field_estimated_prioritized_hour
                    ? `${String(
                        request.attributes.field_estimated_prioritized_hour
                      )}h`
                    : "Sin datos"}
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
                  <Label className="text-sm font-medium text-gray-600">
                    Nombre Solicitante
                  </Label>
                  <p className="text-base font-medium">
                    {showFieldOrEmpty(applicantInfo?.name)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">
                    Tipo de Documento
                  </Label>
                  <p className="text-base bg-white p-2 rounded border">
                    {showFieldOrDash(applicantInfo?.documentType)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">
                    Número de Documento
                  </Label>
                  <p className="text-base bg-white p-2 rounded border">
                    {showFieldOrEmpty(applicantInfo?.documentNumber)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">
                    Fecha de Nacimiento
                  </Label>
                  <p className="text-base bg-white p-2 rounded border">
                    {showFieldOrDash(applicantInfo?.birthDate)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">
                    Tipo de Sexo
                  </Label>
                  <p className="text-base bg-white p-2 rounded border">
                    {showFieldOrEmpty(applicantInfo?.gender)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">
                    Teléfono
                  </Label>
                  <p className="text-base bg-white p-2 rounded border">
                    {showFieldOrEmpty(applicantInfo?.phone)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">
                    Correo Electrónico
                  </Label>
                  <p className="text-base bg-white p-2 rounded border">
                    {showFieldOrEmpty(applicantInfo?.email)}
                  </p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-sm font-medium text-gray-600">
                    Dirección
                  </Label>
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
                <Label className="text-sm font-medium text-gray-600">
                  Subservicio
                </Label>
                <p className="text-base font-medium bg-gray-50 p-2 rounded border">
                  {showFieldOrEmpty(subserviceInfo?.name)}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">
                  Valor del Servicio
                </Label>
                <p className="text-base font-medium bg-gray-50 p-2 rounded border">
                  {showFieldOrEmpty(
                    formatCurrency(request.attributes.field_service_value || 0)
                  )}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">
                  Valor Priorizado
                </Label>
                <p className={`text-base font-medium p-2 rounded border `}>
                  {request.attributes.field_prioritized_value
                    ? formatCurrency(request.attributes.field_prioritized_value)
                    : "Sin datos"}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">
                  Estado de Pago
                </Label>
                <div className="mt-1">
                  <Badge variant="outline" className="text-sm">
                    {showFieldOrEmpty(paymentStatusInfo?.name)}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">
                  Canal Usado
                </Label>
                <div className="mt-1">
                  <Badge variant="outline" className="text-sm">
                    {showFieldOrEmpty(usedChannelInfo?.name)}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">
                  Tiempo Estimado (horas)
                </Label>
                <p className="text-base font-medium bg-gray-50 p-2 rounded border">
                  {showFieldOrEmpty(
                    request.attributes.field_estimated_application_hour
                      ? `${String(
                          request.attributes.field_estimated_application_hour
                        )}h`
                      : undefined
                  )}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">
                  Tiempo Priorizado (horas)
                </Label>
                <p className={`text-base font-medium p-2 rounded border `}>
                  {request.attributes.field_estimated_prioritized_hour
                    ? `${String(
                        request.attributes.field_estimated_prioritized_hour
                      )}h`
                    : "Sin datos"}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">
                  Costos Logísticos
                </Label>
                <p className="text-base font-medium bg-gray-50 p-2 rounded border">
                  {showFieldOrEmpty(
                    formatCurrency(
                      request.attributes.field_logistics_costs || 0
                    )
                  )}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">
                  Estado del Servicio
                </Label>
                <div className="mt-1">
                  <Badge variant="outline" className="text-sm">
                    {showFieldOrEmpty(serviceStatusInfo?.name)}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">
                  Recurrente
                </Label>
                <div className="mt-1">
                  <Badge variant="outline" className="text-sm">
                    {request.attributes.field_is_recurring ? "Sí" : "No"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Información del Servicio Médico - Solo si existe y es realmente un servicio médico */}
          {infoServiceInfo && infoServiceInfo.name && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                <FileCheck className="h-5 w-5" />
                Información del Servicio Médico
              </h3>
              <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">
                      Nombre del Servicio
                    </Label>
                    <p className="text-base bg-white p-2 rounded border">
                      {showFieldOrEmpty(infoServiceInfo.name)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">
                      Número de Orden Médica
                    </Label>
                    <p className="text-base bg-white p-2 rounded border">
                      {showFieldOrEmpty(infoServiceInfo.code)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">
                      Número de Autorización
                    </Label>
                    <p className="text-base bg-white p-2 rounded border">
                      {showFieldOrEmpty(infoServiceInfo.authorizationNumber)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">
                      EPS
                    </Label>
                    <p className="text-base bg-white p-2 rounded border">
                      {showFieldOrEmpty(infoServiceInfo.eps)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">
                      Dirección de Entrega
                    </Label>
                    <p className="text-base bg-white p-2 rounded border">
                      {showFieldOrEmpty(infoServiceInfo.deliveryAddress)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">
                      Ubicación del Reclamo
                    </Label>
                    <p className="text-base bg-white p-2 rounded border">
                      {showFieldOrEmpty(infoServiceInfo.claimLocation)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">
                      Nombre de la IPS
                    </Label>
                    <p className="text-base bg-white p-2 rounded border">
                      {showFieldOrEmpty(infoServiceInfo.ipsName)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">
                      Dirección de la IPS
                    </Label>
                    <p className="text-base bg-white p-2 rounded border">
                      {showFieldOrEmpty(infoServiceInfo.ipsAddress)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">
                      Es Recurrente
                    </Label>
                    <div className="mt-1">
                      <Badge variant="outline" className="text-sm">
                        {infoServiceInfo.isRecurring ? "Sí" : "No"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">
                      Prioridad
                    </Label>
                    <p className="text-base bg-white p-2 rounded border">
                      {showFieldOrEmpty(infoServiceInfo.priority)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">
                      Ubicación Relativa
                    </Label>
                    <p className="text-base bg-white p-2 rounded border">
                      {showFieldOrEmpty(infoServiceInfo.relativeLocation)}
                    </p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-medium text-gray-600">
                      Archivo Adjunto
                    </Label>
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
          {subserviceSchema &&
            subserviceFields &&
            (() => {
              // Contar solo los campos que empiecen con "field_" y tengan valores
              const fieldCount = Object.entries(subserviceFields).filter(
                ([fieldKey, fieldValues]) => {
                  return (
                    fieldKey.startsWith("field_") &&
                    fieldValues &&
                    Array.isArray(fieldValues) &&
                    fieldValues.length > 0
                  );
                }
              ).length;

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
                    <h4 className="text-md font-medium text-gray-700 mb-3">
                      Información General
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-600">
                          Título
                        </Label>
                        <p className="text-base bg-gray-50 p-2 rounded border">
                          {(subserviceFields.title as Array<{value: string}>)?.[0]?.value || "Sin título"}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-600">
                          Estado
                        </Label>
                        <div className="mt-1">
                          <Badge variant="outline" className="text-sm">
                            {(subserviceFields.status as Array<{value: string}>)?.[0]?.value
                              ? "Activo"
                              : "Inactivo"}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-600">
                          Creado
                        </Label>
                        <p className="text-base bg-gray-50 p-2 rounded border">
                          {(subserviceFields.created as Array<{value: string}>)?.[0]?.value
                            ? formatDate((subserviceFields.created as Array<{value: string}>)[0].value)
                            : "Sin fecha"}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-600">
                          Última Modificación
                        </Label>
                        <p className="text-base bg-gray-50 p-2 rounded border">
                          {(subserviceFields.changed as Array<{value: string}>)?.[0]?.value
                            ? formatDate((subserviceFields.changed as Array<{value: string}>)[0].value)
                            : "Sin fecha"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Campos Específicos del Schema */}
                  <div>
                    <h4 className="text-md font-medium text-gray-700 mb-3">
                      Campos Específicos del Subservicio: {subserviceSchema.label}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(subserviceFields).map(
                        ([fieldKey, fieldValue]: [string, unknown]) => {
                          // Solo mostrar campos que empiecen con "field_" y tengan valores
                          if (
                            !fieldKey.startsWith("field_") ||
                            (fieldValue === null || fieldValue === undefined || fieldValue === "")
                          )
                            return null;

                          const fieldSchema = subserviceSchema.schema[fieldKey];
                          const fieldLabel =
                            fieldSchema?.label ||
                            fieldKey.replace("field_", "").replace(/_/g, " ");

                          return (
                            <div key={fieldKey} className="space-y-2">
                              <Label className="text-sm font-medium text-gray-600">
                                {fieldLabel}
                                {fieldSchema?.required && (
                                  <span className="text-red-500 ml-1">*</span>
                                )}
                              </Label>
                              <div className="bg-white p-2 rounded border">
                                {renderFieldValue(fieldValue, fieldSchema?.type)}
                              </div>
                              {fieldSchema?.description && (
                                <p className="text-xs text-gray-500 italic">
                                  {fieldSchema.description}
                                </p>
                              )}
                            </div>
                          );
                        }
                      )}
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
                  <Label className="text-sm font-medium text-gray-600">
                    Nombre Completo
                  </Label>
                  <p className="text-base font-medium">
                    {showFieldOrEmpty(distributorInfo?.name)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">
                    Tipo de Documento
                  </Label>
                  <p className="text-base bg-white p-2 rounded border">
                    {showFieldOrDash(distributorInfo?.documentType)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">
                    Número de Documento
                  </Label>
                  <p className="text-base bg-white p-2 rounded border">
                    {showFieldOrEmpty(distributorInfo?.documentNumber)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">
                    Teléfono
                  </Label>
                  <p className="text-base bg-white p-2 rounded border">
                    {showFieldOrEmpty(distributorInfo?.phone)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">
                    Correo Electrónico
                  </Label>
                  <p className="text-base bg-white p-2 rounded border">
                    {showFieldOrEmpty(distributorInfo?.email)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">
                    Estado Actual
                  </Label>
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
                <Label className="text-sm font-medium text-gray-600">
                  Creado
                </Label>
                <p className="text-base bg-gray-50 p-2 rounded border">
                  {showFieldOrEmpty(
                    formatDate(request.attributes.created || "")
                  )}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">
                  Última Modificación
                </Label>
                <p className="text-base bg-gray-50 p-2 rounded border">
                  {showFieldOrEmpty(
                    formatDate(request.attributes.changed || "")
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Información del Sistema */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">
              Información del Sistema
            </h3>
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
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="hover:bg-gray-100"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
