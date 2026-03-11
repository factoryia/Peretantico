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
    description: v.optional(v.string()),
    price: v.number(),
    status: v.boolean(),
  })
    .index("by_name", ["name"])
    .index("by_code", ["code"]),

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
});
