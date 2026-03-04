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
        price: 50000,
        fields: [
          { name: "Cuenta con la matrícula inmobiliaria", code: "field_property_registered", type: "Boolean", order: 10 },
          { name: "Número de matrícula inmobiliaria", code: "field_property_number", type: "Text", order: 20 },
          { name: "Registro catastral", code: "field_cadastral_registration", type: "Text", order: 30 },
          { name: "URL documento identificación", code: "field_path", type: "File", order: 40 },
          { name: "Observaciones", code: "field_observations", type: "Text", order: 50 }
        ]
      },
      {
        name: "Solicitud Desenglobe",
        code: "property_unbundling_request",
        description: "Solicitud de desenglobe de propiedad",
        price: 80000,
        fields: [
          { name: "Razón social / Nombre", code: "field_full_name", type: "Text", order: 10 },
          { name: "Teléfono de contacto", code: "field_phone_number", type: "Text", order: 20 },
          { name: "Folio de matrícula inmobiliaria", code: "field_registry_serial_number", type: "Text", order: 30 },
          { name: "Copia impuesto predial", code: "field_property_tax", type: "File", order: 40 },
          { name: "Copia de la escritura", code: "field_property_deed_copy", type: "File", order: 50 },
          { name: "Escritura de desenglobe", code: "field_disengagement_deed", type: "File", order: 60 },
          { name: "Certificado representación legal", code: "field_legal_representation_certi", type: "File", order: 70 },
          { name: "Certificado de libertad y tradición", code: "field_tradition_certificate", type: "File", order: 80 },
          { name: "Copia cédula del solicitante", code: "field_applicant_id_copy", type: "File", order: 90 },
          { name: "Plano del predio", code: "field_property_plan", type: "File", order: 100 },
          { name: "Poder notarial", code: "field_notarial_power", type: "File", order: 110 },
          { name: "Relación de predios colindantes", code: "field_neighboring_properties", type: "File", order: 120 },
          { name: "Resolución de Catastro", code: "field_cadastral_resolution", type: "File", order: 130 },
          { name: "Ciudad de la escritura", code: "field_deed_city", type: "Text", order: 140 }
        ]
      },
      {
        name: "Partida de Matrimonio",
        code: "marriage_certificate_request",
        description: "Solicitud de partida de matrimonio",
        price: 35000,
        fields: [
          { name: "Tipo de matrimonio", code: "field_marriage_type", type: "Select", order: 10, options: { items: [{ value: "civil", label: "Civil" }, { value: "catolico", label: "Católico" }, { value: "otro", label: "Otro" }] } },
          { name: "Registro en Registraduría/Notaría", code: "field_marriage_registry", type: "Select", order: 20, options: { items: [{ value: "notaria", label: "Notaría" }, { value: "registraduria", label: "Registraduría" }] } },
          { name: "Motivo de la solicitud", code: "field_marriage_case", type: "Select", order: 30, options: { items: [{ value: "caso1", label: "Caso 1" }, { value: "caso2", label: "Caso 2" }] } },
          { name: "Autorización firmada", code: "field_signed_authorization", type: "File", order: 40 },
          { name: "Copia cédula del solicitante", code: "field_applicant_id_copy", type: "File", order: 50 },
          { name: "Certificado de matrimonio", code: "field_marriage_certificate", type: "File", order: 60 },
          { name: "Observaciones", code: "field_observations", type: "Text", order: 70 }
        ]
      },
      {
        name: "Partida de Defunción",
        code: "death_certificate_request",
        description: "Solicitud de partida de defunción",
        price: 35000,
        fields: [
          { name: "Motivo de la solicitud", code: "field_reason_the_request", type: "Text", order: 10 },
          { name: "Documento base", code: "field_base_document", type: "File", order: 20 },
          { name: "Notaría", code: "field_deed_notary_name", type: "Text", order: 30 },
          { name: "Ciudad de registro", code: "field_deed_city", type: "Text", order: 40 },
          { name: "Número y año de la escritura", code: "field_deed_number_year", type: "Text", order: 50 }
        ]
      },
      {
        name: "Cert. Entrega Agua",
        code: "water_sample_fridge",
        description: "Certificado de entrega de muestras de agua",
        price: 28000,
        fields: [
          { name: "Prioridad", code: "field_priority", type: "Boolean", order: 10 },
          { name: "Servicio de agua", code: "field_water_service", type: "Select", order: 20, options: { items: [{ value: "por_nevera", label: "Por nevera" }, { value: "radicacion_por_caja", label: "Radicación por caja" }] } },
          { name: "Nombre remitente", code: "field_sender_full_name", type: "Text", order: 30 },
          { name: "Teléfono remitente", code: "field_sender_contact_phone", type: "Text", order: 40 },
          { name: "Dirección remitente", code: "field_sender_address", type: "Text", order: 50 },
          { name: "Nombre destinatario", code: "field_recipient_full_name", type: "Text", order: 60 },
          { name: "Fecha de nacimiento", code: "field_birth_date", type: "Date", order: 70 },
          { name: "Descripción del contenido", code: "field_package_content_descriptio", type: "Text", order: 80 },
          { name: "URL soporte", code: "field_path", type: "File", order: 90 },
          { name: "¿Requiere radicado?", code: "field_requires_radicado", type: "Boolean", order: 100 },
          { name: "Observaciones", code: "field_observations", type: "Text", order: 110 }
        ]
      },
      {
        name: "Envío de Correspondencia",
        code: "correspondence_delivery",
        description: "Servicio de envío de correspondencia",
        price: 25000,
        fields: [
          { name: "Nombre remitente", code: "field_sender_full_name", type: "Text", order: 10 },
          { name: "Teléfono remitente", code: "field_sender_contact_phone", type: "Text", order: 20 },
          { name: "Dirección remitente", code: "field_sender_address", type: "Text", order: 30 },
          { name: "Nombre destinatario", code: "field_recipient_full_name", type: "Text", order: 40 },
          { name: "Dirección destinatario", code: "field_recipient_address", type: "Text", order: 50 },
          { name: "Teléfono destinatario", code: "field_recipient_contact_phone", type: "Text", order: 60 },
          { name: "Fecha de nacimiento", code: "field_birth_date", type: "Date", order: 70 },
          { name: "Contenido del paquete", code: "field_package_content_descriptio", type: "Text", order: 80 },
          { name: "URL soporte", code: "field_path", type: "File", order: 90 },
          { name: "¿Requiere radicado?", code: "field_requires_radicado", type: "Boolean", order: 100 },
          { name: "Observaciones", code: "field_observations", type: "Text", order: 110 }
        ]
      },
      {
        name: "Solicitud de Medicamentos",
        code: "medication_request",
        description: "Solicitud de medicamentos",
        price: 32000,
        fields: [
          { name: "EPS", code: "field_eps", type: "Text", order: 10 },
          { name: "Droguería", code: "field_drugstore", type: "Text", order: 20 },
          { name: "Observaciones", code: "field_observations", type: "Text", order: 30 },
          { name: "URL soporte", code: "field_path", type: "File", order: 40 }
        ]
      },
      {
        name: "Registro Civil",
        code: "civil_registry_request",
        description: "Datos del registro civil",
        price: 45000,
        fields: [
          { name: "Nombre y apellidos (Inscrito)", code: "field_registrant_full_name", type: "Text", order: 10 },
          { name: "¿Tiene número de registro?", code: "field_has_registration_number", type: "Boolean", order: 20 },
          { name: "Número de serial", code: "field_registry_serial_number", type: "Text", order: 30 },
          { name: "Nombre de la notaría", code: "field_deed_notary_name", type: "Text", order: 40 },
          { name: "Tomo", code: "field_registry_tome_number", type: "Text", order: 50 },
          { name: "Folio", code: "field_registry_folio_number", type: "Text", order: 60 }
        ]
      },
      {
        name: "Alquila Pere Tantico",
        code: "rent_service",
        description: "Servicio de alquiler Pere Tantico",
        price: 90000,
        fields: [
          { name: "Tipo de cliente", code: "field_client_type", type: "Select", order: 10, options: { items: [{ value: "persona_natural", label: "Persona Natural" }, { value: "empresa", label: "Empresa" }] } },
          { name: "Nombre y apellidos", code: "field_full_name", type: "Text", order: 20 },
          { name: "Teléfono de contacto", code: "field_phone_number", type: "Text", order: 30 },
          { name: "Dirección de recogida / inicio", code: "field_pickup_address", type: "Text", order: 40 },
          { name: "¿Qué debe realizar el repartidor?", code: "field_observations", type: "Text", order: 50 },
          { name: "Tiempo solicitado (minutos)", code: "field_time_requested", type: "Number", order: 60 }
        ]
      },
      {
        name: "Copia de Escrituras",
        code: "deed_copy_request",
        description: "Solicitud de copia de escrituras",
        price: 60000,
        fields: [
          { name: "Ciudad de la escritura", code: "field_deed_city", type: "Text", order: 10 },
          { name: "URL documento", code: "field_path", type: "File", order: 20 },
          { name: "Observaciones", code: "field_observations", type: "Text", order: 30 }
        ]
      },
      {
        name: "Certificado Libertad y Tradición",
        code: "tradition_certificate_request",
        description: "Solicitud de certificado de libertad y tradición",
        price: 48000,
        fields: [
          { name: "Número de matrícula inmobiliaria", code: "field_property_number", type: "Text", order: 10 },
          { name: "Certificado de libertad y tradición", code: "field_tradition_certificate", type: "File", order: 20 }
        ]
      },
      {
        name: "Certificado Representación Legal",
        code: "legal_representation_certificate",
        description: "Solicitud certificado de representación legal",
        price: 42000,
        fields: [{ name: "Certificado de representación legal", code: "field_legal_representation_certi", type: "File", order: 10 }]
      },
      {
        name: "Plano de Predio",
        code: "property_plan_request",
        description: "Solicitud de plano de predio",
        price: 75000,
        fields: [{ name: "Plano del predio", code: "field_property_plan", type: "File", order: 10 }]
      },
      {
        name: "Poder Notarial",
        code: "notarial_power_request",
        description: "Solicitud de poder notarial",
        price: 55000,
        fields: [{ name: "Poder notarial", code: "field_notarial_power", type: "File", order: 10 }]
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
