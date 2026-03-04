# Integración con Convex

Este documento detalla la integración con el backend de Convex y lista todas las funciones (queries y mutations) disponibles para la aplicación.

## Configuración de Entorno

Para conectar con el deployment de desarrollo, asegúrate de tener las siguientes variables en tu archivo `.env`:

```bash
# Deployment de desarrollo
CONVEX_DEPLOYMENT="dev:precious-camel-841"
VITE_CONVEX_URL="https://precious-camel-841.convex.cloud"
VITE_CONVEX_SITE_URL="https://precious-camel-841.convex.site"
```

## Configuración Inicial

La aplicación utiliza un componente `ConvexClientProvider` para manejar la autenticación y conexión con Convex.

```tsx
// src/components/ConvexClientProvider.tsx
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthProvider client={convex}>
      {children}
    </ConvexAuthProvider>
  );
}
```

En `src/main.tsx`, la aplicación está envuelta con este proveedor:

```tsx
import { ConvexClientProvider } from "./components/ConvexClientProvider";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <ConvexClientProvider>
      <App />
    </ConvexClientProvider>
    <Toaster richColors position="top-center" />
  </BrowserRouter>
);
```

## Cambios Recientes (Refactorización)

Se ha completado la migración de la lógica de cliente para eliminar dependencias de `API_BASE_URL` y el cliente REST heredado (`axios`).

### 1. Eliminación de `API_BASE_URL`
- Se han eliminado todas las referencias a `API_BASE_URL` en los componentes.
- El archivo `src/api/index.ts` que exportaba la instancia de `axios` está marcado como obsoleto y se recomienda no utilizarlo.

### 2. Migración de Componentes Clave
- **Login (`src/features/auth/pages/login.tsx`)**: Ahora utiliza `useAuthActions` de `@convex-dev/auth` para `signIn` en lugar de `axios.post`.
- **Nueva Solicitud (`src/features/home/components/new-request-modal.tsx`)**: Refactorizado para usar `useMutation(api.requests.create)` y `useMutation(api.files.generateUploadUrl)` en lugar de endpoints REST.
- **Otros Componentes**: Varios componentes (`customer-detail-view`, `customer-form`, `distributor-request-card`, etc.) han sido limpiados de importaciones no utilizadas de la configuración antigua.

## Módulos y Funciones

A continuación se listan las funciones disponibles agrupadas por archivo/módulo.

### 1. Autenticación (`convex/auth.ts`)
Maneja la autenticación de usuarios utilizando `@convex-dev/auth`.

| Función | Tipo | Descripción |
|---------|------|-------------|
| `signIn` | Action | Inicia sesión (ej. con contraseña). |
| `signOut` | Action | Cierra la sesión actual. |

### 2. Distribuidores (`convex/distributors.ts`)
Gestión de distribuidores.

| Función | Tipo | Argumentos | Descripción |
|---------|------|------------|-------------|
| `list` | Query | `status` (bool), `coverageAreaId` (id), `transportationTypeId` (id), `paymentStatus` (string), `search` (string), `paginationOpts` | Lista distribuidores con filtros y paginación. Incluye datos de usuario, área y transporte. |
| `create` | Mutation | `userId` (id), `email` (string), `documentNumber` (string), `coverageAreaId` (id), `transportationTypeId` (id) | Crea un nuevo distribuidor. Verifica unicidad del número de documento. |

### 3. Archivos (`convex/files.ts`)
Manejo de subida y recuperación de archivos.

| Función | Tipo | Argumentos | Descripción |
|---------|------|------------|-------------|
| `generateUploadUrl` | Mutation | - | Genera una URL temporal para subir un archivo a Convex Storage. |
| `getFileUrl` | Query | `storageId` (id) | Obtiene la URL pública de un archivo almacenado. |

### 4. Pagos (`convex/payments.ts`)
Registro de pagos asociados a solicitudes.

| Función | Tipo | Argumentos | Descripción |
|---------|------|------------|-------------|
| `create` | Mutation | `title` (string), `totalAmount` (number), `requestIds` (array<id>) | Registra un pago y lo vincula a una o más solicitudes. |
| `list` | Query | - | Lista todos los pagos registrados. |

### 5. Perfiles (`convex/profiles.ts`)
Gestión de perfiles de usuario.

| Función | Tipo | Argumentos | Descripción |
|---------|------|------------|-------------|
| `getMe` | Query | - | Obtiene el perfil y roles del usuario autenticado. |
| `updateMe` | Mutation | `fullName`, `documentType`, `documentNumber`, `phoneNumber`, `address`, `birthDate`, `gender`, `documentStorageId` | Actualiza los datos del perfil del usuario actual. |
| `create` | Mutation | `userId`, `fullName`, `documentType`, `documentNumber`, `phoneNumber`, `address`, `birthDate`, `gender`, `role` | Crea un perfil (uso interno, normalmente al registrarse). Asigna rol si se especifica. |

### 6. Solicitudes (`convex/requests.ts`)
Gestión central de las solicitudes (trámites).

| Función | Tipo | Argumentos | Descripción |
