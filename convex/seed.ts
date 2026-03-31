import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

type FieldConfig = {
  name: string;
  code: string;
  type: string;
  order: number;
  description?: string;
  options?: any;
};

type ServiceSeedConfig = {
  name: string;
  code: string;
  description?: string;
  price: number;
  hasPriority?: boolean;
  priorityPrice?: number;
  estimatedHours?: number;
  priorityHours?: number;
  fields: FieldConfig[];
};

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    // 1. Roles
    const roles = ["Administrador", "Repartidor", "Solicitante"];
    const roleIds = new Map();
    
    for (const name of roles) {
      const existing = await ctx.db
        .query("roles")
        .withIndex("by_name", (q) => q.eq("name", name))
        .first();
        
      if (!existing) {
        const id = await ctx.db.insert("roles", { name });
        roleIds.set(name, id);
      } else {
        roleIds.set(name, existing._id);
      }
    }

    // 2. Services Data
    const services: ServiceSeedConfig[] = [
      {
        name: "Certificado de Propiedad",
        code: "property_certification",
        description: "Solicitud de certificado de propiedad",
        price: 40000,
        hasPriority: true,
        priorityPrice: 80000,
        estimatedHours: 24,
        priorityHours: 8,
        fields: [
          { name: "Cuenta con la matrícula inmobiliaria", code: "field_property_registered", type: "Boolean", order: 10, description: "Indique si el predio cuenta con matrícula inmobiliaria registrada." },
          { name: "Número de matrícula inmobiliaria", code: "field_property_number", type: "Text", order: 20, description: "Número único de identificación de la matrícula inmobiliaria." },
          { name: "Registro catastral", code: "field_cadastral_registration", type: "Text", order: 30, description: "Código o número del registro catastral del predio." },
          { name: "URL documento identificación", code: "field_path", type: "File", order: 40, description: "Cargue una copia digital del documento de identificación." },
          { name: "Observaciones", code: "field_observations", type: "Text", order: 50, description: "Información adicional o detalles relevantes para el trámite." }
        ]
      },
      {
        name: "Solicitud Desenglobe",
        code: "property_unbundling_request",
        description: "Solicitud de desenglobe de propiedad",
        price: 40000,
        hasPriority: true,
        priorityPrice: 80000,
        estimatedHours: 24,
        priorityHours: 8,
        fields: [
          { name: "Razón social / Nombre", code: "field_full_name", type: "Text", order: 10, description: "Nombre completo de la persona o razón social de la empresa." },
          { name: "Teléfono de contacto", code: "field_phone_number", type: "Text", order: 20, description: "Número de teléfono para contacto directo." },
          { name: "Folio de matrícula inmobiliaria", code: "field_registry_serial_number", type: "Text", order: 30, description: "Número de folio de la matrícula inmobiliaria." },
          { name: "Copia impuesto predial", code: "field_property_tax", type: "File", order: 40, description: "Copia del recibo o comprobante del impuesto predial." },
          { name: "Copia de la escritura", code: "field_property_deed_copy", type: "File", order: 50, description: "Copia de la escritura pública del predio." },
          { name: "Escritura de desenglobe", code: "field_disengagement_deed", type: "File", order: 60, description: "Documento de la escritura de desenglobe." },
          { name: "Certificado representación legal", code: "field_legal_representation_certi", type: "File", order: 70, description: "Certificado vigente de representación legal." },
          { name: "Certificado de libertad y tradición", code: "field_tradition_certificate", type: "File", order: 80, description: "Certificado de libertad y tradición reciente." },
          { name: "Copia cédula del solicitante", code: "field_applicant_id_copy", type: "File", order: 90, description: "Copia del documento de identidad del solicitante." },
          { name: "Plano del predio", code: "field_property_plan", type: "File", order: 100, description: "Plano oficial o levantamiento topográfico del predio." },
          { name: "Poder notarial", code: "field_notarial_power", type: "File", order: 110, description: "Documento de poder notarial si aplica." },
          { name: "Relación de predios colindantes", code: "field_neighboring_properties", type: "File", order: 120, description: "Documento con la relación de los predios colindantes." },
          { name: "Resolución de Catastro", code: "field_cadastral_resolution", type: "File", order: 130, description: "Resolución emitida por la oficina de catastro." },
          { name: "Ciudad de la escritura", code: "field_deed_city", type: "Text", order: 140, description: "Ciudad donde se encuentra registrada la escritura." }
        ]
      },
      {
        name: "Partida de Matrimonio",
        code: "marriage_certificate_request",
        description: "Solicitud de partida de matrimonio",
        price: 40000,
        hasPriority: true,
        priorityPrice: 80000,
        estimatedHours: 24,
        priorityHours: 8,
        fields: [
          { name: "Tipo de matrimonio", code: "field_marriage_type", type: "Select", order: 10, options: { items: [{ value: "civil", label: "Civil" }, { value: "catolico", label: "Católico" }, { value: "otro", label: "Otro" }] }, description: "Seleccione el tipo de matrimonio celebrado." },
          { name: "Registro en Registraduría/Notaría", code: "field_marriage_registry", type: "Select", order: 20, options: { items: [{ value: "notaria", label: "Notaría" }, { value: "registraduria", label: "Registraduría" }] }, description: "Lugar donde se encuentra registrado el matrimonio." },
          { name: "Motivo de la solicitud", code: "field_marriage_case", type: "Select", order: 30, options: { items: [{ value: "caso1", label: "Caso 1" }, { value: "caso2", label: "Caso 2" }] }, description: "Seleccione el motivo específico de la solicitud." },
          { name: "Autorización firmada", code: "field_signed_authorization", type: "File", order: 40, description: "Documento de autorización firmado por los implicados." },
          { name: "Copia cédula del solicitante", code: "field_applicant_id_copy", type: "File", order: 50, description: "Copia del documento de identidad del solicitante." },
          { name: "Certificado de matrimonio", code: "field_marriage_certificate", type: "File", order: 60, description: "Copia o referencia del certificado de matrimonio." },
          { name: "Observaciones", code: "field_observations", type: "Text", order: 70, description: "Detalles adicionales sobre la solicitud." }
        ]
      },
      {
        name: "Partida de Defunción",
        code: "death_certificate_request",
        description: "Solicitud de partida de defunción",
        price: 40000,
        hasPriority: true,
        priorityPrice: 80000,
        estimatedHours: 24,
        priorityHours: 8,
        fields: [
          { name: "Motivo de la solicitud", code: "field_reason_the_request", type: "Text", order: 10, description: "Motivo por el cual solicita la partida de defunción." },
          { name: "Documento base", code: "field_base_document", type: "File", order: 20, description: "Documento base para la búsqueda del registro." },
          { name: "Notaría", code: "field_deed_notary_name", type: "Text", order: 30, description: "Nombre de la notaría donde se registró la defunción." },
          { name: "Ciudad de registro", code: "field_deed_city", type: "Text", order: 40, description: "Ciudad donde se realizó el registro de defunción." },
          { name: "Número y año de la escritura", code: "field_deed_number_year", type: "Text", order: 50, description: "Número de escritura y año de registro." }
        ]
      },
      {
        name: "Cert. Entrega Agua",
        code: "water_sample_fridge",
        description: "Certificado de entrega de muestras de agua",
        price: 26000,
        hasPriority: true,
        priorityPrice: 80000,
        estimatedHours: 24,
        priorityHours: 8,
        fields: [
          { name: "Prioridad", code: "field_priority", type: "Boolean", order: 10, description: "Indique si el envío requiere prioridad alta." },
          { name: "Servicio de agua", code: "field_water_service", type: "Select", order: 20, options: { items: [{ value: "por_nevera", label: "Por nevera" }, { value: "radicacion_por_caja", label: "Radicación por caja" }] }, description: "Seleccione el tipo de servicio de entrega de agua." },
          { name: "Nombre remitente", code: "field_sender_full_name", type: "Text", order: 30, description: "Nombre completo de quien envía la muestra." },
          { name: "Teléfono remitente", code: "field_sender_contact_phone", type: "Text", order: 40, description: "Teléfono de contacto del remitente." },
          { name: "Dirección remitente", code: "field_sender_address", type: "Text", order: 50, description: "Dirección física donde se recoge la muestra." },
          { name: "Nombre destinatario", code: "field_recipient_full_name", type: "Text", order: 60, description: "Nombre completo del destinatario." },
          { name: "Fecha de nacimiento", code: "field_birth_date", type: "Date", order: 70, description: "Fecha de nacimiento del destinatario (si aplica)." },
          { name: "Descripción del contenido", code: "field_package_content_descriptio", type: "Text", order: 80, description: "Descripción detallada del contenido del paquete." },
          { name: "URL soporte", code: "field_path", type: "File", order: 90, description: "Documento de soporte o guía de envío." },
          { name: "¿Requiere radicado?", code: "field_requires_radicado", type: "Boolean", order: 100, description: "Indique si requiere número de radicado." },
          { name: "Observaciones", code: "field_observations", type: "Text", order: 110, description: "Instrucciones especiales para la entrega." }
        ]
      },
      {
        name: "Envío de Correspondencia",
        code: "correspondence_delivery",
        description: "Servicio de envío de correspondencia",
        price: 30000,
        hasPriority: true,
        priorityPrice: 80000,
        estimatedHours: 24,
        priorityHours: 8,
        fields: [
          { name: "Nombre remitente", code: "field_sender_full_name", type: "Text", order: 10, description: "Nombre completo del remitente." },
          { name: "Teléfono remitente", code: "field_sender_contact_phone", type: "Text", order: 20, description: "Teléfono de contacto del remitente." },
          { name: "Dirección remitente", code: "field_sender_address", type: "Text", order: 30, description: "Dirección completa de recogida." },
          { name: "Nombre destinatario", code: "field_recipient_full_name", type: "Text", order: 40, description: "Nombre completo del destinatario." },
          { name: "Dirección destinatario", code: "field_recipient_address", type: "Text", order: 50, description: "Dirección completa de entrega." },
          { name: "Teléfono destinatario", code: "field_recipient_contact_phone", type: "Text", order: 60, description: "Teléfono de contacto del destinatario." },
          { name: "Fecha de nacimiento", code: "field_birth_date", type: "Date", order: 70, description: "Fecha de nacimiento (si es requerido)." },
          { name: "Contenido del paquete", code: "field_package_content_descriptio", type: "Text", order: 80, description: "Detalle del contenido del envío." },
          { name: "URL soporte", code: "field_path", type: "File", order: 90, description: "Documento adjunto o soporte del envío." },
          { name: "¿Requiere radicado?", code: "field_requires_radicado", type: "Boolean", order: 100, description: "¿Se requiere generar un radicado?" },
          { name: "Observaciones", code: "field_observations", type: "Text", order: 110, description: "Observaciones adicionales para el mensajero." }
        ]
      },
      {
        name: "Solicitud de Medicamentos",
        code: "medication_request",
        description: "Solicitud de medicamentos",
        price: 40000,
        hasPriority: true,
        priorityPrice: 100000,
        estimatedHours: 24,
        priorityHours: 8,
        fields: [
          { name: "EPS", code: "field_eps", type: "Text", order: 10, description: "Nombre de la EPS a la que está afiliado." },
          { name: "Droguería", code: "field_drugstore", type: "Text", order: 20, description: "Nombre de la droguería o farmacia." },
          { name: "Observaciones", code: "field_observations", type: "Text", order: 30, description: "Indicaciones sobre los medicamentos solicitados." },
          { name: "URL soporte", code: "field_path", type: "File", order: 40, description: "Fórmula médica o documento de autorización." }
        ]
      },
      {
        name: "Registro Civil",
        code: "civil_registry_request",
        description: "Datos del registro civil",
        price: 40000,
        hasPriority: true,
        priorityPrice: 80000,
        estimatedHours: 24,
        priorityHours: 8,
        fields: [
          { name: "Nombre y apellidos (Inscrito)", code: "field_registrant_full_name", type: "Text", order: 10, description: "Nombre completo de la persona inscrita." },
          { name: "¿Tiene número de registro?", code: "field_has_registration_number", type: "Boolean", order: 20, description: "¿Cuenta con el número de registro civil?" },
          { name: "Número de serial", code: "field_registry_serial_number", type: "Text", order: 30, description: "Número de serial del registro." },
          { name: "Nombre de la notaría", code: "field_deed_notary_name", type: "Text", order: 40, description: "Nombre de la notaría de registro." },
          { name: "Tomo", code: "field_registry_tome_number", type: "Text", order: 50, description: "Número de tomo del registro." },
          { name: "Folio", code: "field_registry_folio_number", type: "Text", order: 60, description: "Número de folio del registro." }
        ]
      },
      {
        name: "Alquila Pere Tantico",
        code: "rent_service",
        description: "Servicio de alquiler Pere Tantico",
        price: 100000,
        fields: [
          { name: "Tipo de cliente", code: "field_client_type", type: "Select", order: 10, options: { items: [{ value: "persona_natural", label: "Persona Natural" }, { value: "empresa", label: "Empresa" }] }, description: "Tipo de cliente (Persona Natural o Empresa)." },
          { name: "Nombre y apellidos", code: "field_full_name", type: "Text", order: 20, description: "Nombre completo del solicitante." },
          { name: "Teléfono de contacto", code: "field_phone_number", type: "Text", order: 30, description: "Número de teléfono de contacto." },
          { name: "Dirección de recogida / inicio", code: "field_pickup_address", type: "Text", order: 40, description: "Dirección donde inicia el servicio." },
          { name: "¿Qué debe realizar el repartidor?", code: "field_observations", type: "Text", order: 50, description: "Instrucciones de lo que debe realizar el repartidor." },
          { name: "Tiempo solicitado (minutos)", code: "field_time_requested", type: "Number", order: 60, description: "Tiempo estimado del servicio en minutos." }
        ]
      },
      {
        name: "Copia de Escrituras",
        code: "deed_copy_request",
        description: "Solicitud de copia de escrituras",
        price: 40000,
        hasPriority: true,
        priorityPrice: 80000,
        estimatedHours: 24,
        priorityHours: 8,
        fields: [
          { name: "Ciudad de la escritura", code: "field_deed_city", type: "Text", order: 10, description: "Ciudad donde está registrada la escritura." },
          { name: "URL documento", code: "field_path", type: "File", order: 20, description: "Documento de referencia o soporte." },
          { name: "Observaciones", code: "field_observations", type: "Text", order: 30, description: "Observaciones sobre la escritura solicitada." }
        ]
      },
      {
        name: "Certificado Libertad y Tradición",
        code: "tradition_certificate_request",
        description: "Solicitud de certificado de libertad y tradición",
        price: 48000,
        fields: [
          { name: "Número de matrícula inmobiliaria", code: "field_property_number", type: "Text", order: 10, description: "Número de matrícula inmobiliaria." },
          { name: "Certificado de libertad y tradición", code: "field_tradition_certificate", type: "File", order: 20, description: "Archivo de referencia si se tiene." }
        ]
      },
      {
        name: "Certificado Representación Legal",
        code: "legal_representation_certificate",
        description: "Solicitud certificado de representación legal",
        price: 42000,
        fields: [{ name: "Certificado de representación legal", code: "field_legal_representation_certi", type: "File", order: 10, description: "Documento o datos del certificado solicitado." }]
      },
      {
        name: "Plano de Predio",
        code: "property_plan_request",
        description: "Solicitud de plano de predio",
        price: 40000,
        hasPriority: true,
        priorityPrice: 80000,
        estimatedHours: 24,
        priorityHours: 8,
        fields: [{ name: "Plano del predio", code: "field_property_plan", type: "File", order: 10, description: "Información o archivo del plano del predio." }]
      },
      {
        name: "Poder Notarial",
        code: "notarial_power_request",
        description: "Solicitud de poder notarial",
        price: 55000,
        fields: [{ name: "Poder notarial", code: "field_notarial_power", type: "File", order: 10, description: "Documento o datos del poder notarial." }]
      }
    ];

    for (const s of services) {
        const existingService = await ctx.db
            .query("services")
            .withIndex("by_code", (q) => q.eq("code", s.code))
            .first();

        let serviceId: Id<"services">;
        if (existingService) {
            serviceId = existingService._id;
            await ctx.db.patch(serviceId, {
                name: s.name,
                description: s.description ?? undefined,
                price: s.price,
                hasPriority: s.hasPriority ?? false,
                priorityPrice: s.priorityPrice,
                estimatedHours: s.estimatedHours,
                priorityHours: s.priorityHours,
                status: true,
            });
            
            // Delete existing fields to re-seed them
            const existingFields = await ctx.db
                .query("serviceFields")
                .withIndex("by_service", (q) => q.eq("serviceId", serviceId))
                .collect();
            for (const f of existingFields) {
                await ctx.db.delete(f._id);
            }
        } else {
            serviceId = await ctx.db.insert("services", {
                name: s.name,
                code: s.code,
                description: s.description ?? undefined,
                price: s.price,
                hasPriority: s.hasPriority ?? false,
                priorityPrice: s.priorityPrice,
                estimatedHours: s.estimatedHours,
                priorityHours: s.priorityHours,
                status: true,
            });
        }

        for (const f of s.fields) {
            await ctx.db.insert("serviceFields", {
                serviceId,
                name: f.name,
                code: f.code,
                description: f.description ?? undefined,
                type: f.type,
                required: false,
                multiple: false,
                order: f.order,
                options: f.options,
                status: true,
            });
        }
    }
    
    // 3. Transportation Types (Dummy data)
    const transportTypes = ["Moto", "Carro", "Bicicleta"];
    for (const name of transportTypes) {
        const existing = await ctx.db.query("transportationTypes").filter(q => q.eq(q.field("name"), name)).first();
        if (!existing) {
            await ctx.db.insert("transportationTypes", { name, status: true });
        }
    }

    // 4. Coverage Areas (Dummy data)
    const areas = ["Norte", "Sur", "Este", "Oeste", "Centro"];
    for (const name of areas) {
        const existing = await ctx.db.query("coverageAreas").filter(q => q.eq(q.field("name"), name)).first();
        if (!existing) {
            await ctx.db.insert("coverageAreas", { name, status: true });
        }
    }

    return "Seed completed successfully";
  }
});
