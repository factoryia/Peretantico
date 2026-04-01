import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { WorkflowConfig } from "./system/requestFlow";

// ============================================
// RESET DATABASE - Borra todos los datos
// ============================================
export const reset = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Lista de tablas a borrar (orden importante por dependencias)
    const tables = [
      "requestShareLinks",
      "botSessions",
      "botApplicants",
      "conversations",
      "ycloudHandoffs",
      "ycloudMessages",
      "ycloudProcessingLocks",
      "ycloudProcessedEvents",
      "paymentRequests",
      "payments",
      "requestData",
      "requests",
      "attachments",
      "serviceFields",
      "services",
      "distributors",
      "coverageAreas",
      "transportationTypes",
      "specialDates",
      "profiles",
      "userRoles",
      "roles",
      // Auth tables - estas se borran con precaución
      "userVerificationCodes",
      "userInvitations",
      "users",
    ];

    let totalDeleted = 0;
    for (const tableName of tables) {
      try {
        // Convex no tiene delete all, hay que iterar y borrar cada documento
        const docs = await (ctx.db.query as any)(tableName).collect();
        let deleted = 0;
        for (const doc of docs) {
          await ctx.db.delete(doc._id);
          deleted++;
        }
        console.log(`Tabla ${tableName}: ${deleted} documentos eliminados`);
        totalDeleted += deleted;
      } catch (e: any) {
        // Tabla puede no existir - omitir
        console.log(`Tabla ${tableName}: omitida (puede no existir)`);
      }
    }

    return `✅ Base de datos reseteada. ${totalDeleted} documentos eliminados.`;
  }
});

// ============================================
// SEED - Datos iniciales
// ============================================

type FieldConfig = {
  name: string;
  code: string;
  type: string;
  order: number;
  required: boolean;
  multiple?: boolean;
  description?: string;
  options?: any;
  settings?: any;
};

// Branch rule that references field codes (pre-ID resolution)
type BranchFieldRef = {
  fieldCode: string;
  equals?: any;
  in?: any[];
};

// Branch definition with code references (resolved to IDs during seed)
type BranchConfig = {
  key: string;
  label?: string;
  rules: BranchFieldRef[];
  fieldIds: string[]; // field codes, resolved to IDs during seed
};

type ServiceSeedConfig = {
  name: string;
  code: string;
  category: "salud" | "notarial";
  description?: string;
  price: number;
  hasPriority?: boolean;
  priorityPrice?: number;
  estimatedHours?: number;
  priorityHours?: number;
  fields: FieldConfig[];
  workflowMode?: "deterministic";
  workflowConfig?: {
    branches: BranchConfig[];
    requirePaymentMethod?: boolean;
    addressStrategy?: "profile_confirm" | "always_prompt";
  };
};

// Helper: resolve field codes to field IDs in branch config
function resolveFieldIds(
  codeToId: Map<string, string>,
  config: { branches: BranchConfig[]; requirePaymentMethod?: boolean; addressStrategy?: "profile_confirm" | "always_prompt" }
): WorkflowConfig {
  return {
    branches: config.branches.map((branch) => ({
      key: branch.key,
      label: branch.label,
      rules: branch.rules.map((rule) => {
        const fieldId = codeToId.get(rule.fieldCode);
        if (!fieldId) {
          throw new Error(`Field code not found: ${rule.fieldCode}`);
        }
        const resolved: { fieldId: string; equals?: any; in?: any[] } = { fieldId };
        if (rule.equals !== undefined) resolved.equals = rule.equals;
        if (rule.in !== undefined) resolved.in = rule.in;
        return resolved;
      }),
      fieldIds: branch.fieldIds
        .map((code) => codeToId.get(code))
        .filter((id): id is string => id !== undefined),
    })),
    requirePaymentMethod: config.requirePaymentMethod,
    addressStrategy: config.addressStrategy,
  };
}

// Helper: insert all fields for a service, return Map<code, fieldId>
async function insertServiceFields(
  ctx: any,
  serviceId: Id<"services">,
  fields: FieldConfig[]
): Promise<Map<string, string>> {
  const codeToId = new Map<string, string>();

  // Delete existing fields if service exists
  const existingFields = await ctx.db
    .query("serviceFields")
    .withIndex("by_service", (q: any) => q.eq("serviceId", serviceId))
    .collect();
  for (const f of existingFields) {
    await ctx.db.delete(f._id);
  }

  // Insert fields and collect IDs
  for (const f of fields) {
    const fieldId = await ctx.db.insert("serviceFields", {
      serviceId,
      name: f.name,
      code: f.code,
      description: f.description ?? undefined,
      type: f.type,
      required: f.required,
      multiple: f.multiple ?? false,
      order: f.order,
      options: f.options,
      settings: f.settings,
      status: true,
    });
    codeToId.set(f.code, fieldId);
  }

  return codeToId;
}

// Helper: patch service with resolved workflowConfig
async function patchServiceWorkflow(
  ctx: any,
  serviceId: Id<"services">,
  codeToId: Map<string, string>,
  workflowConfig: { branches: BranchConfig[] }
): Promise<void> {
  const resolved = resolveFieldIds(codeToId, workflowConfig);
  await ctx.db.patch(serviceId, { workflowConfig: resolved });
}

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

    // 2. Services Data — SOLO 7 servicios (3 salud + 4 notariales)
    const services: ServiceSeedConfig[] = [
      // ===================== SALUD =====================
      {
        name: "Solicitud de Medicamentos",
        code: "medication_request",
        category: "salud",
        description: "Solicitud de medicamentos con fórmula médica",
        price: 40000,
        hasPriority: true,
        priorityPrice: 100000,
        estimatedHours: 24,
        priorityHours: 8,
        workflowMode: "deterministic",
        workflowConfig: {
          branches: [
            {
              key: "con_autorizacion",
              label: "Con autorización EPS",
              rules: [{ fieldCode: "field_has_eps_authorization", equals: true }],
              fieldIds: [
                "field_eps_name",
                "field_drugstore_name",
                "field_medical_order",
                "field_mipres",
                "field_eps_authorization",
                "field_has_eps_authorization",
              ],
            },
            {
              key: "sin_autorizacion",
              label: "Sin autorización EPS",
              rules: [{ fieldCode: "field_has_eps_authorization", equals: false }],
              fieldIds: [
                "field_eps_name",
                "field_drugstore_name",
                "field_medical_order",
                "field_mipres",
                "field_has_eps_authorization",
              ],
            },
          ],
          requirePaymentMethod: true,
          addressStrategy: "profile_confirm",
        },
        fields: [
          {
            name: "Nombre de la EPS",
            code: "field_eps_name",
            type: "Text",
            order: 10,
            required: true,
            description: "Nombre de la EPS a la que está afiliado.",
          },
          {
            name: "Nombre de la droguería",
            code: "field_drugstore_name",
            type: "Text",
            order: 20,
            required: true,
            description: "Nombre de la droguería o farmacia.",
          },
          {
            name: "¿Tiene autorización de la EPS?",
            code: "field_has_eps_authorization",
            type: "Boolean",
            order: 30,
            required: true,
            description: "Indique si cuenta con autorización de la EPS.",
          },
          {
            name: "Orden médica / MIPRES / Autorización",
            code: "field_medical_order",
            type: "File",
            order: 40,
            required: true,
            multiple: true,
            description: "Cargue foto, imagen o PDF de la orden médica, MIPRES o autorización.",
            settings: { maxFiles: 5, acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"] },
          },
          {
            name: "MIPRES",
            code: "field_mipres",
            type: "File",
            order: 50,
            required: false,
            multiple: true,
            description: "Cargue foto, imagen o PDF del MIPRES si aplica.",
            settings: { maxFiles: 3, acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"] },
          },
          {
            name: "Autorización EPS",
            code: "field_eps_authorization",
            type: "File",
            order: 60,
            required: false,
            multiple: true,
            description: "Cargue foto, imagen o PDF de la autorización de la EPS si aplica.",
            settings: { maxFiles: 3, acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"] },
          },
        ],
      },
      {
        name: "Autorizaciones Médicas",
        code: "medical_authorizations",
        category: "salud",
        description: "Solicitud de autorizaciones médicas",
        price: 40000,
        hasPriority: true,
        priorityPrice: 100000,
        estimatedHours: 24,
        priorityHours: 8,
        workflowMode: "deterministic",
        workflowConfig: {
          branches: [
            {
              key: "con_mipres",
              label: "Con MIPRES",
              rules: [{ fieldCode: "field_has_mipres_auth", equals: true }],
              fieldIds: [
                "field_auth_eps_name",
                "field_auth_medical_order",
                "field_auth_clinical_summary",
                "field_auth_mipres",
                "field_has_mipres_auth",
              ],
            },
            {
              key: "sin_mipres",
              label: "Sin MIPRES",
              rules: [{ fieldCode: "field_has_mipres_auth", equals: false }],
              fieldIds: [
                "field_auth_eps_name",
                "field_auth_medical_order",
                "field_auth_clinical_summary",
                "field_has_mipres_auth",
              ],
            },
          ],
          requirePaymentMethod: true,
          addressStrategy: "profile_confirm",
        },
        fields: [
          {
            name: "Nombre de la EPS",
            code: "field_auth_eps_name",
            type: "Text",
            order: 10,
            required: true,
            description: "Nombre de la EPS.",
          },
          {
            name: "Orden médica",
            code: "field_auth_medical_order",
            type: "File",
            order: 20,
            required: true,
            multiple: true,
            description: "Cargue foto, imagen o PDF de la orden médica.",
            settings: { maxFiles: 5, acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"] },
          },
          {
            name: "Resumen de historia clínica",
            code: "field_auth_clinical_summary",
            type: "File",
            order: 30,
            required: true,
            multiple: true,
            description: "Cargue foto, imagen o PDF del resumen de historia clínica.",
            settings: { maxFiles: 3, acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"] },
          },
          {
            name: "¿Tiene MIPRES?",
            code: "field_has_mipres_auth",
            type: "Boolean",
            order: 40,
            required: true,
            description: "Indique si cuenta con MIPRES.",
          },
          {
            name: "MIPRES",
            code: "field_auth_mipres",
            type: "File",
            order: 50,
            required: false,
            multiple: true,
            description: "Cargue foto, imagen o PDF del MIPRES si aplica.",
            settings: { maxFiles: 3, acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"] },
          },
        ],
      },
      {
        name: "Citas Médicas",
        code: "medical_appointments",
        category: "salud",
        description: "Solicitud de citas médicas",
        price: 40000,
        hasPriority: true,
        priorityPrice: 100000,
        estimatedHours: 24,
        priorityHours: 8,
        workflowMode: "deterministic",
        workflowConfig: {
          branches: [
            {
              key: "imagenes_diagnosticas",
              label: "Cita de imágenes diagnósticas",
              rules: [{ fieldCode: "field_is_diagnostic_imaging", equals: true }],
              fieldIds: [
                "field_appt_medical_order",
                "field_appt_authorization",
                "field_appt_clinical_summary",
                "field_creatinine_result",
                "field_is_diagnostic_imaging",
              ],
            },
            {
              key: "cita_general",
              label: "Cita médica general",
              rules: [{ fieldCode: "field_is_diagnostic_imaging", equals: false }],
              fieldIds: [
                "field_appt_medical_order",
                "field_appt_authorization",
                "field_appt_clinical_summary",
                "field_is_diagnostic_imaging",
              ],
            },
          ],
          requirePaymentMethod: true,
          addressStrategy: "profile_confirm",
        },
        fields: [
          {
            name: "Orden médica",
            code: "field_appt_medical_order",
            type: "File",
            order: 10,
            required: true,
            multiple: true,
            description: "Cargue foto, imagen o PDF de la orden médica.",
            settings: { maxFiles: 5, acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"] },
          },
          {
            name: "Autorización",
            code: "field_appt_authorization",
            type: "File",
            order: 20,
            required: true,
            multiple: true,
            description: "Cargue foto, imagen o PDF de la autorización.",
            settings: { maxFiles: 3, acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"] },
          },
          {
            name: "¿Es cita de imágenes diagnósticas?",
            code: "field_is_diagnostic_imaging",
            type: "Boolean",
            order: 30,
            required: true,
            description: "Indique si la cita es para imágenes diagnósticas.",
          },
          {
            name: "Resultado de creatinina",
            code: "field_creatinine_result",
            type: "File",
            order: 40,
            required: false,
            multiple: true,
            description: "Cargue foto, imagen o PDF del resultado de creatinina (requerido para imágenes diagnósticas).",
            settings: { maxFiles: 3, acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"] },
          },
          {
            name: "Resumen de historia clínica",
            code: "field_appt_clinical_summary",
            type: "File",
            order: 50,
            required: false,
            multiple: true,
            description: "Cargue foto, imagen o PDF del resumen de historia clínica (opcional).",
            settings: { maxFiles: 3, acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"] },
          },
        ],
      },

      // ===================== NOTARIALES =====================
      {
        name: "Solicitud de Registros Civiles",
        code: "civil_registry_request",
        category: "notarial",
        description: "Solicitud de registros civiles",
        price: 40000,
        hasPriority: true,
        priorityPrice: 100000,
        estimatedHours: 24,
        priorityHours: 8,
        workflowMode: "deterministic",
        workflowConfig: {
          branches: [
            {
              key: "con_numero_mayor_edad",
              label: "Con número de registro — Mayor de edad",
              rules: [
                { fieldCode: "field_cr_has_registration_number", equals: true },
                { fieldCode: "field_cr_is_minor", equals: false },
              ],
              fieldIds: [
                "field_cr_requester_full_name",
                "field_cr_requester_phone",
                "field_cr_holder_first_name",
                "field_cr_holder_last_name",
                "field_cr_has_registration_number",
                "field_cr_registration_number",
                "field_cr_notary_number",
                "field_cr_tome_number",
                "field_cr_folio_number",
                "field_cr_serial_number",
                "field_cr_copy_document",
                "field_cr_third_party_auth",
                "field_cr_requester_id_copy",
                "field_cr_is_minor",
              ],
            },
            {
              key: "con_numero_menor_edad",
              label: "Con número de registro — Menor de edad",
              rules: [
                { fieldCode: "field_cr_has_registration_number", equals: true },
                { fieldCode: "field_cr_is_minor", equals: true },
              ],
              fieldIds: [
                "field_cr_requester_full_name",
                "field_cr_requester_phone",
                "field_cr_holder_first_name",
                "field_cr_holder_last_name",
                "field_cr_has_registration_number",
                "field_cr_registration_number",
                "field_cr_notary_number",
                "field_cr_tome_number",
                "field_cr_folio_number",
                "field_cr_serial_number",
                "field_cr_copy_document",
                "field_cr_third_party_auth",
                "field_cr_requester_id_copy",
                "field_cr_minor_id_copy",
                "field_cr_parent_id_copy",
                "field_cr_is_minor",
              ],
            },
            {
              key: "sin_numero_mayor_edad",
              label: "Sin número de registro — Mayor de edad",
              rules: [
                { fieldCode: "field_cr_has_registration_number", equals: false },
                { fieldCode: "field_cr_is_minor", equals: false },
              ],
              fieldIds: [
                "field_cr_requester_full_name",
                "field_cr_requester_phone",
                "field_cr_holder_first_name",
                "field_cr_holder_last_name",
                "field_cr_has_registration_number",
                "field_cr_notary_number",
                "field_cr_copy_document",
                "field_cr_third_party_auth",
                "field_cr_requester_id_copy",
                "field_cr_is_minor",
              ],
            },
            {
              key: "sin_numero_menor_edad",
              label: "Sin número de registro — Menor de edad",
              rules: [
                { fieldCode: "field_cr_has_registration_number", equals: false },
                { fieldCode: "field_cr_is_minor", equals: true },
              ],
              fieldIds: [
                "field_cr_requester_full_name",
                "field_cr_requester_phone",
                "field_cr_holder_first_name",
                "field_cr_holder_last_name",
                "field_cr_has_registration_number",
                "field_cr_notary_number",
                "field_cr_copy_document",
                "field_cr_third_party_auth",
                "field_cr_requester_id_copy",
                "field_cr_minor_id_copy",
                "field_cr_parent_id_copy",
                "field_cr_is_minor",
              ],
            },
          ],
          requirePaymentMethod: true,
          addressStrategy: "profile_confirm",
        },
        fields: [
          {
            name: "Nombre y apellidos del solicitante",
            code: "field_cr_requester_full_name",
            type: "Text",
            order: 10,
            required: true,
            description: "Nombre y apellidos de la persona que escribe.",
          },
          {
            name: "Teléfono del solicitante",
            code: "field_cr_requester_phone",
            type: "Text",
            order: 20,
            required: true,
            description: "Número de teléfono para comunicación.",
          },
          {
            name: "Nombre del titular del registro",
            code: "field_cr_holder_first_name",
            type: "Text",
            order: 30,
            required: true,
            description: "Nombre de la persona a quien pertenece el registro civil.",
          },
          {
            name: "Apellido del titular del registro",
            code: "field_cr_holder_last_name",
            type: "Text",
            order: 40,
            required: true,
            description: "Apellido de la persona a quien pertenece el registro civil.",
          },
          {
            name: "¿Tiene número de registro?",
            code: "field_cr_has_registration_number",
            type: "Boolean",
            order: 50,
            required: true,
            description: "Indique si cuenta con el número de registro civil.",
          },
          {
            name: "Número de registro",
            code: "field_cr_registration_number",
            type: "Text",
            order: 60,
            required: false,
            description: "Número del registro civil.",
          },
          {
            name: "Número de la notaría",
            code: "field_cr_notary_number",
            type: "Text",
            order: 70,
            required: false,
            description: "Número de la notaría donde se encuentra inscrito el registro.",
          },
          {
            name: "Número de tomo",
            code: "field_cr_tome_number",
            type: "Text",
            order: 80,
            required: false,
            description: "Número de tomo del registro (opcional).",
          },
          {
            name: "Número de folio",
            code: "field_cr_folio_number",
            type: "Text",
            order: 90,
            required: false,
            description: "Número de folio del registro (opcional).",
          },
          {
            name: "Número de serial",
            code: "field_cr_serial_number",
            type: "Text",
            order: 100,
            required: false,
            description: "Número de serial del registro (opcional).",
          },
          {
            name: "Copia del registro civil",
            code: "field_cr_copy_document",
            type: "File",
            order: 110,
            required: true,
            multiple: true,
            description: "Cargue copia del registro civil en PDF, PNG o foto.",
            settings: { maxFiles: 3, acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"] },
          },
          {
            name: "Autorización a terceros",
            code: "field_cr_third_party_auth",
            type: "File",
            order: 120,
            required: true,
            multiple: true,
            description: "Cargue la carta de autorización a terceros.",
            settings: { maxFiles: 2, acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"] },
          },
          {
            name: "Copia de cédula del solicitante",
            code: "field_cr_requester_id_copy",
            type: "File",
            order: 130,
            required: true,
            multiple: true,
            description: "Cargue copia de la cédula de quien solicita el registro.",
            settings: { maxFiles: 2, acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"] },
          },
          {
            name: "¿El titular es menor de edad?",
            code: "field_cr_is_minor",
            type: "Boolean",
            order: 140,
            required: true,
            description: "Indique si la persona a quien se solicita el registro es menor de edad.",
          },
          {
            name: "Copia de tarjeta de identidad del menor",
            code: "field_cr_minor_id_copy",
            type: "File",
            order: 150,
            required: false,
            multiple: true,
            description: "Cargue copia de la tarjeta de identidad del menor (requerido si es menor de edad).",
            settings: { maxFiles: 2, acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"] },
          },
          {
            name: "Copia de cédula del padre o madre",
            code: "field_cr_parent_id_copy",
            type: "File",
            order: 160,
            required: false,
            multiple: true,
            description: "Cargue copia de la cédula del padre o madre (requerido si es menor de edad).",
            settings: { maxFiles: 2, acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"] },
          },
        ],
      },
      {
        name: "Partida de Matrimonio",
        code: "marriage_certificate_request",
        category: "notarial",
        description: "Solicitud de partida de matrimonio",
        price: 40000,
        hasPriority: true,
        priorityPrice: 100000,
        estimatedHours: 24,
        priorityHours: 8,
        workflowMode: "deterministic",
        workflowConfig: {
          branches: [
            {
              key: "civil",
              label: "Partida civil",
              rules: [{ fieldCode: "field_mc_type", equals: "civil" }],
              fieldIds: [
                "field_mc_requester_full_name",
                "field_mc_requester_phone",
                "field_mc_type",
                "field_mc_id_copy",
                "field_mc_registry_status",
                "field_mc_reason",
                "field_mc_certificate_copy",
                "field_mc_third_party_auth",
              ],
            },
            {
              key: "catolica",
              label: "Partida católica",
              rules: [{ fieldCode: "field_mc_type", equals: "catolica" }],
              fieldIds: [
                "field_mc_requester_full_name",
                "field_mc_requester_phone",
                "field_mc_type",
                "field_mc_registry_status",
                "field_mc_reason",
                "field_mc_certificate_copy",
                "field_mc_third_party_auth",
              ],
            },
          ],
          requirePaymentMethod: true,
          addressStrategy: "profile_confirm",
        },
        fields: [
          {
            name: "Nombre y apellidos del solicitante",
            code: "field_mc_requester_full_name",
            type: "Text",
            order: 10,
            required: true,
            description: "Nombre y apellidos de quien solicita.",
          },
          {
            name: "Teléfono del solicitante",
            code: "field_mc_requester_phone",
            type: "Text",
            order: 20,
            required: true,
            description: "Número de teléfono de contacto.",
          },
          {
            name: "Tipo de partida de matrimonio",
            code: "field_mc_type",
            type: "Select",
            order: 30,
            required: true,
            options: {
              items: [
                { value: "civil", label: "Civil" },
                { value: "catolica", label: "Católica" },
              ],
            },
            description: "Seleccione el tipo de partida de matrimonio requerida.",
          },
          {
            name: "Fotocopia de cédula (ambas caras)",
            code: "field_mc_id_copy",
            type: "File",
            order: 40,
            required: false,
            multiple: true,
            description: "Cargue fotocopia de cédula por ambas caras (requerido para partida civil).",
            settings: { maxFiles: 2, acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"] },
          },
          {
            name: "Estado del registro en Registraduría",
            code: "field_mc_registry_status",
            type: "Select",
            order: 50,
            required: true,
            options: {
              items: [
                { value: "registrado", label: "Sí, ya está registrado (partida registrada)" },
                { value: "no_registrado", label: "No, solo fue ceremonia religiosa" },
                { value: "civil_automatico", label: "Fue matrimonio civil (se registró automáticamente)" },
              ],
            },
            description: "Indique si el matrimonio está registrado en la Registraduría.",
          },
          {
            name: "Motivo de la solicitud",
            code: "field_mc_reason",
            type: "Select",
            order: 60,
            required: true,
            options: {
              items: [
                { value: "divorcio", label: "Divorcio" },
                { value: "sucesion", label: "Sucesión" },
                { value: "volver_casar", label: "Volverse a casar" },
              ],
            },
            description: "Seleccione el motivo de la solicitud.",
          },
          {
            name: "Copia de partida de matrimonio o registro serial",
            code: "field_mc_certificate_copy",
            type: "File",
            order: 70,
            required: false,
            multiple: true,
            description: "Cargue copia de la partida de matrimonio o registro serial en foto, PDF o imagen.",
            settings: { maxFiles: 3, acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"] },
          },
          {
            name: "Autorización a terceros",
            code: "field_mc_third_party_auth",
            type: "File",
            order: 80,
            required: true,
            multiple: true,
            description: "Cargue la carta de autorización a terceros.",
            settings: { maxFiles: 2, acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"] },
          },
        ],
      },
      {
        name: "Partida de Defunción",
        code: "death_certificate_request",
        category: "notarial",
        description: "Solicitud de partida de defunción",
        price: 40000,
        hasPriority: true,
        priorityPrice: 100000,
        estimatedHours: 24,
        priorityHours: 8,
        workflowMode: "deterministic",
        workflowConfig: {
          branches: [
            {
              key: "estandar",
              label: "Solicitud estándar",
              rules: [],
              fieldIds: [
                "field_dc_requester_full_name",
                "field_dc_requester_phone",
                "field_dc_reason",
                "field_dc_certificate_copy",
                "field_dc_requester_id_copy",
                "field_dc_third_party_auth",
              ],
            },
          ],
          requirePaymentMethod: true,
          addressStrategy: "profile_confirm",
        },
        fields: [
          {
            name: "Nombre y apellidos del solicitante",
            code: "field_dc_requester_full_name",
            type: "Text",
            order: 10,
            required: true,
            description: "Nombre y apellidos de quien solicita.",
          },
          {
            name: "Teléfono del solicitante",
            code: "field_dc_requester_phone",
            type: "Text",
            order: 20,
            required: true,
            description: "Número de teléfono de contacto.",
          },
          {
            name: "Motivo de la solicitud",
            code: "field_dc_reason",
            type: "Text",
            order: 30,
            required: true,
            description: "Descripción de para qué requiere la partida de defunción.",
          },
          {
            name: "Copia de partida de defunción",
            code: "field_dc_certificate_copy",
            type: "File",
            order: 40,
            required: true,
            multiple: true,
            description: "Cargue copia de la partida de defunción en PDF, PNG o imagen.",
            settings: { maxFiles: 3, acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"] },
          },
          {
            name: "Copia de cédula del solicitante",
            code: "field_dc_requester_id_copy",
            type: "File",
            order: 50,
            required: true,
            multiple: true,
            description: "Cargue copia de la cédula de quien solicita la partida.",
            settings: { maxFiles: 2, acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"] },
          },
          {
            name: "Autorización a terceros",
            code: "field_dc_third_party_auth",
            type: "File",
            order: 60,
            required: true,
            multiple: true,
            description: "Cargue la carta de autorización a terceros.",
            settings: { maxFiles: 2, acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"] },
          },
        ],
      },
      {
        name: "Copias de Escrituras",
        code: "deed_copy_request",
        category: "notarial",
        description: "Solicitud de copias de escrituras",
        price: 40000,
        hasPriority: true,
        priorityPrice: 100000,
        estimatedHours: 24,
        priorityHours: 8,
        workflowMode: "deterministic",
        workflowConfig: {
          branches: [
            {
              key: "persona_juridica",
              label: "Persona jurídica",
              rules: [{ fieldCode: "field_deed_person_type", equals: "juridica" }],
              fieldIds: [
                "field_deed_requester_full_name",
                "field_deed_requester_phone",
                "field_deed_person_type",
                "field_deed_chamber_certificate",
                "field_deed_legal_rep_id_copy",
                "field_deed_number",
                "field_deed_year",
                "field_deed_city",
                "field_deed_notary_name",
                "field_deed_requester_id_copy",
                "field_deed_third_party_auth",
              ],
            },
            {
              key: "persona_natural",
              label: "Persona natural",
              rules: [{ fieldCode: "field_deed_person_type", equals: "natural" }],
              fieldIds: [
                "field_deed_requester_full_name",
                "field_deed_requester_phone",
                "field_deed_person_type",
                "field_deed_number",
                "field_deed_year",
                "field_deed_city",
                "field_deed_notary_name",
                "field_deed_requester_id_copy",
                "field_deed_third_party_auth",
              ],
            },
          ],
          requirePaymentMethod: true,
          addressStrategy: "profile_confirm",
        },
        fields: [
          {
            name: "Nombre y apellidos del solicitante",
            code: "field_deed_requester_full_name",
            type: "Text",
            order: 10,
            required: true,
            description: "Nombre y apellidos de quien solicita.",
          },
          {
            name: "Teléfono del solicitante",
            code: "field_deed_requester_phone",
            type: "Text",
            order: 20,
            required: true,
            description: "Número de teléfono de contacto.",
          },
          {
            name: "Tipo de persona",
            code: "field_deed_person_type",
            type: "Select",
            order: 30,
            required: true,
            options: {
              items: [
                { value: "natural", label: "Natural" },
                { value: "juridica", label: "Jurídica" },
              ],
            },
            description: "Seleccione el tipo de persona solicitante.",
          },
          {
            name: "Certificado de representación legal",
            code: "field_deed_chamber_certificate",
            type: "File",
            order: 40,
            required: false,
            multiple: true,
            description: "Cargue certificado de representación legal vigente (Cámara de Comercio). Requerido para persona jurídica.",
            settings: { maxFiles: 2, acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"] },
          },
          {
            name: "Copia cédula representante legal",
            code: "field_deed_legal_rep_id_copy",
            type: "File",
            order: 50,
            required: false,
            multiple: true,
            description: "Cargue copia de la cédula del representante legal. Requerido para persona jurídica.",
            settings: { maxFiles: 2, acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"] },
          },
          {
            name: "Número de la escritura",
            code: "field_deed_number",
            type: "Text",
            order: 60,
            required: true,
            description: "Número de la escritura.",
          },
          {
            name: "Año de la escritura",
            code: "field_deed_year",
            type: "Text",
            order: 70,
            required: true,
            description: "Año de la escritura.",
          },
          {
            name: "Ciudad donde se registró",
            code: "field_deed_city",
            type: "Text",
            order: 80,
            required: true,
            description: "Ciudad donde está registrada la escritura.",
          },
          {
            name: "Nombre de la notaría",
            code: "field_deed_notary_name",
            type: "Text",
            order: 90,
            required: true,
            description: "Nombre de la notaría donde se otorgó la escritura.",
          },
          {
            name: "Copia de cédula del solicitante",
            code: "field_deed_requester_id_copy",
            type: "File",
            order: 100,
            required: true,
            multiple: true,
            description: "Cargue copia de la cédula del solicitante en PDF, PNG o imagen.",
            settings: { maxFiles: 2, acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"] },
          },
          {
            name: "Autorización a terceros",
            code: "field_deed_third_party_auth",
            type: "File",
            order: 110,
            required: true,
            multiple: true,
            description: "Cargue la carta de autorización a terceros.",
            settings: { maxFiles: 2, acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"] },
          },
        ],
      },
    ];

    // Two-pass insertion for services with deterministic workflow
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
                category: s.category,
                description: s.description ?? undefined,
                price: s.price,
                hasPriority: s.hasPriority ?? false,
                priorityPrice: s.priorityPrice,
                estimatedHours: s.estimatedHours,
                priorityHours: s.priorityHours,
                status: true,
            });
        } else {
            serviceId = await ctx.db.insert("services", {
                name: s.name,
                code: s.code,
                category: s.category,
                description: s.description ?? undefined,
                price: s.price,
                hasPriority: s.hasPriority ?? false,
                priorityPrice: s.priorityPrice,
                estimatedHours: s.estimatedHours,
                priorityHours: s.priorityHours,
                status: true,
            });
        }

        // Pass 1: Insert all fields and collect code→ID map
        const codeToId = await insertServiceFields(ctx, serviceId, s.fields);

        // Pass 2: Patch service with resolved workflowConfig if deterministic
        if (s.workflowMode === "deterministic" && s.workflowConfig) {
            await patchServiceWorkflow(ctx, serviceId, codeToId, s.workflowConfig);
        }
    }

    // Delete services that are no longer in the seed list
    const allowedCodes = new Set(services.map((s) => s.code));
    const allServices = await ctx.db.query("services").collect();
    for (const svc of allServices) {
        if (svc.code && !allowedCodes.has(svc.code)) {
            // Delete all fields first
            const svcFields = await ctx.db
                .query("serviceFields")
                .withIndex("by_service", (q: any) => q.eq("serviceId", svc._id))
                .collect();
            for (const f of svcFields) {
                await ctx.db.delete(f._id);
            }
            // Delete the service
            await ctx.db.delete(svc._id);
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
