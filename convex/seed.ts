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

type ServiceCategory = "salud" | "notarial" | "catastral" | "logistica";

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

type ServiceWorkflowConfig = {
  branches: BranchConfig[];
  requirePaymentMethod?: boolean;
  addressStrategy?: "profile_confirm" | "always_prompt";
};

type ServiceSeedConfig = {
  name: string;
  code: string;
  category: ServiceCategory;
  description?: string;
  price: number;
  hasPriority?: boolean;
  priorityPrice?: number;
  estimatedHours?: number;
  priorityHours?: number;
  fields: FieldConfig[];
  workflowMode?: "deterministic";
  workflowConfig?: ServiceWorkflowConfig;
};

// ── Field-building helpers ────────────────────────────────────────
// Mantienen los códigos de campo y los fieldIds de las ramas en sincronía,
// evitando errores de duplicación al definir muchos servicios.

const DOC_MIMES = ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"];

function fileSettings(maxFiles: number) {
  return { maxFiles, acceptedMimeTypes: DOC_MIMES };
}

// Datos comerciales por defecto (todos los servicios soportan prioridad).
const PRICING = {
  price: 40000,
  hasPriority: true,
  priorityPrice: 100000,
  estimatedHours: 24,
  priorityHours: 8,
};

// Documento de autorización a terceros (obligatorio en salud/notarial/catastral).
function thirdPartyAuthField(prefix: string, order: number): FieldConfig {
  return {
    name: "Autorización a terceros",
    code: `${prefix}_third_party_auth`,
    type: "File",
    order,
    required: true,
    multiple: true,
    description:
      "Cargue la carta de autorización a terceros para que podamos realizar el trámite en su nombre.",
    settings: fileSettings(2),
  };
}

// Datos del remitente para servicios logísticos.
function senderFields(prefix: string, order: number, required = true): FieldConfig[] {
  return [
    {
      name: "Nombre y apellidos del remitente",
      code: `${prefix}_sender_name`,
      type: "Text",
      order,
      required,
      description: "Nombre y apellidos de quien envía.",
    },
    {
      name: "Teléfono del remitente",
      code: `${prefix}_sender_phone`,
      type: "Text",
      order: order + 5,
      required,
      description: "Número de teléfono de contacto del remitente (10 dígitos).",
    },
    {
      name: "Dirección de recogida del remitente",
      code: `${prefix}_sender_address`,
      type: "Text",
      order: order + 10,
      required,
      description: "Dirección completa de recogida del remitente.",
    },
  ];
}

// Datos del destinatario para servicios logísticos.
function recipientFields(prefix: string, order: number, required = true): FieldConfig[] {
  return [
    {
      name: "Nombre y apellidos del destinatario",
      code: `${prefix}_recipient_name`,
      type: "Text",
      order,
      required,
      description: "Nombre y apellidos de quien recibe.",
    },
    {
      name: "Teléfono del destinatario",
      code: `${prefix}_recipient_phone`,
      type: "Text",
      order: order + 5,
      required,
      description: "Número de teléfono de contacto del destinatario (10 dígitos).",
    },
    {
      name: "Dirección de entrega del destinatario",
      code: `${prefix}_recipient_address`,
      type: "Text",
      order: order + 10,
      required,
      description: "Dirección completa de entrega del destinatario.",
    },
  ];
}

// Construye un servicio determinístico de una sola rama, donde TODOS los campos
// (en su orden) componen la rama "estandar". Evita listar fieldIds a mano.
function singleBranchService(
  meta: Omit<ServiceSeedConfig, "fields" | "workflowMode" | "workflowConfig">,
  fields: FieldConfig[]
): ServiceSeedConfig {
  return {
    ...meta,
    fields,
    workflowMode: "deterministic",
    workflowConfig: {
      branches: [
        {
          key: "estandar",
          label: "Solicitud estándar",
          rules: [],
          fieldIds: fields.map((f) => f.code),
        },
      ],
      requirePaymentMethod: true,
      addressStrategy: "profile_confirm",
    },
  };
}

// Helper: resolve field codes to field IDs in branch config
function resolveFieldIds(
  codeToId: Map<string, string>,
  config: ServiceWorkflowConfig
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
  workflowConfig: ServiceWorkflowConfig
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

    // 2. Services Data — 17 servicios (4 salud, 4 notarial, 2 catastral, 7 logística)
    const services: ServiceSeedConfig[] = [
      // ========================= SALUD =========================
      // Autorización a terceros obligatoria en todos los servicios de salud.
      singleBranchService(
        {
          name: "Solicitud de Medicamentos",
          code: "medication_request",
          category: "salud",
          description: "Solicitud de medicamentos con fórmula médica",
          ...PRICING,
        },
        [
          {
            name: "Nombre de la EPS",
            code: "field_med_eps_name",
            type: "Text",
            order: 10,
            required: true,
            description: "Nombre de la EPS a la que está afiliado.",
          },
          {
            name: "Nombre de la droguería",
            code: "field_med_drugstore_name",
            type: "Text",
            order: 20,
            required: true,
            description: "Droguería o farmacia donde desea reclamar los medicamentos.",
          },
          {
            name: "Orden médica / MIPRES / Autorización",
            code: "field_med_medical_order",
            type: "File",
            order: 30,
            required: true,
            multiple: true,
            description:
              "Envíe una foto, imagen o PDF de la orden médica, MIPRES o autorización (al menos uno).",
            settings: fileSettings(5),
          },
          thirdPartyAuthField("field_med", 40),
        ]
      ),
      singleBranchService(
        {
          name: "Autorizaciones Médicas",
          code: "medical_authorizations",
          category: "salud",
          description: "Solicitud de autorizaciones médicas",
          ...PRICING,
        },
        [
          {
            name: "Nombre de la EPS",
            code: "field_auth_eps_name",
            type: "Text",
            order: 10,
            required: true,
            description: "Nombre de la EPS.",
          },
          {
            name: "Tipo de autorización",
            code: "field_auth_type",
            type: "Text",
            order: 20,
            required: true,
            description: "Tipo de autorización que necesita.",
          },
          {
            name: "Servicio o procedimiento a autorizar",
            code: "field_auth_service",
            type: "Text",
            order: 30,
            required: true,
            description: "Servicio o procedimiento que se desea autorizar.",
          },
          {
            name: "Observaciones",
            code: "field_auth_observations",
            type: "Text",
            order: 40,
            required: false,
            description: "Observaciones adicionales (opcional).",
          },
          {
            name: "Orden médica / Resumen de historia clínica / MIPRES",
            code: "field_auth_documents",
            type: "File",
            order: 50,
            required: true,
            multiple: true,
            description:
              "Envíe una foto, imagen o PDF de la orden médica, resumen de historia clínica o MIPRES (al menos uno).",
            settings: fileSettings(5),
          },
          thirdPartyAuthField("field_auth", 60),
        ]
      ),
      // Citas médicas: rama según si la cita es para imágenes diagnósticas
      // (en ese caso se exige resultado de creatinina).
      {
        name: "Citas Médicas",
        code: "medical_appointments",
        category: "salud",
        description: "Solicitud de citas médicas",
        ...PRICING,
        workflowMode: "deterministic",
        workflowConfig: {
          branches: [
            {
              key: "imagen_diagnostica",
              label: "Cita para imágenes diagnósticas",
              rules: [{ fieldCode: "field_appt_is_imaging", equals: true }],
              fieldIds: [
                "field_appt_eps_name",
                "field_appt_specialty",
                "field_appt_availability",
                "field_appt_preferred_site",
                "field_appt_is_imaging",
                "field_appt_documents",
                "field_appt_clinical_summary",
                "field_appt_creatinine",
                "field_appt_third_party_auth",
              ],
            },
            {
              key: "cita_general",
              label: "Cita médica general",
              rules: [{ fieldCode: "field_appt_is_imaging", equals: false }],
              fieldIds: [
                "field_appt_eps_name",
                "field_appt_specialty",
                "field_appt_availability",
                "field_appt_preferred_site",
                "field_appt_is_imaging",
                "field_appt_documents",
                "field_appt_clinical_summary",
                "field_appt_third_party_auth",
              ],
            },
          ],
          requirePaymentMethod: true,
          addressStrategy: "profile_confirm",
        },
        fields: [
          {
            name: "Nombre de la EPS",
            code: "field_appt_eps_name",
            type: "Text",
            order: 10,
            required: true,
            description: "Nombre de la EPS.",
          },
          {
            name: "Especialidad",
            code: "field_appt_specialty",
            type: "Text",
            order: 20,
            required: true,
            description: "Especialidad o tipo de cita que necesita.",
          },
          {
            name: "Disponibilidad horaria",
            code: "field_appt_availability",
            type: "Text",
            order: 30,
            required: true,
            description: "Días y horarios en los que tiene disponibilidad.",
          },
          {
            name: "Sede preferida",
            code: "field_appt_preferred_site",
            type: "Text",
            order: 40,
            required: true,
            description: "Sede o lugar de preferencia para la cita.",
          },
          {
            name: "¿La cita es para imágenes diagnósticas?",
            code: "field_appt_is_imaging",
            type: "Boolean",
            order: 50,
            required: true,
            description: "Indique si la cita es para imágenes diagnósticas.",
          },
          {
            name: "Orden médica / Autorización",
            code: "field_appt_documents",
            type: "File",
            order: 60,
            required: true,
            multiple: true,
            description:
              "Envíe una foto, imagen o PDF de la orden médica o autorización.",
            settings: fileSettings(5),
          },
          {
            name: "Resumen de historia clínica",
            code: "field_appt_clinical_summary",
            type: "File",
            order: 70,
            required: false,
            multiple: true,
            description:
              "Resumen de historia clínica (opcional). Si no lo tiene, puede continuar.",
            settings: fileSettings(3),
          },
          {
            name: "Resultado de creatinina",
            code: "field_appt_creatinine",
            type: "File",
            order: 80,
            required: true,
            multiple: true,
            description:
              "Resultado de creatinina en foto, imagen o PDF (requerido para imágenes diagnósticas).",
            settings: fileSettings(3),
          },
          thirdPartyAuthField("field_appt", 90),
        ],
      },
      singleBranchService(
        {
          name: "Imágenes Diagnósticas",
          code: "diagnostic_imaging",
          category: "salud",
          description: "Solicitud de citas de imágenes diagnósticas",
          ...PRICING,
        },
        [
          {
            name: "Nombre de la EPS",
            code: "field_di_eps_name",
            type: "Text",
            order: 10,
            required: true,
            description: "Nombre de la EPS.",
          },
          {
            name: "Tipo de imagen",
            code: "field_di_image_type",
            type: "Text",
            order: 20,
            required: true,
            description: "Tipo de imagen diagnóstica requerida.",
          },
          {
            name: "Parte del cuerpo",
            code: "field_di_body_part",
            type: "Text",
            order: 30,
            required: true,
            description: "Parte del cuerpo a estudiar.",
          },
          {
            name: "Disponibilidad horaria",
            code: "field_di_availability",
            type: "Text",
            order: 40,
            required: true,
            description: "Días y horarios en los que tiene disponibilidad.",
          },
          {
            name: "Sede preferida",
            code: "field_di_preferred_site",
            type: "Text",
            order: 50,
            required: true,
            description: "Sede o lugar de preferencia.",
          },
          {
            name: "¿Requiere contraste?",
            code: "field_di_requires_contrast",
            type: "Boolean",
            order: 60,
            required: true,
            description: "Indique si la imagen requiere contraste.",
          },
          {
            name: "Orden médica / Autorización",
            code: "field_di_documents",
            type: "File",
            order: 70,
            required: true,
            multiple: true,
            description: "Envíe una foto, imagen o PDF de la orden médica o autorización.",
            settings: fileSettings(5),
          },
          {
            name: "Resultado de creatinina",
            code: "field_di_creatinine",
            type: "File",
            order: 80,
            required: true,
            multiple: true,
            description: "Anexe el resultado de la creatinina en foto, imagen o PDF.",
            settings: fileSettings(3),
          },
          thirdPartyAuthField("field_di", 90),
        ]
      ),

      // ======================= NOTARIALES =======================
      {
        name: "Solicitud de Registros Civiles",
        code: "civil_registry_request",
        category: "notarial",
        description: "Solicitud de registros civiles",
        ...PRICING,
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
                "field_cr_registration_type",
                "field_cr_holder_first_name",
                "field_cr_holder_last_name",
                "field_cr_registry_city",
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
                "field_cr_registration_type",
                "field_cr_holder_first_name",
                "field_cr_holder_last_name",
                "field_cr_registry_city",
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
                "field_cr_registration_type",
                "field_cr_holder_first_name",
                "field_cr_holder_last_name",
                "field_cr_registry_city",
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
                "field_cr_registration_type",
                "field_cr_holder_first_name",
                "field_cr_holder_last_name",
                "field_cr_registry_city",
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
            name: "Tipo de registro",
            code: "field_cr_registration_type",
            type: "Select",
            order: 25,
            required: true,
            options: {
              items: [
                { value: "nacimiento", label: "Nacimiento" },
                { value: "matrimonio", label: "Matrimonio" },
                { value: "defuncion", label: "Defunción" },
              ],
            },
            description: "Tipo de registro civil que desea solicitar.",
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
            name: "Ciudad de registro",
            code: "field_cr_registry_city",
            type: "Text",
            order: 45,
            required: false,
            description: "Ciudad donde se realizó el registro (opcional).",
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
            required: false,
            multiple: true,
            description:
              "Cargue copia del registro civil en PDF, PNG o foto (opcional si no la tiene).",
            settings: fileSettings(3),
          },
          thirdPartyAuthField("field_cr", 120),
          {
            name: "Copia de cédula del solicitante",
            code: "field_cr_requester_id_copy",
            type: "File",
            order: 130,
            required: true,
            multiple: true,
            description: "Cargue copia de la cédula de quien solicita el registro.",
            settings: fileSettings(2),
          },
          {
            name: "¿El titular es menor de edad?",
            code: "field_cr_is_minor",
            type: "Boolean",
            order: 52,
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
            settings: fileSettings(2),
          },
          {
            name: "Copia de cédula del padre o madre",
            code: "field_cr_parent_id_copy",
            type: "File",
            order: 160,
            required: false,
            multiple: true,
            description: "Cargue copia de la cédula del padre o madre (requerido si es menor de edad).",
            settings: fileSettings(2),
          },
        ],
      },
      {
        name: "Partida de Matrimonio",
        code: "marriage_certificate_request",
        category: "notarial",
        description: "Solicitud de partida de matrimonio",
        ...PRICING,
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
                "field_mc_spouse_1",
                "field_mc_spouse_2",
                "field_mc_approx_date",
                "field_mc_city",
                "field_mc_id_copy",
                "field_mc_registry_status",
                "field_mc_registry_name",
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
                "field_mc_spouse_1",
                "field_mc_spouse_2",
                "field_mc_approx_date",
                "field_mc_city",
                "field_mc_registry_status",
                "field_mc_registry_name",
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
            name: "Nombre del cónyuge 1",
            code: "field_mc_spouse_1",
            type: "Text",
            order: 32,
            required: true,
            description: "Nombre completo del primer cónyuge.",
          },
          {
            name: "Nombre del cónyuge 2",
            code: "field_mc_spouse_2",
            type: "Text",
            order: 34,
            required: true,
            description: "Nombre completo del segundo cónyuge.",
          },
          {
            name: "Fecha aproximada del matrimonio",
            code: "field_mc_approx_date",
            type: "Text",
            order: 36,
            required: false,
            description: "Fecha aproximada del matrimonio (opcional).",
          },
          {
            name: "Ciudad del matrimonio",
            code: "field_mc_city",
            type: "Text",
            order: 38,
            required: false,
            description: "Ciudad donde se celebró el matrimonio (opcional).",
          },
          {
            name: "Fotocopia de cédula (ambas caras)",
            code: "field_mc_id_copy",
            type: "File",
            order: 40,
            required: false,
            multiple: true,
            description: "Cargue fotocopia de cédula por ambas caras (requerido para partida civil).",
            settings: fileSettings(2),
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
            name: "Nombre de la Registraduría",
            code: "field_mc_registry_name",
            type: "Text",
            order: 55,
            required: false,
            description: "Indique en qué Registraduría se encuentra registrado el matrimonio.",
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
            settings: fileSettings(3),
          },
          thirdPartyAuthField("field_mc", 80),
        ],
      },
      singleBranchService(
        {
          name: "Partida de Defunción",
          code: "death_certificate_request",
          category: "notarial",
          description: "Solicitud de partida de defunción",
          ...PRICING,
        },
        [
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
            name: "Nombre del fallecido",
            code: "field_dc_deceased_name",
            type: "Text",
            order: 30,
            required: true,
            description: "Nombre y apellidos de la persona fallecida.",
          },
          {
            name: "Documento del fallecido",
            code: "field_dc_deceased_document",
            type: "Text",
            order: 40,
            required: false,
            description: "Número de documento del fallecido (si lo conoce).",
          },
          {
            name: "Fecha aproximada de fallecimiento",
            code: "field_dc_approx_date",
            type: "Text",
            order: 50,
            required: false,
            description: "Fecha aproximada del fallecimiento (opcional).",
          },
          {
            name: "Ciudad de fallecimiento",
            code: "field_dc_city",
            type: "Text",
            order: 60,
            required: false,
            description: "Ciudad donde ocurrió el fallecimiento (opcional).",
          },
          {
            name: "Relación con el fallecido",
            code: "field_dc_relationship",
            type: "Text",
            order: 70,
            required: true,
            description: "Su relación o parentesco con la persona fallecida.",
          },
          {
            name: "Motivo de la solicitud",
            code: "field_dc_reason",
            type: "Text",
            order: 80,
            required: true,
            description: "Para qué requiere la partida de defunción.",
          },
          {
            name: "Copia de partida de defunción",
            code: "field_dc_certificate_copy",
            type: "File",
            order: 90,
            required: false,
            multiple: true,
            description: "Cargue copia de la partida de defunción en PDF, PNG o imagen (si la tiene).",
            settings: fileSettings(3),
          },
          {
            name: "Copia de cédula del solicitante",
            code: "field_dc_requester_id_copy",
            type: "File",
            order: 100,
            required: true,
            multiple: true,
            description: "Cargue copia de la cédula de quien solicita la partida.",
            settings: fileSettings(2),
          },
          thirdPartyAuthField("field_dc", 110),
        ]
      ),
      {
        name: "Copias de Escrituras",
        code: "deed_copy_request",
        category: "notarial",
        description: "Solicitud de copias de escrituras",
        ...PRICING,
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
                "field_deed_company_name",
                "field_deed_nit",
                "field_deed_legal_rep_name",
                "field_deed_chamber_certificate",
                "field_deed_legal_rep_id_copy",
                "field_deed_number",
                "field_deed_year",
                "field_deed_city",
                "field_deed_notary_name",
                "field_deed_deed_type",
                "field_deed_property_address",
                "field_deed_involved_parties",
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
                "field_deed_deed_type",
                "field_deed_property_address",
                "field_deed_involved_parties",
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
            name: "Razón social",
            code: "field_deed_company_name",
            type: "Text",
            order: 32,
            required: false,
            description: "Razón social de la empresa (requerido para persona jurídica).",
          },
          {
            name: "NIT",
            code: "field_deed_nit",
            type: "Text",
            order: 34,
            required: false,
            description: "NIT de la empresa (requerido para persona jurídica).",
          },
          {
            name: "Representante legal",
            code: "field_deed_legal_rep_name",
            type: "Text",
            order: 36,
            required: false,
            description: "Nombre del representante legal (requerido para persona jurídica).",
          },
          {
            name: "Certificado de representación legal",
            code: "field_deed_chamber_certificate",
            type: "File",
            order: 40,
            required: false,
            multiple: true,
            description: "Cargue certificado de representación legal vigente (Cámara de Comercio). Requerido para persona jurídica.",
            settings: fileSettings(2),
          },
          {
            name: "Copia cédula representante legal",
            code: "field_deed_legal_rep_id_copy",
            type: "File",
            order: 50,
            required: false,
            multiple: true,
            description: "Cargue copia de la cédula del representante legal. Requerido para persona jurídica.",
            settings: fileSettings(2),
          },
          {
            name: "Número de la escritura",
            code: "field_deed_number",
            type: "Text",
            order: 60,
            required: false,
            description: "Número de la escritura (si lo conoce).",
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
            name: "Tipo de escritura",
            code: "field_deed_deed_type",
            type: "Text",
            order: 95,
            required: false,
            description: "Tipo de escritura (opcional).",
          },
          {
            name: "Dirección del inmueble",
            code: "field_deed_property_address",
            type: "Text",
            order: 97,
            required: false,
            description: "Dirección del inmueble relacionado con la escritura (opcional).",
          },
          {
            name: "Partes involucradas",
            code: "field_deed_involved_parties",
            type: "Text",
            order: 98,
            required: false,
            description: "Nombres de las partes involucradas en la escritura (opcional).",
          },
          {
            name: "Copia de cédula del solicitante",
            code: "field_deed_requester_id_copy",
            type: "File",
            order: 100,
            required: true,
            multiple: true,
            description: "Cargue copia de la cédula del solicitante en PDF, PNG o imagen.",
            settings: fileSettings(2),
          },
          thirdPartyAuthField("field_deed", 110),
        ],
      },

      // ======================= CATASTRALES =======================
      // Documentos en su mayoría opcionales: si faltan, la solicitud se registra
      // para que un asesor contacte al cliente (estado "Pendiente asesor").
      {
        name: "Solicitud de Desenglobe",
        code: "subdivision_request",
        category: "catastral",
        description: "Solicitud de desenglobe de predio",
        ...PRICING,
        workflowMode: "deterministic",
        workflowConfig: {
          branches: [
            {
              key: "persona_juridica",
              label: "Propietario persona jurídica",
              rules: [{ fieldCode: "field_sub_owner_is_company", equals: true }],
              fieldIds: [
                "field_sub_owner_is_company",
                "field_sub_owner_name",
                "field_sub_property_registration",
                "field_sub_property_address",
                "field_sub_chamber_certificate",
                "field_sub_freedom_tradition",
                "field_sub_owner_id_copy",
                "field_sub_property_plan",
                "field_sub_property_tax",
                "field_sub_neighboring_relation",
                "field_sub_deed",
                "field_sub_cadastre_resolution",
                "field_sub_power_of_attorney",
                "field_sub_registration_folio",
              ],
            },
            {
              key: "persona_natural",
              label: "Propietario persona natural",
              rules: [{ fieldCode: "field_sub_owner_is_company", equals: false }],
              fieldIds: [
                "field_sub_owner_is_company",
                "field_sub_owner_name",
                "field_sub_property_registration",
                "field_sub_property_address",
                "field_sub_freedom_tradition",
                "field_sub_owner_id_copy",
                "field_sub_property_plan",
                "field_sub_property_tax",
                "field_sub_neighboring_relation",
                "field_sub_deed",
                "field_sub_cadastre_resolution",
                "field_sub_power_of_attorney",
                "field_sub_registration_folio",
              ],
            },
          ],
          requirePaymentMethod: true,
          addressStrategy: "profile_confirm",
        },
        fields: [
          {
            name: "¿El propietario es persona jurídica?",
            code: "field_sub_owner_is_company",
            type: "Boolean",
            order: 10,
            required: true,
            description: "Indique si el propietario del predio es persona jurídica.",
          },
          {
            name: "Nombre del propietario",
            code: "field_sub_owner_name",
            type: "Text",
            order: 20,
            required: true,
            description: "Nombre del propietario del predio.",
          },
          {
            name: "Matrícula inmobiliaria",
            code: "field_sub_property_registration",
            type: "Text",
            order: 30,
            required: false,
            description: "Número de matrícula inmobiliaria del predio.",
          },
          {
            name: "Dirección del predio",
            code: "field_sub_property_address",
            type: "Text",
            order: 40,
            required: true,
            description: "Dirección completa del predio a desenglobar.",
          },
          {
            name: "Certificado de representación legal",
            code: "field_sub_chamber_certificate",
            type: "File",
            order: 50,
            required: false,
            multiple: true,
            description: "Certificado de representación legal vigente (Cámara de Comercio). Requerido para persona jurídica.",
            settings: fileSettings(2),
          },
          {
            name: "Certificado de libertad y tradición",
            code: "field_sub_freedom_tradition",
            type: "File",
            order: 60,
            required: false,
            multiple: true,
            description: "Certificado de libertad y tradición del predio (si lo tiene).",
            settings: fileSettings(2),
          },
          {
            name: "Copia de cédula del propietario",
            code: "field_sub_owner_id_copy",
            type: "File",
            order: 70,
            required: false,
            multiple: true,
            description: "Copia de la cédula del propietario del predio.",
            settings: fileSettings(2),
          },
          {
            name: "Plano del predio",
            code: "field_sub_property_plan",
            type: "File",
            order: 80,
            required: false,
            multiple: true,
            description: "Plano del predio (opcional, si lo tiene).",
            settings: fileSettings(2),
          },
          {
            name: "Impuesto predial del último año",
            code: "field_sub_property_tax",
            type: "File",
            order: 90,
            required: false,
            multiple: true,
            description: "Copia del impuesto predial del último año.",
            settings: fileSettings(2),
          },
          {
            name: "Relación de predios colindantes",
            code: "field_sub_neighboring_relation",
            type: "File",
            order: 100,
            required: false,
            multiple: true,
            description: "Documento con la relación de los predios colindantes.",
            settings: fileSettings(2),
          },
          {
            name: "Escritura del predio",
            code: "field_sub_deed",
            type: "File",
            order: 110,
            required: false,
            multiple: true,
            description: "Escritura del predio que se desea desenglobar.",
            settings: fileSettings(2),
          },
          {
            name: "Resolución de Catastro / Agustín Codazzi",
            code: "field_sub_cadastre_resolution",
            type: "File",
            order: 120,
            required: false,
            multiple: true,
            description: "Resolución expedida por Catastro o el Instituto Agustín Codazzi que aprueba el desenglobe.",
            settings: fileSettings(2),
          },
          {
            name: "Poder autenticado / Autorización a terceros",
            code: "field_sub_power_of_attorney",
            type: "File",
            order: 130,
            required: false,
            multiple: true,
            description: "Poder otorgado ante notaría autorizando a quien realizará la gestión.",
            settings: fileSettings(2),
          },
          {
            name: "Folio de matrícula inmobiliaria",
            code: "field_sub_registration_folio",
            type: "File",
            order: 140,
            required: false,
            multiple: true,
            description: "Folio de matrícula inmobiliaria o documento similar.",
            settings: fileSettings(2),
          },
        ],
      },
      {
        name: "Certificación de Propiedad",
        code: "property_certification",
        category: "catastral",
        description: "Solicitud de certificación de propiedad",
        ...PRICING,
        workflowMode: "deterministic",
        workflowConfig: {
          branches: [
            {
              key: "con_matricula",
              label: "Con matrícula inmobiliaria",
              rules: [{ fieldCode: "field_pc_has_registration", equals: true }],
              fieldIds: [
                "field_pc_has_registration",
                "field_pc_property_registration",
                "field_pc_cadastral_registry",
                "field_pc_requester_id_copy",
              ],
            },
            {
              key: "sin_matricula",
              label: "Sin matrícula inmobiliaria",
              rules: [{ fieldCode: "field_pc_has_registration", equals: false }],
              fieldIds: [
                "field_pc_has_registration",
                "field_pc_owner_name",
                "field_pc_owner_id_copy",
              ],
            },
          ],
          requirePaymentMethod: true,
          addressStrategy: "profile_confirm",
        },
        fields: [
          {
            name: "¿El predio cuenta con matrícula inmobiliaria?",
            code: "field_pc_has_registration",
            type: "Boolean",
            order: 10,
            required: true,
            description: "Indique si el predio cuenta con matrícula inmobiliaria.",
          },
          {
            name: "Matrícula inmobiliaria",
            code: "field_pc_property_registration",
            type: "Text",
            order: 20,
            required: false,
            description: "Número de matrícula inmobiliaria.",
          },
          {
            name: "Registro catastral",
            code: "field_pc_cadastral_registry",
            type: "Text",
            order: 30,
            required: false,
            description: "Número de registro catastral.",
          },
          {
            name: "Copia de cédula del solicitante",
            code: "field_pc_requester_id_copy",
            type: "File",
            order: 40,
            required: false,
            multiple: true,
            description: "Copia de la cédula del solicitante.",
            settings: fileSettings(2),
          },
          {
            name: "Nombre del propietario",
            code: "field_pc_owner_name",
            type: "Text",
            order: 50,
            required: false,
            description: "Nombre completo del propietario del predio.",
          },
          {
            name: "Copia de cédula del propietario",
            code: "field_pc_owner_id_copy",
            type: "File",
            order: 60,
            required: false,
            multiple: true,
            description: "Copia de la cédula del propietario del predio.",
            settings: fileSettings(2),
          },
        ],
      },

      // ======================== LOGÍSTICA ========================
      // Mensajería simple: NO requiere autorización a terceros.
      singleBranchService(
        {
          name: "Entrega de Paquete con Evidencia",
          code: "package_delivery",
          category: "logistica",
          description: "Entrega de paquete con evidencia fotográfica",
          ...PRICING,
        },
        [
          ...senderFields("field_pkg", 10),
          ...recipientFields("field_pkg", 30),
          {
            name: "Contenido del paquete",
            code: "field_pkg_content",
            type: "Text",
            order: 60,
            required: true,
            description: "Describa brevemente qué contiene el paquete.",
          },
        ]
      ),
      singleBranchService(
        {
          name: "Correspondencia con Radicación",
          code: "mail_filing_delivery",
          category: "logistica",
          description: "Entrega de correspondencia (sobre) con radicación y sello",
          ...PRICING,
        },
        [
          ...senderFields("field_mail", 10),
          ...recipientFields("field_mail", 30),
          {
            name: "Contenido del sobre",
            code: "field_mail_content",
            type: "Text",
            order: 60,
            required: true,
            description: "Describa brevemente qué contiene el sobre.",
          },
          {
            name: "¿Requiere radicado y sello de recibido?",
            code: "field_mail_requires_filing",
            type: "Boolean",
            order: 70,
            required: true,
            description: "Indique si la entrega debe contar con radicado y sello de recibido.",
          },
        ]
      ),
      singleBranchService(
        {
          name: "Recoger y Llevar",
          code: "pickup_and_delivery",
          category: "logistica",
          description: "Recogemos lo que necesites y lo llevamos por ti",
          ...PRICING,
        },
        [
          {
            name: "Dirección de recogida",
            code: "field_pud_pickup_address",
            type: "Text",
            order: 10,
            required: true,
            description: "Dirección completa donde se recoge el artículo.",
          },
          {
            name: "Dirección de entrega",
            code: "field_pud_delivery_address",
            type: "Text",
            order: 20,
            required: true,
            description: "Dirección completa donde se entrega el artículo.",
          },
          {
            name: "Descripción del artículo",
            code: "field_pud_item_description",
            type: "Text",
            order: 30,
            required: true,
            description: "Describa brevemente qué se debe recoger y llevar.",
          },
          {
            name: "Nombre y teléfono de quien entrega",
            code: "field_pud_sender_contact",
            type: "Text",
            order: 40,
            required: false,
            description: "Nombre y teléfono de la persona en el punto de recogida (opcional).",
          },
          {
            name: "Nombre y teléfono de quien recibe",
            code: "field_pud_recipient_contact",
            type: "Text",
            order: 50,
            required: false,
            description: "Nombre y teléfono de la persona en el punto de entrega (opcional).",
          },
        ]
      ),
      singleBranchService(
        {
          name: "Radicación de Cuentas Médicas",
          code: "medical_accounts_filing",
          category: "logistica",
          description: "Radicación de cuentas médicas por sobre",
          ...PRICING,
        },
        [
          ...senderFields("field_maf", 10),
          ...recipientFields("field_maf", 30),
          {
            name: "Contenido / cuentas a radicar",
            code: "field_maf_content",
            type: "Text",
            order: 60,
            required: true,
            description: "Describa brevemente el contenido o las cuentas médicas a radicar.",
          },
          {
            name: "¿Requiere radicado y sello de recibido?",
            code: "field_maf_requires_filing",
            type: "Boolean",
            order: 70,
            required: true,
            description: "Indique si la entrega debe contar con radicado y sello de recibido.",
          },
        ]
      ),
      {
        name: "Entrega de Muestra de Agua",
        code: "water_sample_delivery",
        category: "logistica",
        description: "Entrega de muestra de agua (por caja o por nevera)",
        ...PRICING,
        workflowMode: "deterministic",
        workflowConfig: {
          branches: [
            {
              key: "por_caja",
              label: "Radicación por caja",
              rules: [{ fieldCode: "field_wsd_modality", equals: "caja" }],
              fieldIds: [
                "field_wsd_modality",
                "field_wsd_sender_name",
                "field_wsd_sender_phone",
                "field_wsd_sender_address",
                "field_wsd_recipient_name",
                "field_wsd_recipient_address",
                "field_wsd_content",
                "field_wsd_requires_filing",
              ],
            },
            {
              key: "por_nevera",
              label: "Entrega por nevera",
              rules: [{ fieldCode: "field_wsd_modality", equals: "nevera" }],
              fieldIds: [
                "field_wsd_modality",
                "field_wsd_sender_name",
                "field_wsd_sender_phone",
                "field_wsd_sender_address",
                "field_wsd_recipient_name",
                "field_wsd_recipient_address",
                "field_wsd_lab_has_code",
                "field_wsd_lab_code",
                "field_wsd_receiver_id_copy",
              ],
            },
          ],
          requirePaymentMethod: true,
          addressStrategy: "profile_confirm",
        },
        fields: [
          {
            name: "Modalidad de entrega",
            code: "field_wsd_modality",
            type: "Select",
            order: 10,
            required: true,
            options: {
              items: [
                { value: "caja", label: "Radicación por caja" },
                { value: "nevera", label: "Entrega por nevera (manejo especial)" },
              ],
            },
            description: "Seleccione la modalidad de entrega de la muestra de agua.",
          },
          {
            name: "Nombre y apellidos del remitente",
            code: "field_wsd_sender_name",
            type: "Text",
            order: 20,
            required: true,
            description: "Nombre y apellidos de quien envía.",
          },
          {
            name: "Teléfono del remitente",
            code: "field_wsd_sender_phone",
            type: "Text",
            order: 30,
            required: true,
            description: "Teléfono de contacto del remitente (10 dígitos).",
          },
          {
            name: "Dirección de recogida",
            code: "field_wsd_sender_address",
            type: "Text",
            order: 40,
            required: true,
            description: "Dirección exacta de recogida de la muestra.",
          },
          {
            name: "Nombre del destinatario / laboratorio",
            code: "field_wsd_recipient_name",
            type: "Text",
            order: 50,
            required: true,
            description: "Nombre de la persona o laboratorio que recibe.",
          },
          {
            name: "Dirección de entrega",
            code: "field_wsd_recipient_address",
            type: "Text",
            order: 60,
            required: true,
            description: "Dirección de entrega o código del destinatario.",
          },
          {
            name: "Contenido",
            code: "field_wsd_content",
            type: "Text",
            order: 70,
            required: false,
            description: "Describa brevemente el contenido (opcional).",
          },
          {
            name: "¿Requiere radicado y sello de recibido?",
            code: "field_wsd_requires_filing",
            type: "Boolean",
            order: 80,
            required: false,
            description: "Indique si la entrega debe contar con radicado y sello de recibido.",
          },
          {
            name: "¿El laboratorio tiene código de registro?",
            code: "field_wsd_lab_has_code",
            type: "Boolean",
            order: 90,
            required: false,
            description: "Indique si el laboratorio destinatario cuenta con código de registro.",
          },
          {
            name: "Código de registro del laboratorio",
            code: "field_wsd_lab_code",
            type: "Text",
            order: 100,
            required: false,
            description: "Código de registro del laboratorio destinatario (si lo tiene).",
          },
          {
            name: "Copia de cédula de quien recibe",
            code: "field_wsd_receiver_id_copy",
            type: "File",
            order: 110,
            required: false,
            multiple: true,
            description: "Copia de la cédula de quien recibe la muestra (si no hay código de laboratorio).",
            settings: fileSettings(2),
          },
        ],
      },
      singleBranchService(
        {
          name: "Laboratorios Clínicos",
          code: "clinical_lab_delivery",
          category: "logistica",
          description: "Entrega a laboratorio clínico con transporte en nevera (cadena de frío)",
          ...PRICING,
        },
        [
          {
            name: "Nombre y apellidos del remitente",
            code: "field_lab_sender_name",
            type: "Text",
            order: 10,
            required: true,
            description: "Nombre y apellidos de quien envía la muestra.",
          },
          {
            name: "Teléfono del remitente",
            code: "field_lab_sender_phone",
            type: "Text",
            order: 20,
            required: true,
            description: "Teléfono de contacto del remitente (10 dígitos).",
          },
          {
            name: "Dirección de recogida",
            code: "field_lab_pickup_address",
            type: "Text",
            order: 30,
            required: true,
            description: "Dirección exacta de recogida de la muestra.",
          },
          {
            name: "Nombre del laboratorio destino",
            code: "field_lab_lab_name",
            type: "Text",
            order: 40,
            required: true,
            description: "Nombre del laboratorio clínico destinatario.",
          },
          {
            name: "Dirección de entrega del laboratorio",
            code: "field_lab_lab_address",
            type: "Text",
            order: 50,
            required: true,
            description: "Dirección de entrega del laboratorio destinatario.",
          },
          {
            name: "Persona o empresa que recibe",
            code: "field_lab_receiver_name",
            type: "Text",
            order: 60,
            required: true,
            description: "Nombre de la persona que recibe o de la empresa destinataria.",
          },
        ]
      ),
      singleBranchService(
        {
          name: "Recolección de Sobres",
          code: "envelope_collection",
          category: "logistica",
          description: "Recolección de sobres por unidad",
          ...PRICING,
        },
        [
          {
            name: "Nombre y apellidos del remitente",
            code: "field_env_sender_name",
            type: "Text",
            order: 10,
            required: true,
            description: "Nombre y apellidos de quien solicita la recolección.",
          },
          {
            name: "Teléfono del remitente",
            code: "field_env_sender_phone",
            type: "Text",
            order: 20,
            required: true,
            description: "Teléfono de contacto del remitente (10 dígitos).",
          },
          {
            name: "Dirección de recogida",
            code: "field_env_pickup_address",
            type: "Text",
            order: 30,
            required: true,
            description: "Dirección exacta de recogida del sobre o los sobres.",
          },
          {
            name: "Cantidad de sobres",
            code: "field_env_count",
            type: "Number",
            order: 40,
            required: true,
            description: "Cantidad de sobres a recolectar.",
          },
        ]
      ),
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
                workflowMode: s.workflowMode,
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
                workflowMode: s.workflowMode,
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
