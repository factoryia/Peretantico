import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // Role management
  roles: defineTable({
    name: v.string(), // e.g. "Repartidor", "Usuario", "Admin"
  }).index("by_name", ["name"]),

  userRoles: defineTable({
    userId: v.id("users"),
    roleId: v.id("roles"),
  })
    .index("by_user", ["userId"])
    .index("by_role", ["roleId"])
    .index("by_user_role", ["userId", "roleId"]),

  // User Profiles
  profiles: defineTable({
    fullName: v.string(),
    documentType: v.string(), // Enum: CC, CE, TI, PASSPORT, NIT
    documentNumber: v.string(),
    phoneNumber: v.string(),
    email: v.optional(v.string()),
    userId: v.optional(v.id("users")), // Link to AuthUser
    address: v.optional(v.string()),
    birthDate: v.optional(v.string()), // DateTime in Prisma, string or number here
    gender: v.optional(v.string()),
    parentStatus: v.optional(v.string()),
    department: v.optional(v.string()),
    municipality: v.optional(v.string()),
    // For file upload (profile image/doc)
    documentStorageId: v.optional(v.id("_storage")),
  })
    .index("by_documentNumber", ["documentNumber"])
    .index("by_phoneNumber", ["phoneNumber"])
    .index("by_userId", ["userId"]),

  // Services and dynamic fields
  services: defineTable({
    name: v.string(),
    code: v.optional(v.string()),
    category: v.optional(
      v.union(
        v.literal("salud"),
        v.literal("notarial"),
        v.literal("catastral"),
        v.literal("logistica")
      )
    ),
    description: v.optional(v.string()),
    price: v.number(),
    status: v.boolean(),
    workflowMode: v.optional(v.union(v.literal("legacy"), v.literal("deterministic"))),
    workflowConfig: v.optional(v.any()),
    // Priority support fields
    hasPriority: v.optional(v.boolean()),
    priorityPrice: v.optional(v.number()),
    estimatedHours: v.optional(v.number()),
    priorityHours: v.optional(v.number()),
  })
    .index("by_name", ["name"])
    .index("by_code", ["code"])
    .index("by_category", ["category"]),

  serviceFields: defineTable({
    serviceId: v.id("services"),
    name: v.string(),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.string(), // Enum: Text, Number, Date, Boolean, Select, File
    required: v.boolean(),
    multiple: v.boolean(),
    options: v.optional(v.any()), // JSON for Select options
    settings: v.optional(v.any()), // JSON for settings
    order: v.number(),
    status: v.boolean(),
  }).index("by_service", ["serviceId"]),

  // Requests
  requests: defineTable({
    applicationNumber: v.string(), // Unique, REQ-XXXXXX
    applicantId: v.id("profiles"),
    serviceId: v.id("services"),
    distributorId: v.optional(v.id("distributors")),
    
    title: v.optional(v.string()),
    observations: v.optional(v.string()),
    
    // Status flags
    status: v.boolean(), // Default true (Active)
    requestStatus: v.string(), // Enum: Atendida, EnProceso, Finalizada, Incompleta
    
    // Boolean flags
    isPrioritized: v.boolean(),
    promote: v.boolean(),
    sticky: v.boolean(),
    isRecurring: v.boolean(),
    
    // Financials
    logisticsCosts: v.optional(v.number()),
    serviceValue: v.optional(v.number()),
    prioritizedValue: v.optional(v.number()),
    paymentMethod: v.optional(v.string()),
    addressSnapshot: v.optional(v.object({
      raw: v.string(),
      source: v.union(v.literal("profile"), v.literal("user_edit")),
      confirmedAt: v.number(),
    })),
    flowStatus: v.optional(v.string()),
    paymentStatus: v.optional(v.string()),
    receiptAttachmentIds: v.optional(v.array(v.id("attachments"))),
    adminValidationStatus: v.optional(v.string()),
    adminValidationAt: v.optional(v.number()),
    adminValidationBy: v.optional(v.id("users")),
    adminValidationReason: v.optional(v.string()),
    
    // Timings
    entryDate: v.number(), // Timestamp
    estimatedApplicationHour: v.optional(v.number()),
    estimatedPrioritizedHour: v.optional(v.number()),
    
    applicationScore: v.optional(v.number()),
    
    // Evidence
    evidenceStorageId: v.optional(v.id("_storage")),
    evidenceUrl: v.optional(v.string()), // For legacy or external URLs
  })
    .index("by_applicationNumber", ["applicationNumber"])
    .index("by_applicant", ["applicantId"])
    .index("by_service", ["serviceId"])
    .index("by_distributor", ["distributorId"])
    .index("by_status", ["status"])
    .index("by_requestStatus", ["requestStatus"])
    .searchIndex("search_requests", {
      searchField: "title",
      filterFields: ["applicationNumber", "applicantId", "distributorId"],
    }),

  requestData: defineTable({
    requestId: v.id("requests"),
    fieldId: v.id("serviceFields"),
    value: v.any(), // JSON
  })
    .index("by_request", ["requestId"])
    .index("by_field", ["fieldId"])
    .index("by_request_field", ["requestId", "fieldId"]),

  attachments: defineTable({
    requestId: v.optional(v.id("requests")),
    profileId: v.optional(v.id("profiles")),
    fieldId: v.optional(v.id("serviceFields")),
    kind: v.optional(v.string()),
    fileName: v.string(),
    url: v.string(), // Legacy URL support
    mimeType: v.optional(v.string()),
    size: v.optional(v.number()),
    storageId: v.optional(v.id("_storage")), // Convex Storage ID
  })
    .index("by_request", ["requestId"])
    .index("by_profile", ["profileId"]),

  // Distributors
  distributors: defineTable({
    userId: v.optional(v.id("users")),
    title: v.string(),
    documentNumber: v.string(),
    documentType: v.string(),
    phoneNumber: v.string(),
    email: v.optional(v.string()),
    entryDate: v.number(),
    vehicleId: v.optional(v.string()),
    observations: v.optional(v.string()),
    
    coverageAreaId: v.optional(v.id("coverageAreas")),
    transportationTypeId: v.optional(v.id("transportationTypes")),
    
    status: v.boolean(),
    currentAvailability: v.boolean(),
  })
    .index("by_userId", ["userId"])
    .index("by_documentNumber", ["documentNumber"])
    .index("by_coverageArea", ["coverageAreaId"])
    .index("by_transportationType", ["transportationTypeId"]),

  coverageAreas: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    status: v.boolean(),
  }),

  transportationTypes: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    status: v.boolean(),
  }),

  // Special Dates
  specialDates: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    date: v.string(),
    repeat: v.boolean(),
    status: v.boolean(),
  })
    .index("by_date", ["date"])
    .searchIndex("search_title", {
      searchField: "title",
    }),

  // Payments
  payments: defineTable({
    title: v.string(),
    observations: v.optional(v.string()),
    baseValue: v.optional(v.number()),
    additionalAmount: v.optional(v.number()),
    discountAmount: v.optional(v.number()),
    totalAmount: v.optional(v.number()),
    status: v.optional(v.string()),
    distributorId: v.optional(v.id("distributors")),
  }).index("by_distributor", ["distributorId"]),

  paymentRequests: defineTable({
    paymentId: v.id("payments"),
    requestId: v.id("requests"),
  })
    .index("by_payment", ["paymentId"])
    .index("by_request", ["requestId"]),

  ycloudStatus: defineTable({
    connected: v.boolean(),
    connectedAt: v.optional(v.number()),
    updatedAt: v.number(),
  }),

  ycloudProcessedEvents: defineTable({
    eventId: v.string(),
  }).index("by_event_id", ["eventId"]),

  ycloudProcessingLocks: defineTable({
    contactId: v.string(),
    lockedUntil: v.number(),
    ownerEventId: v.string(),
    updatedAt: v.number(),
  }).index("by_contact", ["contactId"]),

  ycloudMessages: defineTable({
    contactId: v.string(),
    direction: v.union(v.literal("INBOUND"), v.literal("OUTBOUND")),
    customerName: v.optional(v.string()),
    content: v.string(),
    mediaUrl: v.optional(v.string()),
    mediaId: v.optional(v.string()),
    mediaStorageId: v.optional(v.id("_storage")),
    mediaType: v.optional(
      v.union(
        v.literal("image"),
        v.literal("video"),
        v.literal("audio"),
        v.literal("document")
      )
    ),
    providerMessageId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_contact", ["contactId"])
    .index("by_contact_created", ["contactId", "createdAt"]),

  ycloudHandoffs: defineTable({
    contactId: v.string(),
    muted: v.boolean(),
    mutedUntil: v.optional(v.number()),
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("users")),
  }).index("by_contact", ["contactId"]),

  conversations: defineTable({
    contactId: v.string(),
    channel: v.union(v.literal("whatsapp")),
    customerName: v.optional(v.string()),
    status: v.union(v.literal("open"), v.literal("pending"), v.literal("closed")),
    threadId: v.optional(v.string()),
    lastMessageAt: v.number(),
    lastMessagePreview: v.optional(v.string()),
    lastMessageDirection: v.optional(v.union(v.literal("INBOUND"), v.literal("OUTBOUND"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_contact", ["contactId"])
    .index("by_thread", ["threadId"])
    .index("by_last_message_at", ["lastMessageAt"]),

  botApplicants: defineTable({
    contactId: v.string(),
    phoneNumber: v.string(),
    profileId: v.optional(v.id("profiles")),
    fullName: v.optional(v.string()),
    documentType: v.optional(v.string()),
    documentNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    state: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_contact", ["contactId"])
    .index("by_phone", ["phoneNumber"])
    .index("by_profile", ["profileId"]),

  botSessions: defineTable({
    contactId: v.string(),
    profileId: v.optional(v.id("profiles")),
    threadId: v.optional(v.string()),
    serviceId: v.optional(v.id("services")),
    fieldIds: v.optional(v.array(v.id("serviceFields"))),
    currentFieldIndex: v.optional(v.number()),
    data: v.any(),
    attachments: v.any(),
    pendingMediaStorageId: v.optional(v.id("_storage")),
    pendingMediaStorageIds: v.optional(v.array(v.id("_storage"))),
    pendingMediaUrl: v.optional(v.string()),
    pendingMediaId: v.optional(v.string()),
    pendingMediaType: v.optional(v.string()),
    pendingMediaFilename: v.optional(v.string()),
    mediaDebounceUntil: v.optional(v.number()),
    state: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_contact", ["contactId"])
    .index("by_profile", ["profileId"]),

  requestShareLinks: defineTable({
    token: v.string(),
    requestId: v.id("requests"),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
  })
    .index("by_token", ["token"])
    .index("by_request", ["requestId"]),

  // ─── Queue System ─────────────────────────────────────────────
  // Inbound queue: webhooks encolados para procesamiento asíncrono
  inboundQueue: defineTable({
    eventId: v.string(),
    contactId: v.string(),
    customerName: v.optional(v.string()),
    text: v.string(),
    mediaUrl: v.optional(v.string()),
    mediaId: v.optional(v.string()),
    mediaType: v.optional(
      v.union(v.literal("image"), v.literal("video"), v.literal("audio"), v.literal("document"))
    ),
    mediaFilename: v.optional(v.string()),
    // Debounce/batching fields
    debounceUntil: v.optional(v.number()), // timestamp until which to wait
    batchedText: v.optional(v.string()), // accumulated text from multiple messages
    batchedMediaIds: v.optional(v.array(v.string())), // accumulated YCloud media IDs
    batchedMediaUrls: v.optional(v.array(v.string())), // accumulated YCloud media URLs for download
    batchedMediaTypes: v.optional(v.array(v.string())), // accumulated media types
    hasMedia: v.optional(v.boolean()),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("done"),
      v.literal("error"),
      v.literal("dead")
    ),
    attempts: v.number(),
    maxAttempts: v.number(),
    priority: v.union(v.literal("high"), v.literal("normal"), v.literal("low")),
    error: v.optional(v.string()),
    enqueuedAt: v.number(),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    nextRetryAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_status_priority", ["status", "priority"])
    .index("by_eventId", ["eventId"])
    .index("by_contactId_status", ["contactId", "status"])
    .index("by_nextRetryAt", ["nextRetryAt"]),

  // Outbound queue: respuestas salientes a WhatsApp
  outboundQueue: defineTable({
    contactId: v.string(),
    customerName: v.optional(v.string()),
    content: v.string(),
    mediaStorageId: v.optional(v.id("_storage")),
    mediaType: v.optional(
      v.union(v.literal("image"), v.literal("video"), v.literal("audio"), v.literal("document"))
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("done"),
      v.literal("error"),
      v.literal("dead")
    ),
    attempts: v.number(),
    maxAttempts: v.number(),
    error: v.optional(v.string()),
    enqueuedAt: v.number(),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    nextRetryAt: v.optional(v.number()),
    providerMessageId: v.optional(v.string()),
    // Reference to the inbound event that triggered this reply
    inboundQueueId: v.optional(v.id("inboundQueue")),
  })
    .index("by_status", ["status"])
    .index("by_contactId_status", ["contactId", "status"])
    .index("by_nextRetryAt", ["nextRetryAt"]),

  // Dead letter queue: mensajes irrecuperables para revisión manual
  deadLetterQueue: defineTable({
    sourceTable: v.union(v.literal("inboundQueue"), v.literal("outboundQueue")),
    sourceId: v.optional(v.string()),
    eventId: v.optional(v.string()),
    contactId: v.optional(v.string()),
    payload: v.any(),
    error: v.string(),
    attempts: v.number(),
    firstEnqueuedAt: v.number(),
    deadAt: v.number(),
  })
    .index("by_sourceTable", ["sourceTable"])
    .index("by_contactId", ["contactId"])
    .index("by_deadAt", ["deadAt"]),

  // Queue metrics: contadores para observabilidad
  queueMetrics: defineTable({
    period: v.string(), // "YYYY-MM-DD-HH" for hourly buckets
    inboundEnqueued: v.number(),
    inboundProcessed: v.number(),
    inboundErrored: v.number(),
    inboundDead: v.number(),
    outboundEnqueued: v.number(),
    outboundProcessed: v.number(),
    outboundErrored: v.number(),
    outboundDead: v.number(),
    avgProcessingMs: v.optional(v.number()),
  })
    .index("by_period", ["period"]),
});
