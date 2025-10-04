"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";
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
  fetchSubservicesByService,
  fetchServicesByCategory,
} from "../utils/request";
import { fetchCategories } from "@/features/config/utils/category";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { ChevronsUpDown } from "lucide-react";
import { useCreateRequestMutation } from "../hooks/use-request-mutations";
import type { CreateRequestPayload } from "../types/request";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CustomerFormDialog } from "@/features/client/components/customer-dialog";
import { RequiredDot } from "@/components/common/required-dot";

// Función para obtener tipos de archivo aceptados según el subservicio
const getFileAcceptTypes = (bundle?: string): string => {
  const acceptTypes: Record<string, string> = {
    request_medication: "image/jpeg,image/jpg,image/png,application/pdf",
    mail_delivery: "image/jpeg,image/jpg,image/png,application/pdf",
    document_processing: "image/jpeg,image/jpg,image/png,application/pdf",
    civil_records_request: "image/jpeg,image/jpg,image/png,application/pdf",
    marriage_certificate_request:
      "image/jpeg,image/jpg,image/png,application/pdf",
    request_medication_request:
      "image/jpeg,image/jpg,image/png,application/pdf",
    property_deed_copy: "image/jpeg,image/jpg,image/png,application/pdf",
    property_unbundling_request:
      "image/jpeg,image/jpg,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    planos_solicit:
      "image/jpeg,image/jpg,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    property_certification:
      "image/jpeg,image/jpg,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };

  return (
    acceptTypes[bundle || ""] ||
    "image/jpeg,image/jpg,image/png,application/pdf"
  );
};

interface NewRequestModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Applicant {
  id: string;
  fullName: string;
  documentNumber: string;
}

interface SubserviceAttributes {
  name?: string;
  field_schema?: string;
  [key: string]: unknown;
}

interface Subservice {
  id: string;
  name: string;
  attributes?: SubserviceAttributes;
}

interface FieldSchema {
  label: string;
  description: string | null;
  required: boolean;
  multiple: boolean;
  type: string;
  title?: number;
  options?: { label: string; value: string }[];
}

interface SubserviceSchema {
  bundle: string;
  label: string;
  description: string;
  schema: Record<string, FieldSchema>;
}

interface Category {
  uuid: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
}

interface ServiceData {
  id: string;
  name?: string;
  attributes?: {
    name?: string;
  };
}

interface SubserviceData {
  id: string;
  name?: string;
  nombre?: string;
  attributes?: SubserviceAttributes;
}

interface ApplicantData {
  id: string;
  attributes: {
    field_full_name: string;
    field_document_number: string;
  };
}

// Schema base de validación - Solo campos que existen en el formulario
const baseFormSchema = z.object({
  applicationNumber: z.string().optional(),
  applicantId: z.string().min(1, "El cliente es requerido"),
  categoryId: z.string().min(1, "La categoría es requerida"),
  serviceId: z.string().min(1, "El tipo de servicio es requerido"),
  subserviceId: z.string().optional(),
  entryDate: z.string().min(1, "La fecha de entrada es requerida"),
  coverageAreaId: z.string().optional(),
  paymentMethod: z.string().optional(),
  priorityValue: z.boolean().optional(),
});

// Función para crear un schema dinámico que incluye campos de subservicios
const createDynamicFormSchema = (subserviceSchema: SubserviceSchema | null) => {
  if (!subserviceSchema) {
    return baseFormSchema;
  }

  const dynamicFields: Record<string, z.ZodTypeAny> = {};

  Object.entries(subserviceSchema.schema).forEach(([fieldKey, fieldSchema]) => {
    // Solo agregar campos que empiecen con "field_"
    if (!fieldKey.startsWith("field_")) return;

    if (fieldSchema.required) {
      if (
        fieldSchema.type === "image" ||
        fieldSchema.type === "document" ||
        fieldSchema.type === "file"
      ) {
        dynamicFields[fieldKey] = z
          .string()
          .min(1, `${fieldSchema.label} es requerido`);
      } else if (fieldSchema.type === "boolean") {
        dynamicFields[fieldKey] = z.boolean();
      } else if (fieldSchema.type === "date") {
        dynamicFields[fieldKey] = z
          .string()
          .min(1, `${fieldSchema.label} es requerido`);
      } else {
        dynamicFields[fieldKey] = z
          .string()
          .min(1, `${fieldSchema.label} es requerido`);
      }
    } else {
      if (
        fieldSchema.type === "image" ||
        fieldSchema.type === "document" ||
        fieldSchema.type === "file"
      ) {
        dynamicFields[fieldKey] = z.string().optional();
      } else if (fieldSchema.type === "boolean") {
        dynamicFields[fieldKey] = z.boolean().optional();
      } else if (fieldSchema.type === "date") {
        dynamicFields[fieldKey] = z.string().optional();
      } else {
        dynamicFields[fieldKey] = z.string().optional();
      }
    }
  });

  return baseFormSchema.extend(dynamicFields);
};

export function NewRequestModal({
  isOpen,
  onOpenChange,
  onSuccess,
}: NewRequestModalProps) {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [subservices, setSubservices] = useState<Subservice[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [subserviceSchema, setSubserviceSchema] =
    useState<SubserviceSchema | null>(null);

  // Estados para manejar las dependencias entre selects
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");

  // Estado para el modal de crear cliente
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  // Estado para controlar la carga del schema del subservicio
  const [isLoadingSubserviceSchema, setIsLoadingSubserviceSchema] =
    useState(false);

  // Estado para rastrear el último subservicio procesado
  const [lastProcessedSubserviceId, setLastProcessedSubserviceId] = useState<
    string | null
  >(null);

  // Estado para controlar qué archivos se están subiendo
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());

  // Usar el hook de mutación para crear solicitudes
  const createRequestMutation = useCreateRequestMutation();

  // Función para mapear nombres de subservicios a tipos (fallback)
  const mapSubserviceNameToType = useCallback(
    (subserviceName: string): string | null => {
      const mapping: Record<string, string> = {
        //Bogota la mesa o viceversa
        "Reclamo en una (1) o más farmacias": "request_medication",
        "Con evidencia fotográfica": "subservice_photo_evidence",
        "Radicación y sello de recibido": "filing_and_received_stamp",
        //Tramites notariales
        "Solicitud registros civiles": "civil_registry_request",
        "Partidas de matrimonio": "marriage_certificate_request",
        "Partidas de defunción": "death_certificate_request",
        "Copia de escrituras": "deed_copy_request",
        //Tramites Catastrales
        "Solicitudes desenglobes": "property_unbundling_request",
        "Solicitud de planos": "planos_solicit",
        "Certificación de propiedad": "property_certification",

        //corporativos
        "Radicación por sobre": "medical_bills",
        "Radicación por caja": "medical_bills",
        "Por nevera": "clinical_labs_fridge",
        "Por unidad": "collect_envelopes",

        //Chocoperetantico
        "Sobre o paquete": "collect_envelopes",

        //La mesa
        "Diferentes farmacias de la mesa": "request_medication",
        "Diferentes EPS la mesa": "subservice_eps_la_mesa",

        //Otros no asignados
        "Solicitud de citas medicas": "medical_appointment_request",
        //Envio de paquete
        "Envio de paquetes": "package_shipping",
        // Transporte
        "Bogotá-La Mesa o Viceversa": "transport_service",

        "Certificado de solvencia": "property_unbundling_request",
      };

      return mapping[subserviceName] || null;
    },
    []
  );

  // Función para mapear tipos de subservicio a prefijos
  const mapSubserviceTypeToPrefix = useCallback(
    (subserviceType: string): string => {
      const prefixMapping: Record<string, string> = {
        // Escrituras y Propiedades
        property_deed_copy: "ESC",
        property_certification: "ESC",

        // Matrimonio
        marriage_certificate_request: "MAR",

        // Medicamentos y Farmacia
        request_medication: "MED",
        authorizations_claims: "MED",

        // Paquetes y Correspondencia
        mail_delivery: "PKG",
        document_processing: "PKG",

        // Registro Civil
        civil_records_request: "CIV",
        request_medication_request_request: "CIV",

        // Trámites Catastrales
        property_unbundling_request: "CAT",
        planos_solicit: "CAT",

        // Transporte
        transport_service: "TRP",
      };

      return prefixMapping[subserviceType] || "GEN";
    },
    []
  );

  // Función para obtener el prefijo basado en la categoría, servicio o subservicio
  const getPrefixFromHierarchy = useCallback(
    (
      categoryId?: string,
      serviceId?: string,
      subserviceId?: string
    ): string => {
      // Si hay subservicio seleccionado, usar su tipo
      if (subserviceId) {
        const selectedSubservice = subservices.find(
          (s) => s.id === subserviceId
        );
        if (selectedSubservice) {
          const subserviceType = mapSubserviceNameToType(
            selectedSubservice.name
          );
          if (subserviceType) {
            return mapSubserviceTypeToPrefix(subserviceType);
          }
        }
      }

      // Si hay servicio seleccionado, intentar mapear por nombre del servicio
      if (serviceId) {
        const selectedService = services.find((s) => s.id === serviceId);
        if (selectedService) {
          const serviceName = selectedService.name.toLowerCase();
          if (
            serviceName.includes("escritura") ||
            serviceName.includes("propiedad")
          )
            return "ESC";
          if (serviceName.includes("matrimonio")) return "MAR";
          if (
            serviceName.includes("medicamento") ||
            serviceName.includes("farmacia")
          )
            return "MED";
          if (
            serviceName.includes("paquete") ||
            serviceName.includes("correspondencia")
          )
            return "PKG";
          if (serviceName.includes("registro") || serviceName.includes("civil"))
            return "CIV";
          if (
            serviceName.includes("catastral") ||
            serviceName.includes("plano")
          )
            return "CAT";
          if (serviceName.includes("transporte")) return "TRP";
        }
      }

      // Si hay categoría seleccionada, intentar mapear por nombre de la categoría
      if (categoryId) {
        const selectedCategory = categories.find((c) => c.uuid === categoryId);
        if (selectedCategory) {
          const categoryName = selectedCategory.name.toLowerCase();
          if (
            categoryName.includes("escritura") ||
            categoryName.includes("propiedad")
          )
            return "ESC";
          if (categoryName.includes("matrimonio")) return "MAR";
          if (
            categoryName.includes("medicamento") ||
            categoryName.includes("farmacia")
          )
            return "MED";
          if (
            categoryName.includes("paquete") ||
            categoryName.includes("correspondencia")
          )
            return "PKG";
          if (
            categoryName.includes("registro") ||
            categoryName.includes("civil")
          )
            return "CIV";
          if (
            categoryName.includes("catastral") ||
            categoryName.includes("plano")
          )
            return "CAT";
          if (categoryName.includes("transporte")) return "TRP";
        }
      }

      return "GEN"; // Fallback genérico
    },
    [
      subservices,
      services,
      categories,
      mapSubserviceNameToType,
      mapSubserviceTypeToPrefix,
    ]
  );

  // Función para generar ID de solicitud con formato correcto
  const generateRequestId = useCallback(
    (
      categoryId?: string,
      serviceId?: string,
      subserviceId?: string
    ): string => {
      const prefix = getPrefixFromHierarchy(
        categoryId,
        serviceId,
        subserviceId
      );
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hour = String(now.getHours()).padStart(2, "0");
      const minute = String(now.getMinutes()).padStart(2, "0");
      const timestamp = `${year}${month}${day}${hour}${minute}`;
      const randomSuffix = String(Math.floor(Math.random() * 10000)).padStart(
        4,
        "0"
      );

      return `PER-${prefix}-${timestamp}-${randomSuffix}`;
    },
    [getPrefixFromHierarchy]
  );

  // Funciones para manejar cambios en selects dependientes
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedServiceId("");
    form.setValue("serviceId", "");
    form.setValue("subserviceId", "");
    setSubserviceSchema(null);
    setIsLoadingSubserviceSchema(false);
    setLastProcessedSubserviceId(null);

    // Regenerar el número de solicitud con la nueva categoría
    const currentServiceId = form.getValues("serviceId");
    const currentSubserviceId = form.getValues("subserviceId");
    const newRequestId = generateRequestId(
      categoryId,
      currentServiceId,
      currentSubserviceId
    );
    setGeneratedApplicationNumber(newRequestId);

    if (categoryId) {
      loadServicesByCategory(categoryId);
    } else {
      setServices([]);
    }
  };

  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    form.setValue("subserviceId", "");
    setSubserviceSchema(null);
    setIsLoadingSubserviceSchema(false);
    setLastProcessedSubserviceId(null);

    // Regenerar el número de solicitud con el nuevo servicio
    const currentCategoryId = form.getValues("categoryId");
    const currentSubserviceId = form.getValues("subserviceId");
    const newRequestId = generateRequestId(
      currentCategoryId,
      serviceId,
      currentSubserviceId
    );
    setGeneratedApplicationNumber(newRequestId);

    if (serviceId) {
      loadSubservicesByService(serviceId);
    } else {
      setSubservices([]);
    }
  };

  // Función para abrir el modal de crear cliente
  const handleCreateClick = () => {
    setIsCustomerModalOpen(true);
  };

  // Función para manejar el éxito de crear cliente
  const handleCustomerCreated = () => {
    setIsCustomerModalOpen(false);
    // Recargar la lista de clientes usando el cargador existente del formulario
    loadFormData();
  };

  // Función para crear schema por defecto cuando no esté disponible
  const createDefaultSchema = (subserviceType: string): SubserviceSchema => {
    const defaultSchemas: Record<string, SubserviceSchema> = {
      //Bogota la mesa o viceversa
      request_medication: {
        bundle: "request_medication",
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
            label:
              "Adjunta tu orden medica, MIPRES o autorización si es el caso",
            description: "Archivos adjuntos (jpg, jpeg, png, pdf)",
            required: true,
            multiple: true,
            type: "file",
          },
          field_service_path: {
            label: "Trayecto del servicio",
            description: "Trayecto del servicio (Bogotá -> La Mesa, La Mesa)",
            required: false,
            multiple: false,
            type: "select",
            options: [
              {
                value: "188",
                label: "Bogotá -> La Mesa",
              },
              {
                value: "187",
                label: "La Mesa -> Bogotá",
              },
            ],
          },
          field_type_service: {
            label: "Tipo de servicio",
            description: "Tipo de servicio (Normal o Prioritario)",
            required: true,
            multiple: false,
            type: "reference",
            options: [
              {
                value: "189",
                label: "Normal",
              },
              {
                value: "190",
                label: "Prioritario",
              },
            ],
          },
        },
      },

      subservice_photo_evidence: {
        bundle: "subservice_photo_evidence",
        label: "Evidencia fotográfica",
        description: "Información adicional para evidencia fotográfica",
        schema: {
          title: {
            label: "Título",
            description: null,
            required: true,
            multiple: false,
            type: "string",
          },

          field_birth_date: {
            label: "Fecha de nacimiento",
            description: "",
            required: false,
            multiple: false,
            type: "datetime",
          },

          field_gender: {
            label: "Género",
            description: "",
            required: false,
            multiple: false,
            type: "reference", // se renderiza como select
            options: [
              { value: "14", label: "Femenino" },
              { value: "2", label: "Masculino" },
              { value: "15", label: "Otro" },
            ],
          },
          field_package_content_descriptio: {
            label: "Descripción del contenido del paquete",
            description:
              "Diligencie una descripción detallada del contenido del paquete.",
            required: true,
            multiple: false,
            type: "string",
          },
          field_recipient_address: {
            label: "Dirección (Destinatario)",
            description: "Ingrese la dirección completa del destinatario.",
            required: true,
            multiple: false,
            type: "string",
          },
          field_recipient_contact_phone: {
            label: "Teléfono de contacto (Destinatario)",
            description:
              "Ingrese el número de teléfono de contacto del destinatario.",
            required: true,
            multiple: false,
            type: "string",
          },
          field_recipient_full_name: {
            label: "Nombre y apellidos (Destinatario)",
            description:
              "Ingrese el nombre completo de la persona destinataria.",
            required: true,
            multiple: false,
            type: "string",
          },
          field_sender_address: {
            label: "Dirección (Remitente)",
            description: "Ingrese la dirección completa del remitente.",
            required: false,
            multiple: false,
            type: "string",
          },
          field_sender_contact_phone: {
            label: "Teléfono de contacto (Remitente)",
            description:
              "Ingrese el número de teléfono de contacto del remitente.",
            required: true,
            multiple: false,
            type: "string",
          },
          field_sender_full_name: {
            label: "Nombre y apellidos (Remitente)",
            description: "Ingrese el nombre completo de la persona remitente",
            required: true,
            multiple: false,
            type: "string",
          },
        },
      },
      filing_and_received_stamp: {
        bundle: "filing_and_received_stamp",
        label: "Radicación y sello de recibido",
        description:
          "Información adicional para radicación y sello de recibido",
        schema: {
          field_birth_date: {
            label: "Fecha de nacimiento",
            description: "",
            required: false,
            multiple: false,
            type: "datetime",
          },
          field_gender: {
            label: "Género",
            description: "",
            required: false,
            multiple: false,
            type: "reference",
            options: [
              { value: "14", label: "Femenino" },
              { value: "2", label: "Masculino" },
              { value: "15", label: "Otro" },
            ],
          },
          field_package_content_descriptio: {
            label: "Descripción del contenido del paquete",
            description:
              "Diligencie una descripción detallada del contenido del paquete.",
            required: true,
            multiple: false,
            type: "string",
          },
          field_recipient_address: {
            label: "Dirección (Destinatario)",
            description: "Ingrese la dirección completa del destinatario.",
            required: true,
            multiple: false,
            type: "string",
          },
          field_recipient_contact_phone: {
            label: "Teléfono de contacto (Destinatario)",
            description:
              "Ingrese el número de teléfono de contacto del destinatario.",
            required: true,
            multiple: false,
            type: "string",
          },
          field_recipient_full_name: {
            label: "Nombre y apellidos (Destinatario)",
            description:
              "Ingrese el nombre completo de la persona destinataria.",
            required: true,
            multiple: false,
            type: "string",
          },
          field_requires_filing: {
            label: "¿Requiere radicado?",
            description: "Seleccione si el trámite requiere radicado.",
            required: false,
            multiple: false,
            type: "boolean",
          },
          field_sender_address: {
            label: "Dirección (Remitente)",
            description: "Ingrese la dirección completa del remitente.",
            required: true,
            multiple: false,
            type: "string",
          },
          field_sender_contact_phone: {
            label: "Teléfono de contacto (Remitente)",
            description:
              "Ingrese el número de teléfono de contacto del remitente.",
            required: true,
            multiple: false,
            type: "string",
          },
          field_sender_full_name: {
            label: "Nombre y apellidos (Remitente)",
            description: "Ingrese el nombre completo de la persona remitente",
            required: true,
            multiple: false,
            type: "string",
          },
          field_path: {
            label: "URL (Foto de la fórmula médica, de Google Drive)",
            description: "",
            required: false,
            multiple: true,
            type: "link",
            title: 0,
          },
        },
      },
      civil_registry_request: {
        bundle: "civil_registry_request",
        label: "Solicitud de Registros Civiles",
        description:
          "Información adicional para solicitud de registros civiles",
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
            description:
              "Adjunte copia de identidad y otros documentos (jpg, png, pdf)",
            required: false,
            multiple: true,
            type: "file",
          },
        },
      },
      marriage_certificate_request: {
        bundle: "marriage_certificate_request_request",
        label: "Partida de Matrimonio",
        description: "Información adicional para partida de matrimonio",
        schema: {
          field_applicant_id_copy: {
            label: "Copia cédula del solicitante",
            description: "Copia de la cédula de identidad del solicitante",
            required: false,
            multiple: true,
            type: "link",
            title: 1,
          },
          field_marriage_case: {
            label: "Caso matrimonial",
            description: "",
            required: false,
            multiple: false,
            type: "reference",
            options: [
              { value: "203", label: "Divorcio" },
              { value: "204", label: "Sucesión" },
              { value: "205", label: "Volver a casarse" },
            ],
          },
          field_marriage_certificate: {
            label: "Certificado matrimonial",
            description: "",
            required: false,
            multiple: false,
            type: "link",
            title: 1,
          },
          field_marriage_registry: {
            label: "Estado de registro del matrimonio",
            description: "Seleccione el estado de registro del matrimonio.",
            required: false,
            multiple: false,
            type: "reference",
            options: [
              {
                value: "198",
                label: "Fue un matrimonio civil (se registró automáticamente)",
              },
              {
                value: "197",
                label: "No, solo fue ceremonia religiosa (no está registrado)",
              },
              {
                value: "196",
                label:
                  "Sí, ya está registrado (partida de matrimonio registrada)",
              },
            ],
          },
          field_marriage_type: {
            label: "Tipo de partida de matrimonio",
            description:
              "Seleccione el tipo de partida de matrimonio que desea solicitar.",
            required: false,
            multiple: false,
            type: "reference",
            options: [
              { value: "199", label: "Católico" },
              { value: "200", label: "Civil" },
            ],
          },
          field_signed_authorization: {
            label: "Cargue autorización firmada",
            description:
              "Archivo de la autorización firmada para autorizar al repartidor",
            required: true,
            multiple: false,
            type: "link",
            title: 1,
          },
        },
      },
      death_certificate_request: {
        bundle: "death_certificate_request",
        label: "Partida de Defunción",
        description: "Información adicional para partida de defunción",
        schema: {
          field_document_number: {
            label: "Número de documento",
            description:
              "Ingrese el número de documento de la persona fallecida.",
            required: true,
            multiple: false,
            type: "string",
          },

          field_has_original_death_certifi: {
            label: "¿Tiene el certificado de defunción original?",
            description:
              "Indique si cuenta con el certificado de defunción original.",
            required: false,
            multiple: false,
            type: "boolean",
          },

          field_registrant_full_name: {
            label: "Nombre y apellidos (Inscrito)",
            description: "",
            required: true,
            multiple: false,
            type: "string",
          },

          field_registry_serial_number: {
            label: "Número de serial",
            description:
              "Diligencie el número de serial correspondiente al registro civil.",
            required: true,
            multiple: false,
            type: "string",
          },

          field_signed_authorization: {
            label: "Cargue autorización firmada",
            description:
              "Archivo de la autorización firmada para autorizar al repartidor",
            required: true,
            multiple: false,
            type: "link",
          },
        },
      },
      deed_copy_request: {
        bundle: "deed_copy_request",
        label: "Copia de Escrituras",
        description: "Información adicional para copia de escrituras",
        schema: {
          field_applicant_id_copy: {
            label: "Copia cédula del solicitante",
            description: "Copia de la cédula de identidad del solicitante",
            required: false,
            multiple: true,
            type: "link",
          },

          field_deed_city: {
            label: "Ciudad donde está registrada la escritura",
            description:
              "Diligencie la ciudad en la cual está registrada la escritura.",
            required: false,
            multiple: false,
            type: "string",
          },

          field_deed_notary_name: {
            label: "Nombre de la notaría donde se otorgó la escritura",
            description:
              "Diligencie el nombre completo de la notaría donde se otorgó la escritura.",
            required: false,
            multiple: false,
            type: "string",
          },

          field_deed_number_year: {
            label: "Número y año de la escritura",
            description:
              "Diligencie el número y el año correspondientes a la escritura.",
            required: false,
            multiple: false,
            type: "string",
          },

          field_document_number: {
            label: "Número de documento",
            description: "",
            required: true,
            multiple: false,
            type: "string",
          },

          field_is_legal_entity: {
            label: "¿Es persona jurídica?",
            description:
              "Indique si la solicitud corresponde a una persona jurídica.",
            required: false,
            multiple: false,
            type: "boolean",
          },

          field_legal_representation_certi: {
            label: "Certificado de representación legal (Cámara de Comercio)",
            description:
              "Adjunte el certificado de representación legal expedido por la Cámara de Comercio.",
            required: true,
            multiple: false,
            type: "link",
          },

          field_path: {
            label: "URL (Foto de la fórmula médica, de Google Drive)",
            description: "",
            required: false,
            multiple: true,
            type: "link",
          },

          field_signed_authorization: {
            label: "Cargue autorización firmada",
            description:
              "Archivo de la autorización firmada para autorizar al repartidor",
            required: true,
            multiple: false,
            type: "link",
          },
        },
      },
      property_unbundling_request: {
        bundle: "property_unbundling_request",
        label: "Solicitud de Desenglobes",
        description: "Información adicional para solicitud de desenglobes",
        schema: {
          field_applicant_id_copy: {
            label: "Copia cédula del solicitante",
            description: "Copia de la cédula de identidad del solicitante",
            required: false,
            multiple: true,
            type: "link",
          },

          field_cadastral_resolution: {
            label: "Resolución de Catastro (desenglobe)",
            description:
              "Adjunte la resolución expedida por Catastro que aprueba el desenglobe del predio.",
            required: false,
            multiple: false,
            type: "link",
          },

          field_disengagement_deed: {
            label: "disengagement_deed",
            description: "",
            required: false,
            multiple: false,
            type: "link",
          },

          field_document_number: {
            label: "Número de documento",
            description: "",
            required: true,
            multiple: false,
            type: "string",
          },

          field_has_property_plan: {
            label: "¿Cuenta con plano del predio?",
            description: "Indique si dispone del plano del predio.",
            required: false,
            multiple: false,
            type: "boolean",
          },

          field_is_legal_entity: {
            label: "¿Es persona jurídica?",
            description:
              "Indique si la solicitud corresponde a una persona jurídica.",
            required: false,
            multiple: false,
            type: "boolean",
          },

          field_legal_representation_certi: {
            label: "Certificado de representación legal (Cámara de Comercio)",
            description:
              "Adjunte el certificado de representación legal expedido por la Cámara de Comercio.",
            required: true,
            multiple: false,
            type: "link",
          },

          field_neighboring_properties: {
            label: "Relación de predios colindantes",
            description:
              "Adjunte un documento con la relación de los predios colindantes.",
            required: false,
            multiple: false,
            type: "link",
          },

          field_notarial_power: {
            label: "Poder notarial con autorización",
            description:
              "Adjunte el poder notarial registrado que autoriza a la persona a realizar el trámite.",
            required: false,
            multiple: false,
            type: "link",
          },

          field_property_deed_copy: {
            label: "Copia de la escritura",
            description: "Adjunte copia de la escritura correspondiente.",
            required: false,
            multiple: false,
            type: "link",
          },

          field_property_plan: {
            label: "Plano de predio",
            description: "Adjunte el plano del predio.",
            required: false,
            multiple: false,
            type: "link",
          },

          field_property_tax: {
            label: "Copia de impuesto predial (último año)",
            description:
              "Adjunte la copia del impuesto predial correspondiente al último año.",
            required: false,
            multiple: false,
            type: "link",
          },

          field_registry_serial_number: {
            label: "Número de serial",
            description:
              "Diligencie el número de serial correspondiente al registro civil.",
            required: false,
            multiple: false,
            type: "string",
          },

          field_tradition_certificate: {
            label: "Certificado de libertad y tradición",
            description:
              "Adjunte el certificado de libertad y tradición vigente.",
            required: false,
            multiple: false,
            type: "link",
          },
        },
      },
      property_certification: {
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
          },

          field_cadastral_registration: {
            label: "Diligenciar el registro catastral",
            description: "Número del registro catastral del predio",
            required: false,
            multiple: false,
            type: "string",
          },

          field_document_number: {
            label: "Número de documento",
            description: "",
            required: true,
            multiple: false,
            type: "string",
          },

          field_owner_name: {
            label: "Diligenciar nombre del propietario",
            description: "Nombre completo del propietario del predio",
            required: false,
            multiple: false,
            type: "string",
          },

          field_property_deed_copy: {
            label: "Copia de la escritura",
            description: "Adjunte copia de la escritura correspondiente.",
            required: false,
            multiple: false,
            type: "link",
          },

          field_property_number: {
            label: "Diligenciar número de matrícula inmobiliaria",
            description: "Número de matrícula del predio",
            required: false,
            multiple: false,
            type: "string",
          },

          field_property_registered: {
            label: "Cuenta con la matrícula inmobiliaria",
            description: "Indica si el predio tiene matrícula inmobiliaria",
            required: false,
            multiple: false,
            type: "boolean",
          },

          field_registry_notary_number: {
            label: "Número de notaría",
            description:
              "Diligencie el número de la notaría correspondiente al registro civil.",
            required: false,
            multiple: false,
            type: "string",
          },
        },
      },
      medical_bills: {
        bundle: "medical_bills",
        label: "Facturas médicas",
        description: "Información adicional para facturas médicas",
        schema: {
          field_package_content_descriptio: {
            label: "Descripción del contenido del paquete",
            description:
              "Diligencie una descripción detallada del contenido del paquete.",
            required: true,
            multiple: false,
            type: "string",
          },

          field_priority: {
            label: "priority",
            description: "",
            required: false,
            multiple: false,
            type: "boolean",
          },

          field_recipient_address: {
            label: "Dirección (Destinatario)",
            description: "Ingrese la dirección completa del destinatario.",
            required: true,
            multiple: false,
            type: "string",
          },

          field_recipient_contact_phone: {
            label: "Teléfono de contacto (Destinatario)",
            description:
              "Ingrese el número de teléfono de contacto del destinatario.",
            required: true,
            multiple: false,
            type: "string",
          },

          field_recipient_full_name: {
            label: "Nombre y apellidos (Destinatario)",
            description:
              "Ingrese el nombre completo de la persona destinataria.",
            required: true,
            multiple: false,
            type: "string",
          },

          field_sender_address: {
            label: "Dirección (Remitente)",
            description: "Ingrese la dirección completa del remitente.",
            required: true,
            multiple: false,
            type: "string",
          },

          field_sender_contact_phone: {
            label: "Teléfono de contacto (Remitente)",
            description:
              "Ingrese el número de teléfono de contacto del remitente.",
            required: true,
            multiple: false,
            type: "string",
          },

          field_sender_full_name: {
            label: "Nombre y apellidos (Remitente)",
            description: "Ingrese el nombre completo de la persona remitente",
            required: true,
            multiple: false,
            type: "string",
          },
        },
      },
      clinical_labs_fridge: {
        bundle: "clinical_labs_fridge",
        label: "Laboratorios clínicos por nevera",
        description: "Información adicional para laboratorios clínicos",
        schema: {
          field_delivery_address: {
            label: "Dirección de entrega",
            description: "Dirección de entrega",
            required: false,
            multiple: false,
            type: "string",
          },

          field_document_number: {
            label: "Número de documento",
            description: "",
            required: true,
            multiple: false,
            type: "string",
          },

          field_lab_name: {
            label: "Nombre del laboratorio",
            description: "Nombre completo del laboratorio",
            required: true,
            multiple: false,
            type: "string",
          },

          field_lab_registration_code: {
            label: "Laboratorio cuenta con código de registro destinatario",
            description: "",
            required: false,
            multiple: false,
            type: "string",
          },

          field_recipient_full_name: {
            label: "Nombre y apellidos (Destinatario)",
            description:
              "Ingrese el nombre completo de la persona destinataria.",
            required: true,
            multiple: false,
            type: "string",
          },

          field_sender_full_name: {
            label: "Nombre y apellidos (Remitente)",
            description: "Ingrese el nombre completo de la persona remitente",
            required: true,
            multiple: false,
            type: "string",
          },
        },
      },
      collect_envelopes: {
        bundle: "collect_envelopes",
        label: "Recgoger sobres por unidad",
        description: "Información adicional para recoger sobres por unidad",
        schema: {
          field_sender_address: {
            label: "Dirección (Remitente)",
            description: "Ingrese la dirección completa del remitente.",
            required: true,
            multiple: false,
            type: "string",
          },

          field_sender_contact_phone: {
            label: "Teléfono de contacto (Remitente)",
            description:
              "Ingrese el número de teléfono de contacto del remitente.",
            required: true,
            multiple: false,
            type: "string",
          },

          field_sender_full_name: {
            label: "Nombre y apellidos (Remitente)",
            description: "Ingrese el nombre completo de la persona remitente",
            required: true,
            multiple: false,
            type: "string",
          },
        },
      },
      subservice_eps_la_mesa: {
        bundle: "subservice_eps_la_mesa",
        label: "Diferentes EPS la mesa",
        description: "Información adicional para diferentes EPS la mesa",
        schema: {
          field_address: {
            label: "Dirección de residencia",
            description: "Dirección y barrio, Dirección completa",
            required: false,
            multiple: false,
            type: "string",
          },

          field_eps: {
            label: "EPS",
            description: "",
            required: true,
            multiple: false,
            type: "string",
          },

          field_patient_id_number: {
            label: "Número de cédula de paciente",
            description: "Número de identificación del paciente",
            required: false,
            multiple: false,
            type: "string",
          },

          field_patient_name_order: {
            label: "Nombre de paciente orden médica",
            description: "Nombre del paciente de la orden médica a autorizar",
            required: false,
            multiple: false,
            type: "string",
          },

          field_phone_number: {
            label: "Teléfono de contacto",
            description: "",
            required: true,
            multiple: false,
            type: "tel",
          },

          field_registrant_full_name: {
            label: "Nombre y apellidos (Inscrito)",
            description: "",
            required: true,
            multiple: false,
            type: "string",
          },

          field_signed_authorization: {
            label: "Cargue autorización firmada",
            description:
              "Archivo de la autorización firmada para autorizar al repartidor",
            required: false,
            multiple: false,
            type: "link",
            title: 1,
          },

          field_upload_medical_history: {
            label: "Cargar historia clínica",
            description: "Archivo de la historia clínica del paciente",
            required: false,
            multiple: false,
            type: "link",
            title: 1,
          },

          field_upload_medical_order: {
            label: "Cargar orden médica para autorizar",
            description: "Orden médica que se requiere autorizar",
            required: false,
            multiple: false,
            type: "link",
            title: 1,
          },
        },
      },
      medical_appointment_request: {
        bundle: "medical_appointment_request",
        label: "Solicitud de Citas médicas",
        description: "Información adicional para solicitud de citas médicas",
        schema: {
          field_address: {
            label: "Dirección de residencia",
            description: "",
            required: false,
            multiple: false,
            type: "string",
          },

          field_current_availability: {
            label: "Disponibilidad actual",
            description: "",
            required: false,
            multiple: false,
            type: "boolean",
          },

          field_document_number: {
            label: "Número de documento",
            description: "",
            required: true,
            multiple: false,
            type: "string",
          },

          field_eps: {
            label: "EPS",
            description: "",
            required: true,
            multiple: false,
            type: "string",
          },

          field_patient_name_order: {
            label: "Nombre de paciente orden médica",
            description: "Nombre del paciente de la orden médica a autorizar",
            required: false,
            multiple: false,
            type: "string",
          },

          field_phone_number: {
            label: "Teléfono de contacto",
            description: "",
            required: true,
            multiple: false,
            type: "tel",
          },

          field_registrant_full_name: {
            label: "Nombre y apellidos (Inscrito)",
            description: "",
            required: true,
            multiple: false,
            type: "string",
          },

          field_signed_authorization: {
            label: "Cargue autorización firmada",
            description:
              "Archivo de la autorización firmada para autorizar al repartidor",
            required: true,
            multiple: false,
            type: "link",
            title: 1,
          },
        },
      },
    };

    return (
      defaultSchemas[subserviceType] || {
        bundle: subserviceType,
        label: `Subservicio ${subserviceType}`,
        description: `Información adicional para ${subserviceType}`,
        schema: {
          field_general_info: {
            label: "Información general",
            description: "Información general del subservicio",
            required: false,
            multiple: false,
            type: "string",
          },
          field_notes: {
            label: "Notas adicionales",
            description: "Notas o comentarios adicionales sobre el subservicio",
            required: false,
            multiple: false,
            type: "string",
          },
          field_documents: {
            label: "Documentos relacionados",
            description: "Enlaces a documentos relacionados con el subservicio",
            required: false,
            multiple: true,
            type: "link",
            title: 1,
          },
        },
      }
    );
  };

  // Función para cargar servicios por categoría
  const loadServicesByCategory = async (categoryId: string) => {
    try {
      const servicesData = await fetchServicesByCategory(categoryId);

      if (servicesData?.services) {
        const mappedServices = servicesData.services.map(
          (service: ServiceData) => ({
            id: service.id,
            name: service.attributes?.name || service.name || "Sin nombre",
          })
        );
        setServices(mappedServices);

        // Regenerar el número de solicitud con la nueva categoría
        const currentServiceId = form.getValues("serviceId");
        const currentSubserviceId = form.getValues("subserviceId");
        const newRequestId = generateRequestId(
          categoryId,
          currentServiceId,
          currentSubserviceId
        );
        setGeneratedApplicationNumber(newRequestId);
      } else {
        setServices([]);
      }
    } catch {
      setServices([]);
    }
  };

  // Función para cargar subservicios por servicio
  const loadSubservicesByService = async (serviceId: string) => {
    try {
      const subservicesData = await fetchSubservicesByService(serviceId);

      if (subservicesData?.subservices) {
        const mappedSubservices = subservicesData.subservices.map(
          (subservice: SubserviceData) => ({
            id: subservice.id,
            name:
              subservice.attributes?.name ||
              subservice.name ||
              subservice.nombre ||
              "Sin nombre",
            attributes: subservice.attributes,
          })
        );
        setSubservices(mappedSubservices);

        // Regenerar el número de solicitud con el nuevo servicio
        const currentCategoryId = form.getValues("categoryId");
        const currentSubserviceId = form.getValues("subserviceId");
        const newRequestId = generateRequestId(
          currentCategoryId,
          serviceId,
          currentSubserviceId
        );
        setGeneratedApplicationNumber(newRequestId);
      } else {
        setSubservices([]);
      }
    } catch {
      setSubservices([]);
    }
  };

  // Memoizar el schema para evitar recreaciones innecesarias
  const memoizedSchema = useMemo(() => {
    return createDynamicFormSchema(subserviceSchema);
  }, [subserviceSchema]);

  // Estado para el número de aplicación que se regenera según la jerarquía
  const [generatedApplicationNumber, setGeneratedApplicationNumber] = useState(
    () => generateRequestId()
  );

  // Formulario con react-hook-form
  const form = useForm({
    resolver: zodResolver(memoizedSchema),
    mode: "onSubmit", // Solo validar al enviar
    reValidateMode: "onSubmit", // Solo re-validar al enviar
    defaultValues: {
      applicationNumber: generatedApplicationNumber,
      applicantId: "",
      categoryId: "",
      serviceId: "",
      subserviceId: "",
      entryDate: new Date().toLocaleDateString("en-CA"), // Formato YYYY-MM-DD en zona horaria local
      coverageAreaId: "",
      paymentMethod: "",
      priorityValue: false,
    },
  });

  // Función para manejar cambios en el subservicio
  const handleSubserviceChange = useCallback(
    async (subserviceId: string, forceReload = false) => {
      if (!forceReload && subserviceId === lastProcessedSubserviceId) {
        return;
      }

      if (subserviceId) {
        setIsLoadingSubserviceSchema(true);
        setLastProcessedSubserviceId(subserviceId);

        try {
          const selectedSubservice = subservices.find(
            (s) => s.id === subserviceId
          );

          if (selectedSubservice) {
            const subserviceType = mapSubserviceNameToType(
              selectedSubservice.name
            );

            // Regenerar el número de solicitud con la jerarquía actual
            const currentCategoryId = form.getValues("categoryId");
            const currentServiceId = form.getValues("serviceId");
            const newRequestId = generateRequestId(
              currentCategoryId,
              currentServiceId,
              subserviceId
            );
            setGeneratedApplicationNumber(newRequestId);

            if (subserviceType) {
              const defaultSchema = createDefaultSchema(subserviceType);
              setSubserviceSchema(defaultSchema);
            } else {
              const genericSchema = createDefaultSchema("generic");
              setSubserviceSchema(genericSchema);
            }
          }
        } catch {
          const genericSchema = createDefaultSchema("generic");
          setSubserviceSchema(genericSchema);
        } finally {
          setIsLoadingSubserviceSchema(false);
        }
      } else {
        setSubserviceSchema(null);
        setIsLoadingSubserviceSchema(false);
        setLastProcessedSubserviceId(null);
        // Regenerar con la jerarquía actual cuando no hay subservicio
        const currentCategoryId = form.getValues("categoryId");
        const currentServiceId = form.getValues("serviceId");
        const newRequestId = generateRequestId(
          currentCategoryId,
          currentServiceId
        );
        setGeneratedApplicationNumber(newRequestId);
      }
    },
    [
      subservices,
      lastProcessedSubserviceId,
      generateRequestId,
      mapSubserviceNameToType,
      form,
    ]
  );

  // Actualizar el formulario cuando cambie el número generado
  useEffect(() => {
    form.setValue("applicationNumber", generatedApplicationNumber);
  }, [generatedApplicationNumber, form]);

  // Limpiar errores cuando cambie el schema del subservicio
  useEffect(() => {
    if (subserviceSchema) {
      // Solo limpiar errores relacionados con campos de subservicio
      const subserviceFields = Object.keys(subserviceSchema.schema);
      subserviceFields.forEach((fieldKey) => {
        if (form.formState.errors[fieldKey]) {
          form.clearErrors(fieldKey);
        }
      });
    }
  }, [subserviceSchema, form]);

  // Cargar datos para los selects
  useEffect(() => {
    if (isOpen) {
      setError(null);
      loadFormData();
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
        setIsLoadingSubserviceSchema(false);
        setLastProcessedSubserviceId(null);
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

  // Effect para mantener el schema cuando hay un subservicio seleccionado - SIMPLIFICADO
  useEffect(() => {
    const currentSubserviceId = form.getValues("subserviceId");

    if (
      currentSubserviceId &&
      !subserviceSchema &&
      !isLoadingSubserviceSchema
    ) {
      handleSubserviceChange(currentSubserviceId, true);
    }
  }, [
    subserviceSchema,
    isLoadingSubserviceSchema,
    handleSubserviceChange,
    form,
  ]);

  const loadFormData = async () => {
    try {
      setError(null);

      const [applicantsResult, categoriesResult] = await Promise.allSettled([
        fetchApplicants(),
        fetchCategories(),
      ]);

      const applicantsData =
        applicantsResult.status === "fulfilled" ? applicantsResult.value : null;
      const categoriesData =
        categoriesResult.status === "fulfilled" ? categoriesResult.value : null;

      // Cargar solicitantes
      if (applicantsData?.data) {
        setApplicants(
          applicantsData.data.map((item: ApplicantData) => ({
            id: item.id,
            fullName: item.attributes.field_full_name,
            documentNumber: item.attributes.field_document_number,
          }))
        );
      }

      // Cargar categorías
      if (categoriesData?.categories) {
        setCategories(categoriesData.categories);
      }
    } catch {
      setError("Error al cargar los datos del formulario");
      toast.error("Error al cargar los datos del formulario");
    }
  };

  const onSubmit = async (values: Record<string, unknown>) => {
    if (createRequestMutation.isPending) {
      return;
    }

    // Validación básica
    if (!values.applicantId || !values.categoryId || !values.serviceId) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    try {
      // Usar el número de aplicación generado
      const applicationNumber = generatedApplicationNumber;

      // Crear la solicitud principal directamente

      // Recopilar campos dinámicos del subservicio para incluir en la solicitud principal
      const dynamicSubserviceAttributes: Record<string, unknown> = {};

      if (subserviceSchema?.schema) {
        Object.keys(subserviceSchema.schema).forEach((fieldKey) => {
          if (fieldKey.startsWith("field_")) {
            const fieldValue = (values as Record<string, unknown>)[fieldKey];

            if (
              fieldValue !== undefined &&
              fieldValue !== null &&
              fieldValue !== ""
            ) {
              dynamicSubserviceAttributes[fieldKey] = fieldValue;
            }
          }
        });
      }

      const payload: CreateRequestPayload = {
        data: {
          type: "node--request",
          attributes: {
            title: applicationNumber,
            field_application_number: applicationNumber,
            field_application_score: 4,
            field_entry_date: values.entryDate as string,
            field_estimated_application_hour: 0,
            field_logistics_costs: 0,
            field_service_value: 0,
            status: true,
            promote: false,
            sticky: false,
            // Incluir campos dinámicos del subservicio en la solicitud principal
            ...dynamicSubserviceAttributes,
          },
          relationships: {
            field_applicant: {
              data: {
                type: "node--profile",
                id: values.applicantId as string,
              },
            },
            field_application_statuses: {
              data: {
                type: "taxonomy_term--application_statuses",
                id: "24d38208-a645-4cca-a0c8-a460bce4453a", // ID válido de estado
              },
            },
            field_service_status: {
              data: {
                type: "taxonomy_term--application_statuses",
                id: "2aa93128-20bb-4262-bf30-f53d7e9af052", // ID válido de estado
              },
            },
            field_subservice: {
              data: {
                type: "taxonomy_term--category",
                id: values.subserviceId as string,
              },
            },
          },
        },
      };

      await createRequestMutation.mutateAsync(payload);

      if (isOpen) {
        onOpenChange(false);

        requestAnimationFrame(() => {
          onSuccess();
          form.reset();
        });
      }
    } catch (error: unknown) {
      const apiError = error as { message: string };
      toast.error(apiError.message || "Error al crear la solicitud");
    }
  };

  const handleOpenChangeWrapper = (open: boolean) => {
    if (!open) {
      // Dejar que el componente padre maneje el cambio de estado
      onOpenChange(false);
    } else {
      onOpenChange(true);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChangeWrapper}>
        <DialogContent className="sm:max-w-[700px] p-0 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Nueva Solicitud
            </DialogTitle>
            <DialogDescription>
              Bienvenido, completa la información para crear una nueva solicitud
              de servicio.
            </DialogDescription>
            {error && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(
                (data) => onSubmit(data),
                (errors) => {
                  const errorCount = Object.keys(errors).length;

                  if (errorCount === 1) {
                    const firstError = Object.values(errors)[0];
                    if (
                      firstError &&
                      typeof firstError === "object" &&
                      "message" in firstError
                    ) {
                      toast.error(firstError.message as string);
                    } else {
                      toast.error("Por favor completa el campo requerido");
                    }
                  } else {
                    toast.error(
                      `Por favor completa ${errorCount} campos requeridos`
                    );
                  }
                }
              )}
              className="px-6 py-4 space-y-6"
            >
              {/* Campos del formulario */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="entryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Fecha de entrada <RequiredDot />
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} required />
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
                      <FormLabel>Número de solicitud</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled
                          className="bg-gray-50 text-gray-600 cursor-not-allowed"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Cliente */}
              <div className="flex items-center gap-2">
                <FormField
                  control={form.control}
                  name="applicantId"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Cliente</FormLabel>

                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between h-10 text-gray-500 font-normal"
                            >
                              {field.value
                                ? applicants.find((a) => a.id === field.value)
                                    ?.fullName
                                : "Seleccionar cliente"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>

                        <PopoverContent
                          className="w-[400px] p-0"
                          align="start" // 👈 se alinea al inicio del botón
                          side="bottom" // 👈 abre debajo, no flotando raro
                        >
                          <Command>
                            {/* 🔹 Input de búsqueda */}
                            <CommandInput
                              placeholder="Buscar cliente..."
                              className="h-10 border-b px-3"
                            />

                            {/* 🔹 Lista con scroll si hay muchos clientes */}
                            <CommandList className="max-h-60 overflow-y-auto">
                              <CommandEmpty>
                                No se encontraron clientes.
                              </CommandEmpty>
                              <CommandGroup>
                                {applicants.map((applicant) => (
                                  <CommandItem
                                    key={applicant.id}
                                    value={applicant.fullName} // 👈 importante: aquí va el texto que filtra
                                    onSelect={() =>
                                      field.onChange(applicant.id)
                                    }
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {applicant.fullName}
                                      </span>
                                      <span className="text-sm text-muted-foreground">
                                        {applicant.documentNumber}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="button"
                  className="w-10 h-10 mt-5"
                  onClick={handleCreateClick}
                >
                  <Plus />
                </Button>
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

              {/* Campos específicos del subservicio */}
              {form.watch("subserviceId") &&
              !isLoadingSubserviceSchema &&
              subserviceSchema ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                    Detalles del Subservicio: {subserviceSchema.label}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {subserviceSchema.description}
                  </p>

                  {/* Campos regulares (no archivos) */}
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(subserviceSchema.schema)
                      .filter(([fieldKey, fieldSchema]) => {
                        // Solo mostrar campos que empiecen con "field_" y NO sean archivos
                        if (!fieldKey.startsWith("field_")) return false;
                        const typedFieldSchema = fieldSchema as {
                          type: string;
                        };
                        return (
                          typedFieldSchema.type !== "file" &&
                          typedFieldSchema.type !== "document"
                        );
                      })
                      .map(([fieldKey, fieldSchema]) => {
                        const typedFieldSchema = fieldSchema as {
                          label: string;
                          description: string | null;
                          required: boolean;
                          multiple: boolean;
                          type: string;
                          title?: number;
                          options?: Array<{ value: string; label: string }>;
                        };

                        return (
                          <FormField
                            key={fieldKey}
                            control={form.control}
                            name={fieldKey as string}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">
                                  {typedFieldSchema.label}
                                  {typedFieldSchema.required && (
                                    <span className="text-red-500 ml-1">*</span>
                                  )}
                                </FormLabel>
                                <FormControl>
                                  {typedFieldSchema.type === "link" ? (
                                    <Input
                                      type="url"
                                      placeholder="https://ejemplo.com"
                                      {...field}
                                    />
                                  ) : typedFieldSchema.type === "boolean" ? (
                                    <Switch
                                      checked={field.value || false}
                                      onCheckedChange={field.onChange}
                                    />
                                  ) : typedFieldSchema.type === "select" ? (
                                    <Select
                                      value={field.value || ""}
                                      onValueChange={field.onChange}
                                    >
                                      <SelectTrigger>
                                        <SelectValue
                                          placeholder={`Seleccione ${typedFieldSchema.label.toLowerCase()}`}
                                        />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {typedFieldSchema.options?.map(
                                          (option: {
                                            value: string;
                                            label: string;
                                          }) => (
                                            <SelectItem
                                              key={option.value}
                                              value={option.value}
                                            >
                                              {option.label}
                                            </SelectItem>
                                          )
                                        )}
                                      </SelectContent>
                                    </Select>
                                  ) : typedFieldSchema.type === "reference" ? (
                                    <Select
                                      value={field.value || ""}
                                      onValueChange={field.onChange}
                                    >
                                      <SelectTrigger>
                                        <SelectValue
                                          placeholder={`Seleccione ${typedFieldSchema.label.toLowerCase()}`}
                                        />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {typedFieldSchema.options?.map(
                                          (option: {
                                            value: string;
                                            label: string;
                                          }) => (
                                            <SelectItem
                                              key={option.value}
                                              value={option.value}
                                            >
                                              {option.label}
                                            </SelectItem>
                                          )
                                        )}
                                      </SelectContent>
                                    </Select>
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

                  {/* Campos de archivos (siempre al final) */}
                  {Object.entries(subserviceSchema.schema).some(
                    ([fieldKey, fieldSchema]) => {
                      if (!fieldKey.startsWith("field_")) return false;
                      const typedFieldSchema = fieldSchema as {
                        type: string;
                      };
                      return (
                        typedFieldSchema.type === "file" ||
                        typedFieldSchema.type === "document"
                      );
                    }
                  ) && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        {Object.entries(subserviceSchema.schema)
                          .filter(([fieldKey, fieldSchema]) => {
                            // Solo mostrar campos que empiecen con "field_" y sean archivos
                            if (!fieldKey.startsWith("field_")) return false;
                            const typedFieldSchema = fieldSchema as {
                              type: string;
                            };
                            return (
                              typedFieldSchema.type === "file" ||
                              typedFieldSchema.type === "document"
                            );
                          })
                          .map(([fieldKey, fieldSchema]) => {
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
                                name={fieldKey as string}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm font-medium">
                                      {typedFieldSchema.label}
                                      {typedFieldSchema.required && (
                                        <span className="text-red-500 ml-1">
                                          *
                                        </span>
                                      )}
                                    </FormLabel>
                                    <FormControl>
                                      <div className="space-y-2">
                                        <label
                                          htmlFor={fieldKey}
                                          className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 cursor-pointer hover:border-muted-foreground/50 transition"
                                        >
                                          <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                          <p className="text-sm text-muted-foreground mb-2 text-center">
                                            Haga clic para subir o arrastre el
                                            archivo aquí
                                          </p>

                                          <Input
                                            id={fieldKey}
                                            name={fieldKey}
                                            type="file"
                                            className="hidden"
                                            multiple={typedFieldSchema.multiple}
                                            accept={getFileAcceptTypes(
                                              subserviceSchema?.bundle
                                            )}
                                            disabled={
                                              uploadingFiles.has(fieldKey) ||
                                              (field.value !== undefined &&
                                                field.value !== "")
                                            }
                                            onChange={async (e) => {
                                              const file = e.target.files?.[0];
                                              if (file) {
                                                try {
                                                  // 🔹 Validar tamaño (5MB)
                                                  if (
                                                    file.size >
                                                    5 * 1024 * 1024
                                                  ) {
                                                    toast.error(
                                                      "El archivo es demasiado grande. Máximo 5MB."
                                                    );
                                                    return;
                                                  }

                                                  // 🔹 Validar tipos permitidos
                                                  const allowedTypes =
                                                    getFileAcceptTypes(
                                                      subserviceSchema?.bundle
                                                    ).split(",");
                                                  const isValidType =
                                                    allowedTypes.some(
                                                      (type) =>
                                                        file.type ===
                                                        type.trim()
                                                    );

                                                  if (!isValidType) {
                                                    const typeNames =
                                                      allowedTypes
                                                        .map((type) => {
                                                          const cleanType =
                                                            type.trim();
                                                          if (
                                                            cleanType.includes(
                                                              "jpeg"
                                                            ) ||
                                                            cleanType.includes(
                                                              "jpg"
                                                            )
                                                          )
                                                            return "JPEG";
                                                          if (
                                                            cleanType.includes(
                                                              "png"
                                                            )
                                                          )
                                                            return "PNG";
                                                          if (
                                                            cleanType.includes(
                                                              "pdf"
                                                            )
                                                          )
                                                            return "PDF";
                                                          if (
                                                            cleanType.includes(
                                                              "msword"
                                                            )
                                                          )
                                                            return "DOC";
                                                          if (
                                                            cleanType.includes(
                                                              "officedocument"
                                                            )
                                                          )
                                                            return "DOCX";
                                                          return cleanType;
                                                        })
                                                        .filter(
                                                          (
                                                            value,
                                                            index,
                                                            self
                                                          ) =>
                                                            self.indexOf(
                                                              value
                                                            ) === index
                                                        );

                                                    toast.error(
                                                      `Tipo de archivo no permitido: ${
                                                        file.type
                                                      }. Solo se permiten: ${typeNames.join(
                                                        ", "
                                                      )}`
                                                    );
                                                    return;
                                                  }

                                                  // 🔹 Marcar como subiendo
                                                  setUploadingFiles((prev) =>
                                                    new Set(prev).add(fieldKey)
                                                  );
                                                  toast.loading(
                                                    `Procesando ${
                                                      typedFieldSchema.type ===
                                                      "document"
                                                        ? "documento"
                                                        : "imagen"
                                                    }...`,
                                                    { id: fieldKey }
                                                  );

                                                  // Simular una URL (funcionalidad de upload pendiente)
                                                  const fileUrl = `https://ejemplo.com/archivos/${file.name}`;
                                                  field.onChange(fileUrl);

                                                  toast.success(
                                                    `${
                                                      typedFieldSchema.type ===
                                                      "document"
                                                        ? "Documento"
                                                        : "Imagen"
                                                    } procesado exitosamente`,
                                                    { id: fieldKey }
                                                  );
                                                } catch (error: unknown) {
                                                  const errorMessage =
                                                    error instanceof Error
                                                      ? error.message
                                                      : `Error al subir ${
                                                          typedFieldSchema.type ===
                                                          "document"
                                                            ? "el documento"
                                                            : "la imagen"
                                                        }`;
                                                  toast.error(errorMessage, {
                                                    id: fieldKey,
                                                  });
                                                  e.target.value = "";
                                                } finally {
                                                  setUploadingFiles((prev) => {
                                                    const newSet = new Set(
                                                      prev
                                                    );
                                                    newSet.delete(fieldKey);
                                                    return newSet;
                                                  });
                                                }
                                              }
                                            }}
                                          />
                                        </label>

                                        {/* Estado: subiendo */}
                                        {uploadingFiles.has(fieldKey) && (
                                          <div className="mt-2">
                                            <div className="w-32 h-32 bg-blue-100 border border-blue-300 rounded flex items-center justify-center">
                                              <div className="text-center">
                                                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                                                <div className="text-blue-600 text-sm font-medium mt-2">
                                                  Subiendo...
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {/* Estado: archivo cargado */}
                                        {field.value &&
                                          !uploadingFiles.has(fieldKey) && (
                                            <div className="mt-2">
                                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                                <div className="flex items-center gap-2">
                                                  <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                                                    <svg
                                                      className="w-4 h-4 text-blue-600"
                                                      fill="none"
                                                      stroke="currentColor"
                                                      viewBox="0 0 24 24"
                                                    >
                                                      <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                      />
                                                    </svg>
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-gray-900 truncate">
                                                      {field.value
                                                        ? "Archivo subido"
                                                        : "Archivo adjunto"}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                      {typedFieldSchema.type ===
                                                      "document"
                                                        ? "Documento"
                                                        : typedFieldSchema.type ===
                                                          "link"
                                                        ? "Archivo"
                                                        : "Imagen"}{" "}
                                                      subido
                                                    </div>
                                                  </div>
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      field.onChange("");
                                                      const input =
                                                        document.querySelector(
                                                          `input[type="file"][name="${fieldKey}"]`
                                                        ) as HTMLInputElement;
                                                      if (input)
                                                        input.value = "";
                                                    }}
                                                    className="text-red-600 hover:text-red-800 p-1"
                                                    title="Eliminar archivo"
                                                  >
                                                    <svg
                                                      className="w-4 h-4"
                                                      fill="none"
                                                      stroke="currentColor"
                                                      viewBox="0 0 24 24"
                                                    >
                                                      <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M6 18L18 6M6 6l12 12"
                                                      />
                                                    </svg>
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                      </div>
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
                  )}
                </div>
              ) : form.watch("subserviceId") && isLoadingSubserviceSchema ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                    ⏳ Cargando campos del subservicio...
                  </h3>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700">
                      Cargando campos específicos para el subservicio
                      seleccionado...
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
                      Para ver campos específicos del subservicio, primero
                      selecciona:
                    </p>
                    <ol className="list-decimal list-inside mt-2 text-sm text-gray-600">
                      <li>Una categoría</li>
                      <li>Un servicio</li>
                      <li>Un subservicio</li>
                    </ol>
                    <p className="text-sm text-gray-500 mt-2 italic">
                      Los campos aparecerán automáticamente una vez seleccionado
                      el subservicio.
                    </p>
                  </div>
                  {/* Gestión de solicitud */}
                </div>
              )}
              <div className="space-y-4 ">
                <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                  Gestión de Solicitud
                </h3>
                <p>Seleccione los ajustes de su solicitud</p>

                <div className="grid grid-cols-2 gap-4">
                  {/* Selección de método de pago */}
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Método de pago</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione un método" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tarjeta">
                                Tarjeta de crédito/débito
                              </SelectItem>
                              <SelectItem value="online">
                                Pago en línea
                              </SelectItem>
                              <SelectItem value="transferencia">
                                Transferencia bancaria
                              </SelectItem>
                              <SelectItem value="efectivo">Efectivo</SelectItem>
                            </SelectContent>
                          </Select>
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
                        <FormLabel>Solicitud prioritaria</FormLabel>

                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <p className="text-xs text-gray-500">
                          ¿Es una solicitud prioritaria?
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              {/* Botones del formulario */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
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
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal para crear cliente */}
      <CustomerFormDialog
        isOpen={isCustomerModalOpen}
        onOpenChange={setIsCustomerModalOpen}
        mode="create"
        onCancel={() => setIsCustomerModalOpen(false)}
        onSuccess={handleCustomerCreated}
      />
    </>
  );
}

export default NewRequestModal;
