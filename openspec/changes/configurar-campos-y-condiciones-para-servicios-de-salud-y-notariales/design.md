# Design: Configurar Campos y Condiciones para Servicios de Salud y Notariales

## Technical Approach

Extender `seed.ts` para configurar 7 servicios (3 salud, 4 notariales) con `workflowMode: "deterministic"` y `workflowConfig.branches`. Se implementa un patrón **two-pass** de inserción: primero se crean los campos y se capturan sus IDs, luego se hace patch del servicio con `workflowConfig` referenciando esos IDs. Los servicios existentes se reemplazan completamente (delete fields + re-insert); los nuevos se insertan desde cero.

## Architecture Decisions

### Decision: Patrón two-pass para inserción de workflowConfig

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Two-pass (insert fields → patch service) | Requiere 2 operaciones DB por servicio, pero resuelve la dependencia circular de fieldIds | ✅ Elegido |
| Single-pass con IDs predecibles | Imposible — Convex genera IDs autoincrementales no determinísticos | ❌ Rechazado |
| Hardcodear IDs de campos | Frágil — se rompe al re-seed o migrar | ❌ Rechazado |

**Rationale**: Las branch rules en `requestFlow.ts` usan `fieldId` (no `code`). Como Convex genera IDs no predecibles, es obligatorio insertar campos primero, capturar IDs, y luego referenciarlos en workflowConfig.

### Decision: Reemplazo total vs update incremental

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Delete + re-insert campos existentes | Limpio, idempotente, evita drift de datos | ✅ Elegido |
| Upsert por código de campo | Complejo, requiere matching logic adicional | ❌ Rechazado |

**Rationale**: Para servicios que ya existen en seed, se borran todos los campos y se re-insertan. Esto garantiza consistencia y simplifica la lógica.

### Decision: Branches combinatoriales para Registro Civil

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Matriz combinatorial (3 booleans = 8 branches) | Verboso en seed, pero simple en runtime | ✅ Elegido |
| Lógica condicional en runtime | Requiere código adicional fuera de seed | ❌ Rechazado |

**Rationale**: Son datos seed, no lógica runtime. 8 branches es manejable y mantiene la resolución puramente declarativa.

## Data Flow

```
seed.ts (two-pass)
    │
    ├── Pass 1: Insertar campos → capturar Map<code, fieldId>
    │
    └── Pass 2: Patch service con workflowConfig
                    │
                    └── branches[].rules[].fieldId ← resuelto desde Map
                    └── branches[].fieldIds[] ← resuelto desde Map
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `convex/seed.ts` | Modify | Extender tipos `FieldConfig` y `ServiceSeedConfig`, agregar servicio configs, implementar two-pass insertion |

## Interfaces / Contracts

### Tipos extendidos en seed.ts

```typescript
type FieldConfig = {
  code: string;
  label: string;
  type: "Text" | "Number" | "Date" | "Boolean" | "Select" | "File";
  required: boolean;
  order: number;
  description?: string;
  options?: { items: { value: string; label: string }[] };
  settings?: { maxFiles?: number; acceptedMimeTypes?: string[] };
};

type BranchRule = {
  fieldCode: string;  // Referencia por code, se resuelve a fieldId en runtime
  equals?: string | number | boolean;
  in?: (string | number | boolean)[];
};

type BranchConfig = {
  key: string;
  label?: string;
  rules: BranchRule[];
  fieldCodes: string[];  // Referencias por code, se resuelven a fieldIds en runtime
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
  workflowMode?: "legacy" | "deterministic";
  workflowConfig?: {
    addressStrategy?: "profile_confirm" | "always_prompt";
    paymentMethods?: ("cash" | "transfer" | "card")[];
    requirePaymentMethod?: boolean;
    branches: BranchConfig[];
  };
  fields: FieldConfig[];
};
```

### Patrón two-pass de inserción

```typescript
// Pass 1: Insertar/actualizar servicio y campos
const fieldIdMap = new Map<string, Id<"serviceFields">>();
for (const field of s.fields) {
  const fieldId = await ctx.db.insert("serviceFields", { ... });
  fieldIdMap.set(field.code, fieldId);
}

// Helper para resolver fieldCodes → fieldIds
const resolveFieldId = (code: string) => fieldIdMap.get(code)!;

// Pass 2: Patch service con workflowConfig resuelto
if (s.workflowMode === "deterministic" && s.workflowConfig?.branches) {
  const resolvedConfig = {
    ...s.workflowConfig,
    branches: s.workflowConfig.branches.map(branch => ({
      key: branch.key,
      label: branch.label,
      rules: branch.rules.map(rule => ({
        fieldId: resolveFieldId(rule.fieldCode),
        ...(rule.equals !== undefined && { equals: rule.equals }),
        ...(rule.in && { in: rule.in }),
      })),
      fieldIds: branch.fieldCodes.map(resolveFieldId),
    })),
  };
  await ctx.db.patch(serviceId, { workflowConfig: resolvedConfig });
}
```

### Estructura de servicios

#### Servicios de Salud (3)

**1. Solicitud de Medicamentos** (`medication_request`) — existente, reemplazar
- Campos: `field_eps` (Text, required), `field_drugstore` (Text), `field_observations` (Text), `field_path` (File)
- Workflow: `deterministic`, sin branches (flujo lineal)

**2. Autorizaciones** (`health_authorizations`) — nuevo
- Campos: `field_patient_name` (Text, required), `field_eps` (Select), `field_authorization_type` (Select), `field_diagnosis` (Text), `field_medication` (Text), `field_path` (File), `field_observations` (Text)
- Workflow: `deterministic`, sin branches

**3. Citas Médicas** (`medical_appointments`) — nuevo
- Campos: `field_specialty` (Select), `field_doctor_name` (Text), `field_appointment_date` (Date), `field_appointment_time` (Text), `field_eps` (Select), `field_observations` (Text)
- Workflow: `deterministic`, sin branches

#### Servicios Notariales (4)

**4. Partida de Matrimonio** (`marriage_certificate_request`) — existente, reemplazar
- Campos: `field_marriage_type` (Select), `field_registry_office` (Select), `field_request_reason` (Text), `field_spouse1_name` (Text, required), `field_spouse2_name` (Text, required), `field_marriage_date` (Date), `field_path` (File), `field_observations` (Text)
- Workflow: `deterministic`, sin branches

**5. Partida de Defunción** (`death_certificate_request`) — existente, reemplazar
- Campos: `field_deceased_name` (Text, required), `field_request_reason` (Text), `field_base_document` (File), `field_notary_name` (Text), `field_city` (Text), `field_deed_number_year` (Text)
- Workflow: `deterministic`, sin branches

**6. Registro Civil** (`civil_registry_request`) — existente, reemplazar
- Campos: `field_registrant_name` (Text, required), `field_has_registration_number` (Boolean), `field_serial_number` (Text), `field_notary_name` (Text), `field_tome` (Text), `field_folio` (Text), `field_is_minor` (Boolean), `field_person_type` (Select: natural/juridica), `field_path` (File)
- Workflow: `deterministic`, con branches combinatoriales (3 booleans/selects = 8 branches)
- Branches matrix:
  - `with_number_natural`: tiene_numero=true, es_menor=false, tipo_persona=natural → campos: serial_number, notary_name
  - `with_number_minor`: tiene_numero=true, es_menor=true → campos: serial_number, notary_name, parent_name
  - `with_number_juridica`: tiene_numero=true, tipo_persona=juridica → campos: serial_number, notary_name, company_name
  - `without_number_natural`: tiene_numero=false, es_menor=false, tipo_persona=natural → campos: registrant_name, birth_date, notary_name
  - `without_number_minor`: tiene_numero=false, es_menor=true → campos: registrant_name, birth_date, parent_name
  - `without_number_juridica`: tiene_numero=false, tipo_persona=juridica → campos: company_name, nit, notary_name
  - `default_natural`: fallback → campos: registrant_name, notary_name
  - `default_other`: fallback genérico → campos: registrant_name

**7. Copia de Escrituras** (`deed_copy_request`) — existente, reemplazar
- Campos: `field_deed_city` (Text, required), `field_deed_number` (Text), `field_deed_year` (Text), `field_notary_name` (Text), `field_path` (File), `field_observations` (Text)
- Workflow: `deterministic`, sin branches

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Two-pass resolution de fieldCodes → fieldIds | Test unitario del helper `resolveFieldId` |
| Integration | Seed completo crea servicios con workflowConfig correcto | Ejecutar seed y verificar DB |
| Integration | Branch resolution con collectedData | Verificar `resolveBranchKey` retorna branch correcto |
| E2E | Flujo completo de servicio deterministico | Simular sesión de bot con campos condicionales |

## Migration / Rollout

No migration required. El seed es idempotente — al ejecutarse reemplaza los campos existentes y actualiza los servicios. Los servicios nuevos se insertan limpiamente.

## Open Questions

- [ ] Confirmar los campos exactos y opciones de Select para cada servicio con el equipo de producto
- [ ] Definir si los branches de Registro Civil deben incluir todos los campos posibles o solo los específicos de cada combinación
- [ ] Validar si los servicios de Autorizaciones y Citas Médicas necesitan branches condicionales o flujo lineal es suficiente
