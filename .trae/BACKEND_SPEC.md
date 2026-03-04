# Especificación Técnica del Backend - Peretantico API

Este documento proporciona una especificación técnica detallada del backend actual de Peretantico para facilitar su recreación en una tecnología diferente.

## 1. Visión General del Sistema

- **Framework**: NestJS (v11.x)
- **Lenguaje**: TypeScript
- **Base de Datos**: PostgreSQL
- **ORM**: Prisma
- **Autenticación**: JWT (Passport + Better Auth)
- **Documentación API**: Swagger (OpenAPI)
- **Validación**: Class Validator + Class Transformer
- **Almacenamiento de Archivos**: Sistema de archivos local (Disk Storage)

### Estructura del Proyecto
El proyecto sigue una arquitectura modular estándar de NestJS:
- `src/app.module.ts`: Módulo raíz que importa todos los submódulos.
- `src/main.ts`: Punto de entrada, configuración de Swagger, Pipes globales y CORS.
- `src/prisma/`: Configuración y servicio de Prisma.
- `src/generated/`: Cliente de Prisma generado.
- `src/[module]/`: Cada dominio de negocio (Auth, Requests, Services, etc.) tiene su propio módulo con Controller, Service y DTOs.

## 2. Esquema de Base de Datos

El modelo de datos está definido en Prisma. A continuación se detallan las tablas y relaciones.

### Enums
- **FieldType**: Text, Number, Date, Boolean, Select, File
- **DocumentType**: CC, CE, TI, PASSPORT, NIT
- **RequestStatus**: Atendida, EnProceso, Finalizada, Incompleta

### Modelos (Tablas)

#### `AuthUser` (auth_user)
Usuario principal del sistema.
- `id` (String, PK, UUID)
- `name` (String)
- `email` (String, Unique)
- `emailVerified` (Boolean, Nullable)
- `image` (String, Nullable)
- `roles` (Relación One-to-Many con `UserRole`)
- `createdAt`, `updatedAt` (DateTime)

#### `AuthSession` (auth_session)
Sesiones de usuario.
- `id` (String, PK, UUID)
- `userId` (String, FK -> AuthUser)
- `token` (String, Unique)
- `expiresAt` (DateTime)
- `ipAddress`, `userAgent` (String, Nullable)

#### `Role`
Roles del sistema (ej. "Repartidor", "Usuario").
- `id` (String, PK, UUID)
- `name` (String, Unique)

#### `UserRole`
Tabla pivote para relación Many-to-Many entre `AuthUser` y `Role`.
- `userId` (String, FK)
- `roleId` (String, FK)
- PK compuesta: `[userId, roleId]`

#### `Profile`
Perfil extendido del usuario.
- `id` (String, PK, UUID)
- `fullName` (String)
- `documentType` (Enum DocumentType)
- `documentNumber` (String, Unique)
- `phoneNumber` (String)
- `userId` (String, Unique, FK -> AuthUser, Nullable)
- `address`, `birthDate`, `gender` (Campos adicionales)

#### `Service`
Servicios ofrecidos.
- `id` (String, PK, UUID)
- `name` (String, Unique)
- `code` (String, Unique, Nullable)
- `price` (Int, Default: 0)
- `status` (Boolean, Default: true)
- `fields` (Relación One-to-Many con `ServiceField`)

#### `ServiceField`
Campos dinámicos configurables por servicio.
- `id` (String, PK, UUID)
- `serviceId` (String, FK -> Service)
- `name` (String)
- `type` (Enum FieldType)
- `required` (Boolean)
- `options` (JSON, para campos tipo Select)
- `order` (Int)

#### `Request`
Solicitudes de servicio.
- `id` (String, PK, UUID)
- `applicationNumber` (String, Unique, Formato: `REQ-XXXXXX`)
- `applicantId` (String, FK -> Profile)
- `serviceId` (String, FK -> Service)
- `distributorId` (String, FK -> Distributor, Nullable)
- `status` (Boolean, Default: true)
- `requestStatus` (Enum RequestStatus, Default: EnProceso)
- `entryDate` (DateTime)
- `isPrioritized` (Boolean, Default: false)
- `data` (Relación One-to-Many con `RequestData` - valores de campos dinámicos)
- `attachments` (Relación One-to-Many con `Attachment`)

#### `RequestData`
Valores de los campos dinámicos de una solicitud.
- `id` (String, PK, UUID)
- `requestId` (String, FK -> Request)
- `fieldId` (String, FK -> ServiceField)
- `value` (JSON)

#### `Distributor`
Repartidores/Distribuidores.
- `id` (String, PK, UUID)
- `userId` (String, Unique, FK -> AuthUser, Nullable)
- `documentNumber` (String, Unique)
- `coverageAreaId` (String, FK -> CoverageArea)
- `transportationTypeId` (String, FK -> TransportationType)
- `status` (Boolean, Default: true)
- `currentAvailability` (Boolean, Default: true)

#### `CoverageArea` & `TransportationType`
Catálogos para clasificadores de distribuidores.

#### `Payment`
Registros de pagos.
- `id` (String, PK, UUID)
- `title` (String)
- `totalAmount` (Decimal)
- `requests` (Relación Many-to-Many con `Request` vía `PaymentRequest`)

## 3. Documentación de Endpoints

### Autenticación (`/api/v1/auth`)

La autenticación es híbrida, utilizando la librería `better-auth` para la gestión de credenciales y `passport-jwt` para la gestión de sesiones API.

#### `POST /register`
Registra un nuevo usuario y crea su perfil asociado.
- **Body**:
  ```json
  {
    "name": "string",
    "email": "email",
    "password": "string (min 6)",
    "role": "Role Enum (optional)",
    "fullName": "string",
    "documentType": "DocumentType Enum",
    "documentNumber": "string",
    "phoneNumber": "string",
    "birthDate": "YYYY-MM-DD",
    "address": "string"
  }
  ```
- **Lógica Actual**:
  1. Verifica si el email ya existe en `AuthUser`.
  2. Llama a `betterAuth.api.signUpEmail` para crear la cuenta (maneja hashing de contraseña y almacenamiento en `AuthAccount`).
  3. **Nota**: El código actual intenta crear explícitamente el usuario en `AuthUser` mediante Prisma después de la llamada a `better-auth`. Esto podría generar conflictos de unicidad (email) si `better-auth` ya persistió el registro en la misma tabla `auth_user`. En una reimplementación, se debe asegurar que la creación del usuario sea atómica y correcta.
  4. Crea el `Profile` asociado y asigna el rol (`UserRole`).

#### `POST /login`
Inicia sesión.
- **Body**: `{ "email": "string", "password": "string" }`
- **Lógica**:
  1. Llama a `betterAuth.api.signInEmail` para validar credenciales (password).
  2. Recupera el usuario de Prisma usando el ID devuelto por `better-auth`.
  3. Genera un token JWT estándar de NestJS (`@nestjs/jwt`) con el payload `{ sub: userId, email, roles }`.
- **Response**: `{ "access_token": "JWT..." }`.

#### `GET /me`
Obtiene el perfil del usuario actual.
- **Headers**: `Authorization: Bearer <token>`

### Solicitudes (`/api/v1/requests`)

#### `GET /`
Lista solicitudes con filtros avanzados.
- **Query Params**:
  - `status`: boolean
  - `serviceId`: UUID
  - `distributorId`: UUID
  - `userId`: UUID (filtra por usuario distribuidor)
  - `applicationNumber`: string (búsqueda parcial)
  - `periodo`: "Hoy", "Esta Semana", "Este Mes", "Mes Pasado", "Todo el tiempo"
  - `zonaId`: UUID (filtra por área de cobertura del distribuidor)
  - `isPrioritized`: boolean
  - `paymentStatus`: "pagado" | "pendiente"
  - `search`: string (busca en título, número solicitud, nombre solicitante, distribuidor)

#### `POST /`
Crea una nueva solicitud.
- **Body**:
  ```json
  {
    "applicantId": "UUID",
    "serviceId": "UUID",
    "title": "string",
    "entryDate": "ISO Date",
    "data": [ { "fieldId": "UUID", "value": JSON } ],
    "attachments": [ { "fileName": "string", "url": "string" } ],
    "attachment": "string (filename opcional para perfil)"
  }
  ```
- **Lógica**: Genera `applicationNumber` único (`REQ-` + 6 dígitos aleatorios).

#### `GET /:id`
Obtiene detalle de una solicitud. Incluye relaciones: applicant, distributor, service, data (con field definition), attachments, payments.

#### `PUT /:id`
Actualiza una solicitud completa. Permite actualizar campos dinámicos (`data`) mediante `upsert`.

#### `PATCH /:id/assign`
Asigna un distribuidor.
- **Body**: `{ "distributorId": "UUID" }`
- **Lógica**: Actualiza `distributorId` y pone `requestStatus` en `EnProceso`.

#### `PATCH /:id/status`
Actualiza estado.
- **Body**: `{ "status": boolean, "requestStatus": Enum, "observations": string }`

### Servicios (`/api/v1/services`)

#### `GET /`
Lista todos los servicios activos con sus campos ordenados.

#### `GET /lite`
Lista ligera (solo ID y nombre).

#### `POST /`
Crea servicio con sus campos.
- **Body**: Estructura anidada para crear `Service` y `ServiceField`s en una sola operación.

### Distribuidores (`/api/v1/distributors`)

#### `GET /`
Lista paginada de distribuidores.
- **Query Params**: `page`, `limit`, `status`, `search`, `coverageAreaId`, `transportationTypeId`, `paymentStatus`.
- **Lógica de `paymentStatus`**:
  - "pendiente": Tiene solicitudes "EnProceso" sin pagos.
  - "pagado": Tiene pagos asociados.

#### `POST /`
Crea distribuidor.
- **Lógica**: Puede asociar un `userId` existente o crear un nuevo `AuthUser` (con rol "Repartidor") si se proporciona `email` pero no `userId`.

### Archivos (`/api/v1`)

#### `POST /uploads/profile-documents`
Sube archivo genérico.
- **Headers**: `Content-Type: multipart/form-data`
- **Body**: `file` (Binary)
- **Response**: `{ "url": "...", "fileName": "...", "mimeType": "...", "size": ... }`
- **Almacenamiento**: `uploads/profile-documents/{uuid}.{ext}`

#### `POST /file/upload/media/image/field_media_image` (Legacy)
Endpoint de compatibilidad para subidas (posiblemente para integración con Drupal o frontend legacy).
- Soporta `multipart/form-data` y subida binaria `application/octet-stream`.

## 4. Lógica de Negocio y Reglas

### Validación de Datos
- Se utiliza `ValidationPipe` global con `whitelist: true`.
- Los DTOs usan decoradores `class-validator` (`IsString`, `IsUUID`, `IsOptional`, etc.).
- Campos dinámicos de solicitudes (`RequestData`) almacenan valores en JSON pero referencian una definición de campo (`ServiceField`).

### Manejo de Errores
- Excepciones estándar de NestJS: `NotFoundException` (404), `BadRequestException` (400).
- Validaciones fallidas retornan 400 con detalles de los campos erróneos.

### Autenticación
- Estrategia JWT Bearer.
- Token expira en 7 días.
- Clave secreta configurable via `JWT_SECRET`.

### Paginación
- Implementada manualmente en controladores como `Distributors` y `Profiles`.
- Parámetros estándar: `page` (default 1), `limit` (default 10).
- Respuesta: `{ data: [], total: number, page: number, limit: number }`.

## 5. Configuración e Infraestructura

### Variables de Entorno (.env)
- `DATABASE_URL`: Conexión a PostgreSQL.
- `JWT_SECRET`: Secreto para firma de tokens.
- `PORT`: Puerto del servidor (default 3000).

### Dependencias Críticas
- `@nestjs/core`, `@nestjs/common`: Framework base.
- `@prisma/client`: Acceso a datos.
- `passport`, `passport-jwt`: Seguridad.
- `multer`: Manejo de subida de archivos.
- `class-validator`: Validación de inputs.

### Middleware
- `Cors`: Habilitado para cualquier origen (`origin: true`), credenciales permitidas.
- `Prefix`: `/api/v1` global.

## 6. Pruebas
- El proyecto tiene configuración para Jest (`npm run test`) y E2E (`npm run test:e2e`).
- **Nota**: No se encontraron archivos de prueba unitaria (`.spec.ts`) personalizados en el código fuente explorado, solo la configuración base. Se recomienda implementar tests para los flujos críticos (Creación de Solicitud, Asignación de Distribuidor) en la nueva implementación.

## 7. Pasos para Recreación
1.  Configurar base de datos PostgreSQL con el esquema Prisma proporcionado.
2.  Implementar autenticación JWT con los mismos tiempos de expiración y secreto.
3.  Replicar la estructura de tablas, especialmente el manejo de campos dinámicos (`ServiceField` -> `RequestData`).
4.  Implementar endpoints de API respetando las rutas `/api/v1/...` y las estructuras JSON de entrada/salida.
5.  Asegurar que la lógica de generación de `applicationNumber` sea única y siga el formato `REQ-XXXXXX`.
6.  Configurar almacenamiento local de archivos en `uploads/profile-documents` y servir archivos estáticos si es necesario (el endpoint actual usa `res.sendFile`).
