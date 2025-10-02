# Módulo Home - Gestión de Solicitudes

Este módulo proporciona funcionalidades completas para gestionar solicitudes, incluyendo la asignación de clientes y repartidores.

## Funcionalidades Principales

### 1. Tabla de Solicitudes
- Visualización de todas las solicitudes con paginación
- Ordenamiento por diferentes campos
- Filtros avanzados
- Acciones en lote y individuales

### 2. Asignación de Clientes
- Modal para buscar y seleccionar clientes
- Búsqueda por nombre, documento, email o ubicación
- Visualización completa de información del cliente
- Asignación directa a solicitudes

### 3. Asignación de Repartidores
- Modal para buscar y seleccionar repartidores
- Filtrado por disponibilidad y zona de cobertura
- Información detallada del repartidor
- Asignación a solicitudes específicas

### 4. Detalle de Solicitud
- Modal completo con toda la información de la solicitud
- Visualización de entidades relacionadas
- Edición de campos básicos
- Historial de cambios

## Componentes

### RequestsTable
Tabla principal que muestra las solicitudes con todas las funcionalidades de gestión.

**Props:**
- `filters`: Filtros aplicados a la tabla
- `onFiltersChange`: Callback para cambios en filtros

**Funcionalidades:**
- Ordenamiento por columnas
- Paginación
- Acciones por solicitud (ver, editar, asignar, eliminar)
- Estados visuales para asignaciones pendientes

### AssignApplicantModal
Modal para asignar clientes a solicitudes.

**Props:**
- `isOpen`: Estado de apertura del modal
- `onClose`: Callback para cerrar el modal
- `data`: Datos de la solicitud y asignación actual
- `onAssign`: Callback para confirmar la asignación

**Características:**
- Búsqueda en tiempo real
- Información completa del cliente
- Validación de selección
- Estados de carga

### AssignDistributorModal
Modal para asignar repartidores a solicitudes.

**Props:**
- `isOpen`: Estado de apertura del modal
- `onClose`: Callback para cerrar el modal
- `data`: Datos de la solicitud y asignación actual
- `onAssign`: Callback para confirmar la asignación

**Características:**
- Filtrado por disponibilidad
- Información de zona de cobertura
- Tipo de transporte
- Estados de disponibilidad

### RequestDetailModal
Modal para ver y editar detalles completos de una solicitud.

**Props:**
- `isOpen`: Estado de apertura del modal
- `onClose`: Callback para cerrar el modal
- `request`: Datos completos de la solicitud
- `included`: Entidades relacionadas incluidas en la respuesta

**Características:**
- Información completa de la solicitud
- Entidades relacionadas (cliente, repartidor, subservicio)
- Métricas y costos
- Fechas del sistema
- Campos editables

## API Integration

### Endpoints Utilizados

#### Solicitudes
- `GET /api/node/request` - Listar solicitudes
- `PATCH /api/node/request/{id}` - Actualizar solicitud
- `DELETE /api/node/request/{id}` - Eliminar solicitud

#### Asignaciones
- `PATCH /api/node/request/{id}` - Asignar cliente o repartidor

### Estructura de Datos

#### Request
```typescript
interface Request {
  id: string
  type: string
  attributes: {
    title: string
    field_entry_date: string
    status: boolean
    created: string
    changed: string
  }
  relationships: {
    field_applicant?: { data?: { id: string; type: string } }
    field_distributor_data?: { data?: { id: string; type: string } }
    field_subservice?: { data?: { id: string; type: string } }
    field_application_statuses?: { data?: { id: string; type: string } }
    field_service_status?: { data?: { id: string; type: string } }
  }
}
```

#### Payload de Asignación
```typescript
interface AssignDistributorPayload {
  data: {
    type: "node--request"
    id: string
    relationships: {
      field_distributor_data: {
        data: { type: "node--distributor"; id: string }
      }
    }
  }
}
```

## Uso

### Asignar Cliente
```typescript
import { AssignApplicantModal } from "@/features/home/components"

// En tu componente
const [isModalOpen, setIsModalOpen] = useState(false)
const [assignmentData, setAssignmentData] = useState(null)

const handleAssign = async (applicantId: string) => {
  try {
    await assignApplicantToRequest(requestId, applicantId)
    // Recargar datos
    await refetch()
  } catch (error) {
    console.error("Error al asignar cliente:", error)
  }
}

<AssignApplicantModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  data={assignmentData}
  onAssign={handleAssign}
/>
```

### Asignar Repartidor
```typescript
import { AssignDistributorModal } from "@/features/home/components"

// En tu componente
const [isModalOpen, setIsModalOpen] = useState(false)
const [assignmentData, setAssignmentData] = useState(null)

const handleAssign = async (distributorId: string) => {
  try {
    await assignDistributorToRequest(requestId, distributorId)
    // Recargar datos
    await refetch()
  } catch (error) {
    console.error("Error al asignar repartidor:", error)
  }
}

<AssignDistributorModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  data={assignmentData}
  onAssign={handleAssign}
/>
```

## Estados y Validaciones

### Estados de Asignación
- **Pendiente**: Solicitud sin cliente o repartidor asignado
- **Asignado**: Solicitud con todas las entidades asignadas
- **En Proceso**: Solicitud en estado de gestión activa

### Validaciones
- Cliente y repartidor deben existir en el sistema
- Repartidor debe estar disponible
- Solicitud debe estar en estado válido para asignación

## Personalización

### Temas y Estilos
Los componentes utilizan el sistema de diseño de shadcn/ui y pueden ser personalizados mediante:
- Variables CSS personalizadas
- Clases de Tailwind CSS
- Props de estilo en los componentes

### Configuración
- Tamaños de página configurables
- Campos de búsqueda personalizables
- Validaciones personalizables
- Callbacks de eventos configurables

## Dependencias

- React 18+
- TypeScript 5+
- shadcn/ui components
- Lucide React icons
- Tailwind CSS
- Axios para API calls

## Notas de Desarrollo

- Los componentes están optimizados para rendimiento con React.memo cuando es apropiado
- Se incluye manejo de errores robusto
- Los modales son accesibles y siguen las mejores prácticas de UX
- El código está completamente tipado con TypeScript
- Se incluyen tests unitarios para funciones críticas
