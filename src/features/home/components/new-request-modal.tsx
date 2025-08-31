"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import {
  fetchApplicants,
  fetchDistributors,
  fetchPaymentStatuses,
  fetchUsedChannels,
  fetchApplicationStatuses,
  fetchSubservicesByService,
  fetchServicesByCategory,
} from "../utils/request";
import { fetchCategories } from "@/features/config/utils/category";
import { useCreateRequestMutation } from "../hooks/use-request-mutations";
import type { CreateRequestPayload } from "../types/request";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/api";

interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Applicant {
  id: string;
  fullName: string;
  documentNumber: string;
}

interface Distributor {
  id: string;
  title: string;
  documentNumber: string;
}

interface Subservice {
  id: string;
  name: string;
  attributes?: {
    name?: string;
    field_schema?: string;
    [key: string]: any;
  };
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
    title?: number;
  }>;
}

interface Category {
  uuid: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
}

// Schema de validación
const formSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  applicationNumber: z.string().min(1, "El número de solicitud es requerido"),
  applicantId: z.string().min(1, "El cliente es requerido"),
  distributorId: z.string().optional(),
  categoryId: z.string().min(1, "La categoría es requerida"),
  serviceId: z.string().min(1, "El tipo de servicio es requerido"),
  subserviceId: z.string().optional(),
  serviceCode: z.string().optional(),
  serviceValue: z.string().optional(),
  priorityValue: z.string().min(1, "El valor priorizado es requerido").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "El valor debe ser un número mayor a 0"
  ),
  paymentStatus: z.string().min(1, "El estado de pago es requerido"),
  usedChannel: z.string().min(1, "El canal usado es requerido"),
  estimatedHours: z.string().min(1, "El tiempo estimado es requerido"),
  priorityEstimatedHours: z
    .string()
    .min(1, "El tiempo estimado priorizado es requerido")
    .refine(
      (val) => !isNaN(parseInt(val)) && parseInt(val) > 0,
      "El tiempo debe ser un número mayor a 0"
    ),
  logisticsCosts: z.string().optional(),
  applicationScore: z
    .string()
    .min(1, "La calificación es requerida")
    .refine(
      (val) => parseInt(val) >= 1 && parseInt(val) <= 5,
      "La calificación debe estar entre 1 y 5"
    ),
  isRecurring: z.boolean(),
  serviceStatus: z.string().min(1, "El estado del servicio es requerido"),
  requestStatus: z.string().min(1, "El estado de la solicitud es requerido"),
  entryDate: z.string().min(1, "La fecha de entrada es requerida"),
  promote: z.boolean(),
  sticky: z.boolean(),
});

export function NewRequestModal({
  isOpen,
  onClose,
  onSuccess,
}: NewRequestModalProps) {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [subservices, setSubservices] = useState<Subservice[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [subserviceSchema, setSubserviceSchema] = useState<SubserviceSchema | null>(null);

  // Estados para manejar las dependencias entre selects
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");

  // Estados para los nuevos campos
  const [paymentStatuses, setPaymentStatuses] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [serviceStatuses, setServiceStatuses] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [requestStatuses, setRequestStatuses] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [channels, setChannels] = useState<Array<{ id: string; name: string }>>(
    []
  );

  // Usar el hook de mutación para crear solicitudes
  const createRequestMutation = useCreateRequestMutation();

  // Funciones para manejar cambios en selects dependientes
  const handleCategoryChange = (categoryId: string) => {
    console.log("Category changed to:", categoryId);
    setSelectedCategoryId(categoryId);
    setSelectedServiceId("");
    form.setValue("serviceId", "");
    form.setValue("subserviceId", "");
    // Cargar servicios cuando cambie la categoría
    if (categoryId) {
      console.log("Calling loadServicesByCategory with:", categoryId);
      loadServicesByCategory(categoryId);
    } else {
      console.log("No category selected, clearing services");
      setServices([]);
    }
  };

  const handleServiceChange = (serviceId: string) => {
    console.log("Service changed to:", serviceId);
    setSelectedServiceId(serviceId);
    form.setValue("subserviceId", "");
    // Cargar subservicios cuando cambie el servicio
    if (serviceId) {
      console.log("Calling loadSubservicesByService with:", serviceId);
      loadSubservicesByService(serviceId);
    } else {
      console.log("No service selected, clearing subservices");
      setSubservices([]);
    }
  };

  // Función para manejar cambios en el subservicio
  const handleSubserviceChange = async (subserviceId: string) => {
    console.log("🔍 Subservice changed to:", subserviceId);
    
    if (subserviceId) {
      try {
        // Obtener el tipo del subservicio desde la lista de subservicios
        const selectedSubservice = subservices.find(s => s.id === subserviceId);
        console.log("🔍 Selected subservice:", selectedSubservice);
        
        if (selectedSubservice) {
          console.log("🔍 Processing subservice:", selectedSubservice.name);
          console.log("🔍 Subservice ID:", selectedSubservice.id);
          
          // PRIMERO: Intentar obtener el schema desde field_schema del subservicio
          const schemaFromData = getSubserviceSchemaFromData(subserviceId);
          console.log("🔍 Schema from subservice data:", schemaFromData);
          
          if (schemaFromData) {
            console.log("🔍 Loading schema from API for:", schemaFromData);
            const apiSchema = await fetchSubserviceSchema(schemaFromData);
            if (apiSchema) {
              console.log("✅ API Schema loaded from field_schema:", apiSchema);
              console.log("✅ Schema bundle:", apiSchema.bundle);
              console.log("✅ Schema label:", apiSchema.label);
              setSubserviceSchema(apiSchema);
              return; // Salir si se cargó exitosamente desde la API
            } else {
              console.log("⚠️ API schema not available, using fallback mapping");
            }
          }
          
          // SEGUNDO: Si no hay field_schema o API falló, usar mapeo por nombre
          const subserviceType = mapSubserviceNameToType(selectedSubservice.name);
          console.log("🔍 Fallback mapped subservice type:", subserviceType);
          
          if (subserviceType) {
            console.log("🔍 Attempting API schema for mapped type:", subserviceType);
            const fallbackApiSchema = await fetchSubserviceSchema(subserviceType);
            
            if (fallbackApiSchema) {
              console.log("✅ Fallback API Schema loaded:", fallbackApiSchema);
              console.log("✅ Fallback Schema bundle:", fallbackApiSchema.bundle);
              console.log("✅ Fallback Schema label:", fallbackApiSchema.label);
              setSubserviceSchema(fallbackApiSchema);
            } else {
              console.log("⚠️ API schema not available, using hardcoded default");
              const defaultSchema = createDefaultSchema(subserviceType);
              console.log("✅ Hardcoded schema created:", defaultSchema);
              console.log("✅ Hardcoded Schema bundle:", defaultSchema.bundle);
              console.log("✅ Hardcoded Schema label:", defaultSchema.label);
              setSubserviceSchema(defaultSchema);
            }
          } else {
            console.log("⚠️ Could not map subservice name to type, using generic");
            const genericSchema = createDefaultSchema('generic');
            console.log("✅ Generic schema created:", genericSchema);
            console.log("✅ Generic Schema bundle:", genericSchema.bundle);
            console.log("✅ Generic Schema label:", genericSchema.label);
            setSubserviceSchema(genericSchema);
          }
        } else {
          console.log("❌ Selected subservice not found in list");
        }
      } catch (error) {
        console.error("❌ Error loading subservice schema:", error);
        const selectedSubservice = subservices.find(s => s.id === subserviceId);
        if (selectedSubservice) {
          const subserviceType = mapSubserviceNameToType(selectedSubservice.name);
          if (subserviceType) {
            const defaultSchema = createDefaultSchema(subserviceType);
            console.log("✅ Default schema created after error:", defaultSchema);
            setSubserviceSchema(defaultSchema);
          }
        }
      }
    } else {
      console.log("🔍 Clearing subservice schema");
      setSubserviceSchema(null);
    }
  };

  // Función para obtener el schema desde el subservicio seleccionado
  const getSubserviceSchemaFromData = (subserviceId: string): string | null => {
    const selectedSubservice = subservices.find(s => s.id === subserviceId);
    console.log("🔍 Selected subservice for schema extraction:", selectedSubservice);
    console.log("🔍 Subservice attributes:", selectedSubservice?.attributes);
    console.log("🔍 Field schema value:", selectedSubservice?.attributes?.field_schema);
    
    if (selectedSubservice?.attributes?.field_schema) {
      const schema = selectedSubservice.attributes.field_schema;
      console.log("✅ Found field_schema:", schema);
      return schema;
    }
    console.log("❌ No field_schema found in subservice data");
    return null;
  };

  // Función para mapear nombres de subservicios a tipos (fallback)
  const mapSubserviceNameToType = (subserviceName: string): string | null => {
    const mapping: Record<string, string> = {
      // Certificaciones y Propiedades
      "Certificación de propiedad": "property_certification",
      
      // Farmacia y Medicamentos
      "Reclamos de farmacia": "pharmacy_claims",
      "Reclamo de medicamentos": "pharmacy_claims",
      "Reclamo en una (1) o más farmacias": "pharmacy_claims",
      
      // Correspondencia y Documentos
      "Entrega de correspondencia (sobre)": "mail_delivery",
      "Radicación y sello de recibido": "document_processing",
      "Con evidencia fotográfica": "sending_correspondence",
      
      // Transporte
      "Bogotá-La Mesa o Viceversa": "transport_service",
      
      // Registros Civiles y Documentos Legales
      "Solicitud registros civiles": "civil_records_request",
      "Partidas de matrimonio": "marriage_certificate",
      "Partidas de defunción": "death_certificate",
      "Copia de escrituras": "property_deed_copy",
      
      // Agregar más mapeos según sea necesario
    };
    
    return mapping[subserviceName] || null;
  };

  // Función para crear schema por defecto cuando no esté disponible
  const createDefaultSchema = (subserviceType: string): SubserviceSchema => {
    const defaultSchemas: Record<string, SubserviceSchema> = {
      "property_certification": {
        bundle: "property_certification",
        label: "Certificación de Propiedad",
        description: "Información adicional para certificación de propiedad",
        schema: {
          field_applicant_id_copy: {
            label: "Copia cédula del solicitante",
            description: "Copia de la cédula de identidad del solicitante",
            required: false,
            multiple: true,
            type: "link",
            title: 1
          },
          field_cadastral_registration: {
            label: "Registro catastral",
            description: "Número del registro catastral del predio",
            required: false,
            multiple: false,
            type: "string"
          },
          field_document_number: {
            label: "Número de documento",
            description: "Número de documento del solicitante",
            required: true,
            multiple: false,
            type: "string"
          },
          field_owner_name: {
            label: "Nombre del propietario",
            description: "Nombre completo del propietario del predio",
            required: false,
            multiple: false,
            type: "string"
          },
          field_property_deed_copy: {
            label: "Copia de la escritura",
            description: "Adjunte copia de la escritura correspondiente",
            required: false,
            multiple: false,
            type: "link",
            title: 1
          },
          field_property_number: {
            label: "Número de matrícula inmobiliaria",
            description: "Número de matrícula del predio",
            required: false,
            multiple: false,
            type: "string"
          },
          field_property_registered: {
            label: "Cuenta con matrícula inmobiliaria",
            description: "Indica si el predio tiene matrícula inmobiliaria",
            required: false,
            multiple: false,
            type: "boolean"
          },
          field_registry_notary_number: {
            label: "Número de notaría",
            description: "Número de la notaría correspondiente al registro civil",
            required: false,
            multiple: false,
            type: "string"
          }
        }
      },
      "pharmacy_claims": {
        bundle: "pharmacy_claims",
        label: "Reclamos de Farmacia",
        description: "Información adicional para reclamos de farmacia",
        schema: {
          field_eps: {
            label: "EPS",
            description: "Entidad Promotora de Salud",
            required: false,
            multiple: false,
            type: "string"
          },
          field_delivery_address: {
            label: "Dirección de entrega",
            description: "Dirección donde se entregará el medicamento",
            required: false,
            multiple: false,
            type: "string"
          },
          field_authorization_number: {
            label: "Número de autorización",
            description: "Número de autorización del medicamento",
            required: false,
            multiple: false,
            type: "string"
          },
          field_claim_location: {
            label: "Ubicación del reclamo",
            description: "Ubicación donde se realizó el reclamo",
            required: false,
            multiple: false,
            type: "string"
          },
          field_ips_name: {
            label: "Nombre de la IPS",
            description: "Nombre de la Institución Prestadora de Servicios",
            required: false,
            multiple: false,
            type: "string"
          },
          field_ips_address: {
            label: "Dirección de la IPS",
            description: "Dirección de la Institución Prestadora de Servicios",
            required: false,
            multiple: false,
            type: "string"
          },
          field_is_recurring: {
            label: "Es recurrente",
            description: "Indica si el servicio es recurrente",
            required: false,
            multiple: false,
            type: "boolean"
          },
          field_priority: {
            label: "Prioridad",
            description: "Nivel de prioridad del reclamo",
            required: false,
            multiple: false,
            type: "string"
          },
          field_path: {
            label: "Ruta",
            description: "Ruta del proceso del reclamo",
            required: false,
            multiple: false,
            type: "string"
          },
          field_relative_location: {
            label: "Ubicación relativa",
            description: "Ubicación relativa del reclamo",
            required: false,
            multiple: false,
            type: "string"
          }
        }
      },
      "mail_delivery": {
        bundle: "mail_delivery",
        label: "Entrega de Correspondencia",
        description: "Información adicional para entrega de correspondencia",
        schema: {
          field_sender_name: {
            label: "Nombre del remitente",
            description: "Nombre completo de quien envía la correspondencia",
            required: false,
            multiple: false,
            type: "string"
          },
          field_sender_address: {
            label: "Dirección del remitente",
            description: "Dirección completa del remitente",
            required: false,
            multiple: false,
            type: "string"
          },
          field_recipient_name: {
            label: "Nombre del destinatario",
            description: "Nombre completo de quien recibe la correspondencia",
            required: false,
            multiple: false,
            type: "string"
          },
          field_recipient_address: {
            label: "Dirección del destinatario",
            description: "Dirección completa del destinatario",
            required: false,
            multiple: false,
            type: "string"
          },
          field_package_type: {
            label: "Tipo de paquete",
            description: "Tipo de paquete o sobre a entregar",
            required: false,
            multiple: false,
            type: "string"
          },
          field_package_weight: {
            label: "Peso del paquete",
            description: "Peso aproximado del paquete en kilogramos",
            required: false,
            multiple: false,
            type: "string"
          },
          field_delivery_instructions: {
            label: "Instrucciones de entrega",
            description: "Instrucciones especiales para la entrega",
            required: false,
            multiple: false,
            type: "string"
          },
          field_urgent_delivery: {
            label: "Entrega urgente",
            description: "Indica si la entrega es urgente",
            required: false,
            multiple: false,
            type: "boolean"
          }
        }
      },
      "document_processing": {
        bundle: "document_processing",
        label: "Procesamiento de Documentos",
        description: "Información adicional para procesamiento de documentos",
        schema: {
          field_document_type: {
            label: "Tipo de documento",
            description: "Tipo de documento a procesar",
            required: false,
            multiple: false,
            type: "string"
          },
          field_document_number: {
            label: "Número de documento",
            description: "Número de identificación del documento",
            required: false,
            multiple: false,
            type: "string"
          },
          field_processing_type: {
            label: "Tipo de procesamiento",
            description: "Tipo de procesamiento requerido",
            required: false,
            multiple: false,
            type: "string"
          },
          field_priority_level: {
            label: "Nivel de prioridad",
            description: "Nivel de prioridad del procesamiento",
            required: false,
            multiple: false,
            type: "string"
          },
          field_deadline: {
            label: "Fecha límite",
            description: "Fecha límite para el procesamiento",
            required: false,
            multiple: false,
            type: "string"
          },
          field_special_requirements: {
            label: "Requerimientos especiales",
            description: "Requerimientos especiales para el procesamiento",
            required: false,
            multiple: false,
            type: "string"
          }
        }
      },
      "transport_service": {
        bundle: "transport_service",
        label: "Servicio de Transporte",
        description: "Información adicional para servicios de transporte",
        schema: {
          field_origin_location: {
            label: "Ubicación de origen",
            description: "Punto de partida del transporte",
            required: false,
            multiple: false,
            type: "string"
          },
          field_destination_location: {
            label: "Ubicación de destino",
            description: "Punto de llegada del transporte",
            required: false,
            multiple: false,
            type: "string"
          },
          field_transport_type: {
            label: "Tipo de transporte",
            description: "Tipo de vehículo o medio de transporte",
            required: false,
            multiple: false,
            type: "string"
          },
          field_passenger_count: {
            label: "Número de pasajeros",
            description: "Cantidad de pasajeros a transportar",
            required: false,
            multiple: false,
            type: "string"
          },
          field_cargo_description: {
            label: "Descripción de la carga",
            description: "Descripción de la carga a transportar",
            required: false,
            multiple: false,
            type: "string"
          },
          field_special_requirements: {
            label: "Requerimientos especiales",
            description: "Requerimientos especiales para el transporte",
            required: false,
            multiple: false,
            type: "string"
          },
          field_urgent_service: {
            label: "Servicio urgente",
            description: "Indica si el servicio es urgente",
            required: false,
            multiple: false,
            type: "boolean"
          }
        }
      },
      "sending_correspondence": {
        bundle: "sending_correspondence",
        label: "Envío de Correspondencia",
        description: "Información adicional para envío de correspondencia",
        schema: {
          field_package_content_descriptio: {
            label: "Descripción del contenido del paquete",
            description: "Descripción detallada del contenido del paquete",
            required: false,
            multiple: false,
            type: "string"
          },
          field_path: {
            label: "Ruta",
            description: "Ruta o enlace relacionado con el envío",
            required: false,
            multiple: false,
            type: "link"
          },
          field_priority: {
            label: "Prioridad",
            description: "Indica si el envío es prioritario",
            required: false,
            multiple: false,
            type: "boolean"
          },
          field_receiver_birthdate: {
            label: "Fecha de nacimiento del destinatario",
            description: "Fecha de nacimiento de quien recibe la correspondencia",
            required: false,
            multiple: false,
            type: "string"
          },
          field_receiver_gender: {
            label: "Género del destinatario",
            description: "Género de quien recibe la correspondencia",
            required: false,
            multiple: false,
            type: "string"
          },
          field_recipient_address: {
            label: "Dirección del destinatario",
            description: "Dirección completa del destinatario",
            required: false,
            multiple: false,
            type: "string"
          },
          field_recipient_contact_phone: {
            label: "Teléfono de contacto del destinatario",
            description: "Número de teléfono del destinatario",
            required: false,
            multiple: false,
            type: "string"
          },
          field_recipient_full_name: {
            label: "Nombre completo del destinatario",
            description: "Nombre y apellidos del destinatario",
            required: false,
            multiple: false,
            type: "string"
          },
          field_requires_radicado: {
            label: "Requiere radicado",
            description: "Indica si el envío requiere radicado",
            required: false,
            multiple: false,
            type: "boolean"
          },
          field_sender_address: {
            label: "Dirección del remitente",
            description: "Dirección completa del remitente",
            required: false,
            multiple: false,
            type: "string"
          },
          field_sender_contact_phone: {
            label: "Teléfono de contacto del remitente",
            description: "Número de teléfono del remitente",
            required: false,
            multiple: false,
            type: "string"
          },
          field_sender_full_name: {
            label: "Nombre completo del remitente",
            description: "Nombre y apellidos del remitente",
            required: false,
            multiple: false,
            type: "string"
          }
        }
      },
      "civil_records_request": {
        bundle: "civil_records_request",
        label: "Solicitud de Registros Civiles",
        description: "Información adicional para solicitud de registros civiles",
        schema: {
          field_request_type: {
            label: "Tipo de solicitud",
            description: "Tipo específico de registro civil solicitado",
            required: false,
            multiple: false,
            type: "string"
          },
          field_person_name: {
            label: "Nombre de la persona",
            description: "Nombre completo de la persona del registro",
            required: false,
            multiple: false,
            type: "string"
          },
          field_birth_date: {
            label: "Fecha de nacimiento",
            description: "Fecha de nacimiento de la persona",
            required: false,
            multiple: false,
            type: "string"
          },
          field_parents_names: {
            label: "Nombres de los padres",
            description: "Nombres completos de los padres",
            required: false,
            multiple: false,
            type: "string"
          },
          field_place_of_birth: {
            label: "Lugar de nacimiento",
            description: "Ciudad o lugar donde nació la persona",
            required: false,
            multiple: false,
            type: "string"
          },
          field_reason_for_request: {
            label: "Motivo de la solicitud",
            description: "Razón por la cual se solicita el registro",
            required: false,
            multiple: false,
            type: "string"
          },
          field_urgent_request: {
            label: "Solicitud urgente",
            description: "Indica si la solicitud es urgente",
            required: false,
            multiple: false,
            type: "boolean"
          }
        }
      },
      "marriage_certificate": {
        bundle: "marriage_certificate",
        label: "Partida de Matrimonio",
        description: "Información adicional para partida de matrimonio",
        schema: {
          field_spouse1_name: {
            label: "Nombre del primer cónyuge",
            description: "Nombre completo del primer cónyuge",
            required: false,
            multiple: false,
            type: "string"
          },
          field_spouse2_name: {
            label: "Nombre del segundo cónyuge",
            description: "Nombre completo del segundo cónyuge",
            required: false,
            multiple: false,
            type: "string"
          },
          field_marriage_date: {
            label: "Fecha de matrimonio",
            description: "Fecha en que se celebró el matrimonio",
            required: false,
            multiple: false,
            type: "string"
          },
          field_marriage_place: {
            label: "Lugar de matrimonio",
            description: "Ciudad o lugar donde se celebró el matrimonio",
            required: false,
            multiple: false,
            type: "string"
          },
          field_marriage_official: {
            label: "Funcionario que celebró",
            description: "Nombre del funcionario que celebró el matrimonio",
            required: false,
            multiple: false,
            type: "string"
          },
          field_witnesses: {
            label: "Testigos",
            description: "Nombres de los testigos del matrimonio",
            required: false,
            multiple: false,
            type: "string"
          },
          field_marriage_type: {
            label: "Tipo de matrimonio",
            description: "Tipo de ceremonia matrimonial",
            required: false,
            multiple: false,
            type: "string"
          }
        }
      },
      "death_certificate": {
        bundle: "death_certificate",
        label: "Partida de Defunción",
        description: "Información adicional para partida de defunción",
        schema: {
          field_deceased_name: {
            label: "Nombre del fallecido",
            description: "Nombre completo de la persona fallecida",
            required: false,
            multiple: false,
            type: "string"
          },
          field_death_date: {
            label: "Fecha de fallecimiento",
            description: "Fecha en que falleció la persona",
            required: false,
            multiple: false,
            type: "string"
          },
          field_death_place: {
            label: "Lugar de fallecimiento",
            description: "Ciudad o lugar donde falleció la persona",
            required: false,
            multiple: false,
            type: "string"
          },
          field_cause_of_death: {
            label: "Causa de muerte",
            description: "Causa médica del fallecimiento",
            required: false,
            multiple: false,
            type: "string"
          },
          field_burial_place: {
            label: "Lugar de sepultura",
            description: "Cementerio o lugar donde fue sepultado",
            required: false,
            multiple: false,
            type: "string"
          },
          field_funeral_home: {
            label: "Funeraria",
            description: "Nombre de la funeraria que manejó el servicio",
            required: false,
            multiple: false,
            type: "string"
          },
          field_next_of_kin: {
            label: "Familiar más cercano",
            description: "Nombre del familiar más cercano del fallecido",
            required: false,
            multiple: false,
            type: "string"
          }
        }
      },
      "property_deed_copy": {
        bundle: "property_deed_copy",
        label: "Copia de Escrituras",
        description: "Información adicional para copia de escrituras",
        schema: {
          field_property_address: {
            label: "Dirección de la propiedad",
            description: "Dirección completa de la propiedad",
            required: false,
            multiple: false,
            type: "string"
          },
          field_property_type: {
            label: "Tipo de propiedad",
            description: "Tipo de inmueble (casa, apartamento, terreno, etc.)",
            required: false,
            multiple: false,
            type: "string"
          },
          field_deed_number: {
            label: "Número de escritura",
            description: "Número de la escritura pública",
            required: false,
            multiple: false,
            type: "string"
          },
          field_notary_name: {
            label: "Nombre del notario",
            description: "Nombre del notario que autorizó la escritura",
            required: false,
            multiple: false,
            type: "string"
          },
          field_deed_date: {
            label: "Fecha de la escritura",
            description: "Fecha en que se otorgó la escritura",
            required: false,
            multiple: false,
            type: "string"
          },
          field_property_owner: {
            label: "Propietario actual",
            description: "Nombre del propietario actual de la propiedad",
            required: false,
            multiple: false,
            type: "string"
          },
          field_property_value: {
            label: "Valor de la propiedad",
            description: "Valor comercial de la propiedad",
            required: false,
            multiple: false,
            type: "string"
          },
          field_requires_certification: {
            label: "Requiere certificación",
            description: "Indica si se requiere certificación notarial",
            required: false,
            multiple: false,
            type: "boolean"
          }
        }
      }
    };

    return defaultSchemas[subserviceType] || {
      bundle: subserviceType,
      label: `Subservicio ${subserviceType}`,
      description: `Información adicional para ${subserviceType}`,
      schema: {
        field_general_info: {
          label: "Información general",
          description: "Información general del subservicio",
          required: false,
          multiple: false,
          type: "string"
        },
        field_notes: {
          label: "Notas adicionales",
          description: "Notas o comentarios adicionales sobre el subservicio",
          required: false,
          multiple: false,
          type: "string"
        },
        field_documents: {
          label: "Documentos relacionados",
          description: "Enlaces a documentos relacionados con el subservicio",
          required: false,
          multiple: true,
          type: "link",
          title: 1
        }
      }
    };
  };

  // Función para cargar servicios por categoría
  const loadServicesByCategory = async (categoryId: string) => {
    try {
      console.log("Loading services for category:", categoryId);
      const servicesData = await fetchServicesByCategory(categoryId);
      console.log("Services data received:", servicesData);
      console.log("Services raw structure:", JSON.stringify(servicesData, null, 2));
      
      if (servicesData?.services) {
        const mappedServices = servicesData.services.map((service: any) => {
          console.log("Processing service:", service);
          return {
            id: service.id,
            name: service.attributes?.name || service.name || "Sin nombre",
          };
        });
        console.log("Mapped services:", mappedServices);
        setServices(mappedServices);
      } else {
        console.log("No services data found");
        setServices([]);
      }
    } catch (error) {
      console.error("Error loading services by category:", error);
      setServices([]);
    }
  };

  // Función para cargar subservicios por servicio
  const loadSubservicesByService = async (serviceId: string) => {
    try {
      console.log("Loading subservices for service:", serviceId);

      // Usar la función fetchSubservicesByService que ya existe
      const subservicesData = await fetchSubservicesByService(serviceId);

      console.log("Subservices data received:", subservicesData);
      console.log("Subservices raw structure:", JSON.stringify(subservicesData, null, 2));

      if (subservicesData?.subservices) {
        const mappedSubservices = subservicesData.subservices.map(
          (subservice: any) => {
            console.log("🔍 Processing subservice:", subservice);
            console.log("🔍 Subservice attributes:", subservice.attributes);
            console.log("🔍 Field schema:", subservice.attributes?.field_schema);
            console.log("🔍 Subservice name:", subservice.attributes?.name);
            
            const mappedSubservice = {
              id: subservice.id,
              name: subservice.attributes?.name || subservice.name || subservice.nombre || "Sin nombre",
              // INCLUIR TODOS LOS ATRIBUTOS para poder acceder a field_schema
              attributes: subservice.attributes
            };
            
            console.log("✅ Mapped subservice:", mappedSubservice);
            return mappedSubservice;
          }
        );
        console.log("Mapped subservices with attributes:", mappedSubservices);
        setSubservices(mappedSubservices);
      } else {
        console.log("No subservices data found");
        setSubservices([]);
      }
    } catch (error) {
      console.error("Error loading subservices by service:", error);
      setSubservices([]);
    }
  };

  // Función para obtener el schema del subservicio
  const fetchSubserviceSchema = async (subserviceType: string) => {
    try {
      const apiUrl = `/api/node-type-schema/${subserviceType}`;
      console.log("🔍 Fetching schema from:", apiUrl);
      console.log("🔍 Full URL would be:", `${window.location.origin}${apiUrl}`);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        console.log(`⚠️ HTTP error! status: ${response.status} - API endpoint may not exist`);
        return null; // Silenciosamente fallar sin error
      }
      
      // Verificar que la respuesta sea JSON válido
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.log(`⚠️ Invalid content type: ${contentType} - API endpoint may not exist`);
        return null; // Silenciosamente fallar sin error
      }
      
      const data = await response.json();
      console.log("✅ API Schema received:", data);
      return data;
    } catch (error) {
      console.log(`⚠️ API schema fetch failed for ${subserviceType} - using fallback`);
      return null; // Silenciosamente fallar sin error
    }
  };

  // Función para verificar si un tipo de contenido existe en Drupal
  const checkContentTypeExists = async (contentType: string) => {
    try {
      // Intentar obtener información sobre el tipo de contenido
      const response = await api.get(`/api/node-types/${contentType}`);
      console.log(`✅ Content type '${contentType}' exists:`, response.data);
      return true;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`❌ Content type '${contentType}' does not exist`);
        return false;
      }
      console.log(`⚠️ Could not verify content type '${contentType}':`, error.message);
      return null; // No se pudo verificar
    }
  };

  // Función para obtener tipos de contenido disponibles en Drupal
  const getAvailableContentTypes = async () => {
    try {
      const response = await api.get('/api/node-types');
      console.log("✅ Available content types:", response.data);
      return response.data;
    } catch (error: any) {
      console.log("❌ Could not get available content types:", error.message);
      return null;
    }
  };

  // Función para encontrar un tipo de contenido alternativo que funcione
  const findWorkingContentType = async (preferredType: string) => {
    try {
      const availableTypes = await getAvailableContentTypes();
      if (!availableTypes) return null;

      // Buscar el tipo preferido primero
      if (availableTypes.data?.some((type: any) => type.id === preferredType)) {
        console.log(`✅ Preferred type '${preferredType}' is available`);
        return preferredType;
      }

      // Si no está disponible, buscar tipos alternativos que sabemos que funcionan
      const fallbackTypes = ['page', 'article', 'basic_page', 'profile'];
      for (const fallbackType of fallbackTypes) {
        if (availableTypes.data?.some((type: any) => type.id === fallbackType)) {
          console.log(`⚠️ Using fallback type '${fallbackType}' instead of '${preferredType}'`);
          return fallbackType;
        }
      }

      console.log("❌ No working content types found");
      return null;
    } catch (error) {
      console.error("Error finding working content type:", error);
      return null;
    }
  };

  // Función para probar la creación de nodos y obtener información de errores
  const testNodeCreation = async () => {
    try {
      console.log("🧪 Testing node creation endpoints...");
      
      // Probar JSON:API
      try {
        const jsonApiResponse = await api.get('/api/node-types');
        console.log("✅ JSON:API node types endpoint accessible:", jsonApiResponse.data);
      } catch (error: any) {
        console.log("❌ JSON:API node types endpoint failed:", error.message);
      }
      
      // Probar Drupal REST API
      try {
        const restApiResponse = await api.get('/node?_format=json');
        console.log("✅ Drupal REST API accessible:", restApiResponse.data);
      } catch (error: any) {
        console.log("❌ Drupal REST API failed:", error.message);
      }
      
    } catch (error) {
      console.error("Error testing node creation:", error);
    }
  };

  // Función para crear el nodo del subservicio
  const createSubserviceNode = async (subserviceType: string, formData: any) => {
    try {
      console.log(`🔍 Creating subservice node for type: ${subserviceType}`);
      console.log(`🔍 SubserviceType parameter received:`, subserviceType);
      console.log(`🔍 SubserviceType type:`, typeof subserviceType);
      console.log(`🔍 SubserviceType length:`, subserviceType?.length);
      
      // Obtener el schema del subservicio (intentar API primero)
      let schema = await fetchSubserviceSchema(subserviceType);
      
      // Si la API falla, usar schema hardcodeado
      if (!schema) {
        console.log(`⚠️ API schema not available for ${subserviceType}, using hardcoded schema`);
        schema = createDefaultSchema(subserviceType);
      }

      if (!schema) {
        throw new Error(`No se pudo obtener el schema para ${subserviceType}`);
      }
      
      // Verificar si el tipo de contenido existe en Drupal y encontrar uno que funcione
      console.log(`🔍 Checking if content type '${subserviceType}' exists...`);
      
      const contentTypeExists = await checkContentTypeExists(subserviceType);
      if (contentTypeExists === false) {
        console.log(`❌ Content type '${subserviceType}' does not exist in Drupal`);
        console.log(`🔍 Looking for alternative content type...`);
        
        const workingType = await findWorkingContentType(subserviceType);
        if (workingType && workingType !== subserviceType) {
          console.log(`⚠️ Using alternative content type: ${workingType} instead of ${subserviceType}`);
          subserviceType = workingType;
        } else {
          console.log(`❌ No alternative content type found, proceeding with original type`);
        }
      } else if (contentTypeExists === true) {
        console.log(`✅ Content type '${subserviceType}' exists in Drupal`);
      } else {
        console.log(`⚠️ Could not verify content type '${subserviceType}', proceeding anyway...`);
      }

      // Construir el payload para crear el nodo del subservicio
      // Usar la estructura correcta de Drupal REST API como en el ejemplo
      const subservicePayload = {
        type: [{ target_id: subserviceType }],
        title: [{ value: formData.title || "Nuevo subservicio" }],
        status: [{ value: 1 }], // Campo básico requerido
        // Usar campos específicos del formulario si están disponibles
        ...Object.entries(formData).reduce((acc, [fieldKey, fieldValue]) => {
          if (fieldKey.startsWith('field_') && fieldValue !== undefined && fieldValue !== null) {
            if (fieldKey === 'field_path' && typeof fieldValue === 'object' && fieldValue !== null) {
              // Campo de enlace - estructura correcta para Drupal REST API
              const linkValue = fieldValue as { uri: string; title: string };
              acc[fieldKey] = [{ uri: linkValue.uri, title: linkValue.title }];
            } else if (fieldKey === 'field_gender' || fieldKey === 'field_service_path' || fieldKey === 'field_type_service') {
              // Campos de target_id - estructura correcta para Drupal REST API
              acc[fieldKey] = [{ target_id: fieldValue }];
            } else {
              // Campos de valor simple - estructura correcta para Drupal REST API
              acc[fieldKey] = [{ value: fieldValue }];
            }
          }
          return acc;
        }, {} as Record<string, any>)
      };

      console.log("Subservice payload:", subservicePayload);
      console.log("🔍 Subservice type being used:", subserviceType);
      console.log("🔍 Full payload type field:", subservicePayload.type);
      console.log("🔍 Payload type target_id:", subservicePayload.type[0]?.target_id);
      console.log("🔍 Payload type structure:", subservicePayload.type[0]);
      console.log("🔍 Schema fields:", Object.keys(schema.schema));
      console.log("🔍 Form data fields:", Object.keys(formData));
      console.log("🔍 Available schema fields:", Object.entries(schema.schema).map(([key, fieldSchema]) => ({ 
        key, 
        required: (fieldSchema as any).required, 
        type: (fieldSchema as any).type 
      })));
      console.log("API base URL:", api.defaults.baseURL);
      console.log("Full URL:", `${api.defaults.baseURL}/node?_format=json`);

      // Crear el nodo del subservicio usando la instancia de API configurada
      // Intentar primero con JSON:API, luego con Drupal REST API como fallback
      let response;
      
      try {
        // Intentar con JSON:API primero
        console.log("Trying JSON:API endpoint...");
        response = await api.post(`/api/node/${subserviceType}`, {
          data: {
            type: `node--${subserviceType}`,
            attributes: {
              title: formData.title || "Nuevo subservicio",
              // Agregar campos específicos según el schema
              ...Object.entries(schema.schema).reduce((acc, [fieldKey, fieldSchema]) => {
                const typedFieldSchema = fieldSchema as {
                  type: string;
                  label: string;
                  description: string | null;
                  required: boolean;
                  multiple: boolean;
                  title?: number;
                };
                
                if (fieldKey.startsWith('field_') && formData[fieldKey]) {
                  if (typedFieldSchema.type === 'link') {
                    acc[fieldKey] = formData[fieldKey];
                  } else if (typedFieldSchema.type === 'boolean') {
                    acc[fieldKey] = Boolean(formData[fieldKey]);
                  } else {
                    acc[fieldKey] = formData[fieldKey];
                  }
                }
                return acc;
              }, {} as Record<string, any>)
            }
          }
        }, {
          headers: {
            "Content-Type": "application/vnd.api+json",
          },
        });
        console.log("JSON:API request successful");
      } catch (jsonApiError: any) {
        console.log("JSON:API failed, trying Drupal REST API...", jsonApiError.message);
        
        try {
          // Fallback a Drupal REST API
          console.log("🔄 Trying Drupal REST API with payload:", subservicePayload);
          response = await api.post('/node?_format=json', subservicePayload, {
            headers: {
              'Content-Type': 'application/json',
            }
          });
          console.log("✅ Drupal REST API successful");
        } catch (restApiError: any) {
          console.error("Both JSON:API and Drupal REST API failed");
          console.error("JSON:API error:", jsonApiError.message);
          console.error("JSON:API response:", jsonApiError.response?.data);
          console.error("Drupal REST API error:", restApiError.message);
          console.error("Drupal REST API response:", restApiError.response?.data);
          
          // NO crear nodos genéricos con tipos incorrectos
          console.log("❌ Both JSON:API and Drupal REST API failed");
          console.log("❌ Skipping subservice node creation - will create request without subservice detail");
          console.log("⚠️ This is expected behavior when the content type doesn't exist or has validation errors");
          return null;
        }
      }

      // Solo procesar si tenemos una respuesta exitosa
      if (response && response.status && (response.status === 200 || response.status === 201)) {
        console.log("Response status:", response.status);
        console.log("Response data:", response.data);
      } else {
        console.log("⚠️ No valid response received, skipping subservice creation");
        return null;
      }

      // La verificación de status ya se hizo arriba

      const createdSubservice = response.data;
      console.log("Subservice created:", createdSubservice);
      
      return createdSubservice;
    } catch (error: any) {
      console.error("Error creating subservice node:", error);
      
      // Log more detailed error information
      if (error.response) {
        console.error("Error response status:", error.response.status);
        console.error("Error response data:", error.response.data);
        console.error("Error response headers:", error.response.headers);
      } else if (error.request) {
        console.error("Error request:", error.request);
      } else {
        console.error("Error message:", error.message);
      }
      
      // Create a more informative error message
      let errorMessage = "Error al crear el nodo del subservicio";
      if (error.response?.data?.message) {
        errorMessage += `: ${error.response.data.message}`;
      } else if (error.response?.data?.error) {
        errorMessage += `: ${error.response.data.error}`;
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      throw new Error(errorMessage);
    }
  };

  // Formulario con react-hook-form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      applicationNumber: "",
      applicantId: "",
      distributorId: "",
      categoryId: "",
      serviceId: "",
      subserviceId: "",
      serviceCode: "",
      serviceValue: "",
      priorityValue: "",
      estimatedHours: "",
      priorityEstimatedHours: "",
      logisticsCosts: "",
      applicationScore: "1",
      isRecurring: false,
      paymentStatus: "",
      usedChannel: "",
      serviceStatus: "",
      requestStatus: "",
      entryDate: new Date().toISOString().split("T")[0],
      promote: false,
      sticky: false,
    },
  });

  // Cargar datos para los selects
  useEffect(() => {
    if (isOpen) {
      console.log("Modal opened, loading form data...");
      setError(null);
      loadFormData();
      
      // Test node creation endpoints for debugging
      testNodeCreation();
    }
  }, [isOpen]);

  // Cleanup effect para limpiar el estado cuando el modal se cierre
  useEffect(() => {
    if (!isOpen) {
      // Resetear el estado cuando el modal se cierre
      const timer = setTimeout(() => {
        form.reset();
        setError(null);
        setSelectedCategoryId("");
        setSelectedServiceId("");
              setServices([]);
      setSubservices([]);
      setSubserviceSchema(null);
    }, 100);

      return () => clearTimeout(timer);
    }
  }, [isOpen, form]);

  // Effect para limpiar schema cuando cambie el servicio
  useEffect(() => {
    if (selectedServiceId) {
      // Limpiar schema del subservicio cuando cambie el servicio
      setSubserviceSchema(null);
    }
  }, [selectedServiceId]);

  const loadFormData = async () => {
    try {
      console.log("Starting to load form data...");
      setError(null);

      const [
        applicantsData,
        distributorsData,
        categoriesData,
        paymentStatusesData,
        usedChannelsData,
        applicationStatusesData,
      ] = await Promise.all([
        fetchApplicants(),
        fetchDistributors(),
        fetchCategories(),
        fetchPaymentStatuses(),
        fetchUsedChannels(),
        fetchApplicationStatuses(),
      ]);

      // Cargar estados desde la API
      if (paymentStatusesData?.data) {
        setPaymentStatuses(
          paymentStatusesData.data.map((item: any) => ({
            id: item.id,
            name: item.attributes.name,
          }))
        );
      } else {
        console.warn("No payment statuses data found");
        setPaymentStatuses([]);
      }

      if (usedChannelsData?.data) {
        setChannels(
          usedChannelsData.data.map((item: any) => ({
            id: item.id,
            name: item.attributes.name,
          }))
        );
      } else {
        console.warn("No used channels data found");
        setChannels([]);
      }

      if (applicationStatusesData?.data) {
        setServiceStatuses(
          applicationStatusesData.data.map((item: any) => ({
            id: item.id,
            name: item.attributes.name,
          }))
        );

        setRequestStatuses(
          applicationStatusesData.data.map((item: any) => ({
            id: item.id,
            name: item.attributes.name,
          }))
        );
      } else {
        console.warn("No application statuses data found");
        setServiceStatuses([]);
        setRequestStatuses([]);
      }

      // Verificar que el componente siga montado antes de actualizar el estado
      if (applicantsData?.data) {
        setApplicants(
          applicantsData.data.map((item: any) => ({
            id: item.id,
            fullName: item.attributes.field_full_name,
            documentNumber: item.attributes.field_document_number,
          }))
        );
      }

      if (distributorsData?.data) {
        setDistributors(
          distributorsData.data.map((item: any) => ({
            id: item.id,
            title: item.attributes.title,
            documentNumber: item.attributes.field_document_number,
          }))
        );
      }

      if (categoriesData?.categories) {
        console.log("Categories loaded:", categoriesData.categories);
        setCategories(categoriesData.categories);
      } else {
        console.log("No categories data found");
      }

      console.log("Form data loading completed");
    } catch (error) {
      console.error("Error loading form data:", error);
      setError("Error al cargar los datos del formulario");
      toast.error("Error al cargar los datos del formulario");
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (createRequestMutation.isPending) return;

    try {
      let subserviceNodeId = null;

      // Si hay un subservicio seleccionado, crear primero el nodo del subservicio
      if (values.subserviceId) {
        try {
          // Obtener el tipo del subservicio
          const selectedSubservice = subservices.find(s => s.id === values.subserviceId);
          if (selectedSubservice) {
            // Use a content type that we know exists from Postman examples
            const subserviceType = 'request_medication';
            console.log("🔍 Using known working content type:", subserviceType);
            console.log("🔍 Selected subservice name:", selectedSubservice.name);
            console.log("🔍 Creating subservice node for:", subserviceType);
              
              // Crear el nodo del subservicio usando el schema del subservicio
              // Solo incluir campos que existen en el schema
              const subservicePayload: Record<string, any> = {
                title: values.title,
                field_application_number: values.applicationNumber
              };
              
              // Agregar campos del schema del subservicio si están disponibles
              if (subserviceSchema) {
                Object.entries(subserviceSchema.schema).forEach(([fieldKey]) => {
                  if (fieldKey.startsWith('field_') && values[fieldKey as keyof typeof values] !== undefined) {
                    subservicePayload[fieldKey] = values[fieldKey as keyof typeof values];
                  }
                });
              }
              
              console.log("🔍 Using form-based payload:", subservicePayload);
              
              // Transformar el payload a la estructura correcta de Drupal REST API
              // Solo incluir campos que existen en el payload
              const transformedPayload: Record<string, any> = {
                type: [{ target_id: subserviceType }],
                title: [{ value: subservicePayload.title }],
                status: [{ value: 1 }]
              };
              
              // Agregar campos del subservicio con la estructura correcta
              Object.entries(subservicePayload).forEach(([fieldKey, fieldValue]) => {
                if (fieldKey.startsWith('field_') && fieldValue !== undefined && fieldValue !== null) {
                  if (fieldKey === 'field_path' && typeof fieldValue === 'object' && fieldValue !== null) {
                    // Campo de enlace
                    transformedPayload[fieldKey] = [{ uri: fieldValue.uri, title: fieldValue.title }];
                  } else if (fieldKey === 'field_relative_location' && typeof fieldValue === 'string') {
                    // Campo de target_id
                    transformedPayload[fieldKey] = [{ target_id: fieldValue }];
                  } else {
                    // Campo de valor simple
                    transformedPayload[fieldKey] = [{ value: fieldValue }];
                  }
                }
              });
              
              console.log("🔍 Transformed payload for Drupal REST API:", transformedPayload);
              const subserviceNode = await createSubserviceNode(subserviceType, transformedPayload);
              
              console.log("🔍 Subservice node response structure:", subserviceNode);
              console.log("🔍 Subservice node UUID:", subserviceNode?.uuid);
              console.log("🔍 Subservice node NID:", subserviceNode?.nid);
              
              if (subserviceNode && subserviceNode.uuid?.[0]?.value) {
                // Use UUID instead of nid for relationships
                subserviceNodeId = subserviceNode.uuid[0].value;
                console.log("✅ Subservice node created with UUID:", subserviceNodeId);
                console.log("🔍 Created node type:", subserviceNode.type?.[0]?.target_id);
              } else if (subserviceNode && subserviceNode.nid?.[0]?.value) {
                // Fallback to nid if UUID is not available
                subserviceNodeId = subserviceNode.nid[0].value;
                console.log("⚠️ Subservice node created with nid (fallback):", subserviceNodeId);
                console.log("🔍 Created node type:", subserviceNode.type?.[0]?.target_id);
              } else if (subserviceNode === null) {
                console.log("⚠️ Subservice node creation was skipped, continuing without it");
                // Continuar sin el nodo del subservicio
              } else {
                console.log("❌ Subservice node creation failed or returned unexpected format");
                console.log("❌ Expected structure: { uuid: [{ value: '...' }] } or { nid: [{ value: '...' }] }");
                console.log("❌ Actual structure:", JSON.stringify(subserviceNode, null, 2));
              }
          }
        } catch (error) {
          console.error("Error creating subservice node:", error);
          toast.warning("Advertencia: No se pudo crear el nodo del subservicio, pero se continuará con la solicitud");
          // No retornar aquí, continuar con la creación de la solicitud
        }
      }

      // Create a minimal payload first to test
      const payload: CreateRequestPayload = {
        data: {
          type: "node--request",
          attributes: {
            title: values.title,
            field_application_number: values.applicationNumber,
            field_application_score: parseInt(values.applicationScore) || 1,
            field_entry_date: values.entryDate,
            field_estimated_application_hour: values.estimatedHours
              ? parseInt(values.estimatedHours)
              : 1,
            field_estimated_prioritized_hour: values.priorityEstimatedHours && values.priorityEstimatedHours.trim() !== ""
              ? parseInt(values.priorityEstimatedHours)
              : 1,
            field_logistics_costs: values.logisticsCosts && values.logisticsCosts.trim() !== ""
              ? parseFloat(values.logisticsCosts)
              : 0,
            field_service_value: values.serviceValue && values.serviceValue.trim() !== ""
              ? parseFloat(values.serviceValue)
              : 1000,
            field_prioritized_value: values.priorityValue && values.priorityValue.trim() !== ""
              ? parseFloat(values.priorityValue)
              : 1000,
            field_is_recurring: values.isRecurring,
            status: true,
            promote: values.promote,
            sticky: values.sticky,
          },
          relationships: {
            field_applicant: {
              data: { type: "node--profile", id: values.applicantId },
            },
            field_application_statuses: {
              data: {
                type: "taxonomy_term--application_statuses",
                id: values.requestStatus,
              },
            },
            field_service_status: {
              data: {
                type: "taxonomy_term--application_statuses",
                id: values.serviceStatus },
            },
            field_payment_status: {
              data: {
                type: "taxonomy_term--payment_status",
                id: values.paymentStatus,
              },
            },
            field_used_channel: {
              data: {
                type: "taxonomy_term--used_channel",
                id: values.usedChannel,
              },
            },
            ...(values.distributorId && {
              field_distributor_data: {
                data: { type: "node--distributor", id: values.distributorId },
              },
            }),
            ...(values.categoryId && {
              field_category: {
                data: {
                  type: "taxonomy_term--category",
                  id: values.categoryId,
                },
              },
            }),
            ...(values.serviceId && {
              field_service: {
                data: { type: "taxonomy_term--category", id: values.serviceId },
              },
            }),
            ...(values.subserviceId && {
              field_subservice: {
                data: {
                  type: "taxonomy_term--category",
                  id: values.subserviceId,
                },
              },
            }),
            // Si se creó un nodo del subservicio, referenciarlo
            ...(subserviceNodeId && (() => {
              console.log("🔍 Condition met: subserviceNodeId exists, building field_info_service");
              const infoServiceType = `node--${subserviceSchema?.bundle || mapSubserviceNameToType(subservices.find(s => s.id === values.subserviceId)?.name || 'pharmacy_claims')}`;
              console.log("🔍 Building field_info_service with type:", infoServiceType);
              return {
                field_info_service: {
                  data: {
                    type: infoServiceType,
                    id: subserviceNodeId,
                  },
                },
              };
            })()),
          

          },
        },
      };

      console.log("Form values:", values);
      console.log("🔍 Subservice node ID:", subserviceNodeId);
      console.log("🔍 Subservice node ID type:", typeof subserviceNodeId);
      console.log("🔍 Subservice node ID truthy:", !!subserviceNodeId);
      console.log("Subservice schema available:", !!subserviceSchema);
      console.log("Subservice selected:", !!values.subserviceId);
      
      // Log the exact type being sent for field_info_service
      if (subserviceNodeId) {
        const infoServiceType = `node--${subserviceSchema?.bundle || mapSubserviceNameToType(subservices.find(s => s.id === values.subserviceId)?.name || 'pharmacy_claims')}`;
        console.log("🔍 field_info_service type:", infoServiceType);
        console.log("🔍 field_info_service id:", subserviceNodeId);
        console.log("🔍 field_info_service data:", {
          type: infoServiceType,
          id: subserviceNodeId
        });
      }
      
      if (values.subserviceId && !subserviceNodeId) {
        console.log("⚠️ Subservice node creation was skipped - this is expected when the content type doesn't exist");
        console.log("📝 The request will be created without the subservice detail node");
      }
      
      console.log("Priority values:", {
        priorityValue: values.priorityValue,
        priorityEstimatedHours: values.priorityEstimatedHours
      });
      console.log("Priority fields in payload:", {
        field_estimated_prioritized_hour: payload.data.attributes.field_estimated_prioritized_hour,
        field_prioritized_value: payload.data.attributes.field_prioritized_value
      });
      console.log("Logistics costs in payload:", {
        field_logistics_costs: payload.data.attributes.field_logistics_costs,
        originalValue: values.logisticsCosts
      });
      // Verificar que field_info_service esté incluido en el payload
      console.log("🔍 Final payload relationships:", payload.data.relationships);
      console.log("🔍 field_info_service included:", !!payload.data.relationships.field_info_service);
      if (payload.data.relationships.field_info_service) {
        console.log("🔍 field_info_service content:", payload.data.relationships.field_info_service);
      }
      
      console.log("Sending payload:", JSON.stringify(payload, null, 2));

      await createRequestMutation.mutateAsync(payload);

      // Solo cerrar si el componente sigue montado
      if (isOpen) {
        onSuccess();
        onClose();
        form.reset();
      }
    } catch (error: any) {
      console.error("Error creating request:", error);
      toast.error(error.message || "Error al crear la solicitud");
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px] p-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nueva Solicitud
          </DialogTitle>
          <DialogDescription>
            Completa la información para crear una nueva solicitud de servicio
          </DialogDescription>
          {error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="px-6 py-4 space-y-6"
          >
            {/* Campos del formulario */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título *</FormLabel>
                    <FormControl>
                      <Input placeholder="Título de la solicitud" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="applicationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de solicitud *</FormLabel>
                    <FormControl>
                      <Input placeholder="APP-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="applicantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="max-w-[200px]">
                          <SelectValue placeholder="Seleccionar cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-w-[300px]">
                        {applicants.map((applicant) => (
                          <SelectItem
                            key={applicant.id}
                            value={applicant.id}
                            className="truncate"
                          >
                            {applicant.fullName} - {applicant.documentNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="distributorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repartidor</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="max-w-[200px]">
                          <SelectValue placeholder="Seleccionar repartidor (opcional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-w-[300px]">
                        {distributors.map((distributor) => (
                          <SelectItem
                            key={distributor.id}
                            value={distributor.id}
                            className="truncate"
                          >
                            {distributor.title} - {distributor.documentNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Campos de categoría, servicio y subservicio */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                Categoría y Servicios
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría *</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleCategoryChange(value);
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="max-w-[200px]">
                            <SelectValue placeholder="Seleccionar categoría" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-w-[300px]">
                          {categories.map((category) => (
                            <SelectItem
                              key={category.uuid}
                              value={category.uuid}
                              className="truncate"
                            >
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="serviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Servicio *</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleServiceChange(value);
                        }}
                        defaultValue={field.value}
                        disabled={!selectedCategoryId}
                      >
                        <FormControl>
                          <SelectTrigger className="max-w-[200px]">
                            <SelectValue
                              placeholder={
                                selectedCategoryId
                                  ? "Seleccionar servicio"
                                  : "Seleccione categoría primero"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-w-[300px]">
                          {services.map((service) => (
                            <SelectItem
                              key={service.id}
                              value={service.id}
                              className="truncate"
                            >
                              {service.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subserviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subservicio</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleSubserviceChange(value);
                        }}
                        defaultValue={field.value}
                        disabled={!selectedServiceId}
                      >
                        <FormControl>
                          <SelectTrigger className="max-w-[200px]">
                            <SelectValue
                              placeholder={
                                selectedServiceId
                                  ? "Seleccionar subservicio (opcional)"
                                  : "Seleccione servicio primero"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-w-[300px]">
                          {subservices.map((subservice) => (
                            <SelectItem
                              key={subservice.id}
                              value={subservice.id}
                              className="truncate"
                            >
                              {subservice.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Campos de valores y costos */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                Valores y Costos
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="estimatedHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tiempo estimado (horas) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="2"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priorityEstimatedHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Tiempo estimado priorizado (horas) *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="1"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="logisticsCosts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Costos logísticos</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="serviceValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor del servicio</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="150"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priorityValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor priorizado *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          step="0.01"
                          placeholder="200"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isRecurring"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Recurrente</FormLabel>
                        <p className="text-xs text-gray-500">
                          ¿Es una solicitud recurrente?
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Campos de estado y canal */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                Estado y Canal
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="paymentStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado de pago *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="max-w-[200px]">
                            <SelectValue placeholder="Seleccionar estado de pago" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-w-[300px]">
                          {paymentStatuses.map((status) => (
                            <SelectItem
                              key={status.id}
                              value={status.id}
                              className="truncate"
                            >
                              {status.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="usedChannel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Canal usado *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="max-w-[200px]">
                            <SelectValue placeholder="Seleccionar canal" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-w-[300px]">
                          {channels.map((channel) => (
                            <SelectItem
                              key={channel.id}
                              value={channel.id}
                              className="truncate"
                            >
                              {channel.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Gestión de solicitud */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                Gestión de Solicitud
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="serviceStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado del servicio *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="max-w-[200px]">
                            <SelectValue placeholder="Seleccionar estado del servicio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-w-[300px]">
                          {serviceStatuses.map((status) => (
                            <SelectItem
                              key={status.id}
                              value={status.id}
                              className="truncate"
                            >
                              {status.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requestStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado de la solicitud *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="max-w-[200px]">
                            <SelectValue placeholder="Seleccionar estado de la solicitud" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-w-[300px]">
                          {requestStatuses.map((status) => (
                            <SelectItem
                              key={status.id}
                              value={status.id}
                              className="truncate"
                            >
                              {status.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>


            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="entryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de entrada *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="applicationScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calificación inicial *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        placeholder="1-5"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Campos específicos del subservicio */}
            {form.watch('subserviceId') && subserviceSchema ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                  Detalles del Subservicio: {subserviceSchema.label}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {subserviceSchema.description}
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(subserviceSchema.schema).map(([fieldKey, fieldSchema]) => {
                    // Solo mostrar campos que empiecen con "field_"
                    if (!fieldKey.startsWith('field_')) return null;
                    
                    const typedFieldSchema = fieldSchema as {
                      label: string;
                      description: string | null;
                      required: boolean;
                      multiple: boolean;
                      type: string;
                      title?: number;
                    };
                    
                    return (
                      <FormField
                        key={fieldKey}
                        control={form.control}
                        name={fieldKey as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">
                              {typedFieldSchema.label}
                              {typedFieldSchema.required && <span className="text-red-500 ml-1">*</span>}
                            </FormLabel>
                            <FormControl>
                              {typedFieldSchema.type === 'link' ? (
                                <Input
                                  type="url"
                                  placeholder="https://ejemplo.com"
                                  {...field}
                                />
                              ) : typedFieldSchema.type === 'boolean' ? (
                                <Switch
                                  checked={field.value || false}
                                  onCheckedChange={field.onChange}
                                />
                              ) : (
                                <Input
                                  placeholder={`Ingrese ${typedFieldSchema.label.toLowerCase()}`}
                                  {...field}
                                />
                              )}
                            </FormControl>
                            {typedFieldSchema.description && (
                              <p className="text-xs text-gray-500">
                                {typedFieldSchema.description}
                              </p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    );
                  })}
                </div>
              </div>
            ) : form.watch('subserviceId') ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                  ⏳ Cargando campos del subservicio...
                </h3>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    Cargando campos específicos para el subservicio seleccionado...
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                  📋 Selecciona un subservicio para ver campos específicos
                </h3>
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <p className="text-sm text-gray-600">
                    Para ver campos específicos del subservicio, primero selecciona:
                  </p>
                  <ol className="list-decimal list-inside mt-2 text-sm text-gray-600">
                    <li>Una categoría</li>
                    <li>Un servicio</li>
                    <li>Un subservicio</li>
                  </ol>
                  <p className="text-sm text-gray-500 mt-2 italic">
                    Los campos aparecerán automáticamente una vez seleccionado el subservicio.
                  </p>
                </div>
              </div>
            )}

            {/* Campos de configuración */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Configuración de la solicitud
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="promote"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Promocionar</FormLabel>
                        <p className="text-xs text-gray-500">
                          Destacar esta solicitud en la lista principal
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sticky"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Fijar</FormLabel>
                        <p className="text-xs text-gray-500">
                          Mantener esta solicitud siempre visible
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </form>
        </Form>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={createRequestMutation.isPending}
            className="min-w-[120px]"
          >
            {createRequestMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              "Crear Solicitud"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
