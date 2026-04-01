import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export type BotSessionFlowState = {
  stage?: string | null;
  branchKey?: string | null;
  pendingFieldIds?: string[];
  draftAddress?: string;
  addressConfirmed?: boolean;
  paymentDraft?: { method?: string | null };
  collectedData?: Record<string, unknown>;
};

export function mergeSessionFlow(
  currentData: unknown,
  nextFlow: Partial<BotSessionFlowState>
): Record<string, unknown> {
  const data = currentData && typeof currentData === "object" ? { ...(currentData as Record<string, unknown>) } : {};
  const currentFlow =
    data.flow && typeof data.flow === "object" ? { ...(data.flow as Record<string, unknown>) } : {};

  data.flow = {
    ...currentFlow,
    ...nextFlow,
    pendingFieldIds: Array.isArray(nextFlow.pendingFieldIds)
      ? nextFlow.pendingFieldIds.filter(Boolean)
      : (currentFlow.pendingFieldIds as string[] | undefined),
    collectedData:
      nextFlow.collectedData && typeof nextFlow.collectedData === "object"
        ? {
            ...(currentFlow.collectedData && typeof currentFlow.collectedData === "object"
              ? (currentFlow.collectedData as Record<string, unknown>)
              : {}),
            ...nextFlow.collectedData,
          }
        : (currentFlow.collectedData as Record<string, unknown> | undefined),
    paymentDraft:
      nextFlow.paymentDraft && typeof nextFlow.paymentDraft === "object"
        ? {
            ...(currentFlow.paymentDraft && typeof currentFlow.paymentDraft === "object"
              ? (currentFlow.paymentDraft as Record<string, unknown>)
              : {}),
            ...nextFlow.paymentDraft,
          }
        : (currentFlow.paymentDraft as Record<string, unknown> | undefined),
  };

  return data;
}

function normalizePhoneDigits(input: string): string {
  return (input ?? "").replace(/[^\d+]/g, "").trim();
}

function canonicalPhoneNumber(raw: string): string {
  const t = normalizePhoneDigits(raw);
  const noPlus = t.replace(/^\+/, "");
  const digits = noPlus.replace(/\D/g, "");
  if (!digits) return t;
  if (digits.length === 10 && digits.startsWith("3")) return `+57${digits}`;
  if (digits.length === 12 && digits.startsWith("57")) return `+${digits}`;
  if (t.startsWith("+")) return t;
  return digits;
}

function phoneVariants(raw: string): string[] {
  const t = normalizePhoneDigits(raw);
  if (!t) return [];

  const noPlus = t.replace(/^\+/, "");
  const digitsOnly = noPlus.replace(/\D/g, "");

  const variants = new Set<string>();
  variants.add(t);
  variants.add(noPlus);
  if (digitsOnly) variants.add(digitsOnly);

  if (digitsOnly.length === 10 && digitsOnly.startsWith("3")) {
    variants.add(`+57${digitsOnly}`);
    variants.add(`57${digitsOnly}`);
  }

  if (digitsOnly.length === 12 && digitsOnly.startsWith("57")) {
    variants.add(`+${digitsOnly}`);
    variants.add(digitsOnly.slice(2));
  }

  return Array.from(variants).filter(Boolean);
}

export const getApplicantByContact = internalQuery({
  args: { contactId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("botApplicants")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .first();
  },
});

export const ensureApplicant = internalMutation({
  args: {
    contactId: v.string(),
    phoneNumber: v.string(),
    customerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("botApplicants")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .first();

    const now = Date.now();
    if (existing) {
      const updates: Record<string, unknown> = { updatedAt: now };
      if (!existing.fullName && args.customerName?.trim()) {
        updates.fullName = args.customerName.trim();
      }
      if (args.phoneNumber.trim()) {
        const canonicalIncoming = canonicalPhoneNumber(args.phoneNumber);
        if (!existing.phoneNumber || existing.phoneNumber !== canonicalIncoming) {
          updates.phoneNumber = canonicalIncoming;
        }
      }

      let profileId = existing.profileId ?? null;
      if (profileId) {
        const profile = await ctx.db.get(profileId);
        if (!profile) profileId = null;
      }

      const normalizedPhone = canonicalPhoneNumber(existing.phoneNumber || args.phoneNumber);
      let matchedProfile: { _id?: Id<"profiles"> } | null = null;
      for (const v of phoneVariants(normalizedPhone)) {
        matchedProfile = await ctx.db
          .query("profiles")
          .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", v))
          .first();
        if (matchedProfile) break;
      }
      if (matchedProfile?._id) {
        if (!profileId || matchedProfile._id !== profileId) {
          updates.profileId = matchedProfile._id;
        }
        updates.state = "HAS_PROFILE";
        profileId = matchedProfile._id;
      }

      if (!profileId) {
        let foundProfile: { _id?: Id<"profiles"> } | null = null;
        for (const v of phoneVariants(normalizedPhone)) {
          foundProfile = await ctx.db
            .query("profiles")
            .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", v))
            .first();
          if (foundProfile) break;
        }

        if (!foundProfile && existing.fullName && existing.documentType && existing.documentNumber) {
          const existingDoc = await ctx.db
            .query("profiles")
            .withIndex("by_documentNumber", (q) => q.eq("documentNumber", existing.documentNumber!))
            .first();
          if (existingDoc) {
            foundProfile = existingDoc;
          } else {
            const existingPhone = await ctx.db
              .query("profiles")
              .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", normalizedPhone))
              .first();
            if (existingPhone) {
              foundProfile = existingPhone;
            } else {
              const createdProfileId = await ctx.db.insert("profiles", {
                fullName: existing.fullName,
                documentType: existing.documentType,
                documentNumber: existing.documentNumber,
                phoneNumber: normalizedPhone,
                email: existing.email,
                address: existing.address,
              });
              foundProfile = await ctx.db.get(createdProfileId);
            }
          }
        }

        if (foundProfile?._id) {
          updates.profileId = foundProfile._id;
          updates.state = "HAS_PROFILE";
        } else {
          updates.state = "NEEDS_PROFILE";
        }
      } else if (!("state" in updates)) {
        updates.profileId = profileId;
        updates.state = "HAS_PROFILE";
      }

      if (Object.keys(updates).length > 1) {
        await ctx.db.patch(existing._id, updates);
      } else {
        await ctx.db.patch(existing._id, { updatedAt: now });
      }
      return existing._id;
    }

    const normalizedPhone = canonicalPhoneNumber(args.phoneNumber);
    let foundProfile: { _id?: Id<"profiles"> } | null = null;
    for (const v of phoneVariants(normalizedPhone)) {
      foundProfile = await ctx.db
        .query("profiles")
        .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", v))
        .first();
      if (foundProfile) break;
    }

    const id = await ctx.db.insert("botApplicants", {
      contactId: args.contactId,
      phoneNumber: normalizedPhone,
      profileId: foundProfile?._id,
      fullName: args.customerName?.trim() || undefined,
      state: foundProfile ? "HAS_PROFILE" : "NEEDS_PROFILE",
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const patchApplicant = internalMutation({
  args: {
    id: v.id("botApplicants"),
    fullName: v.optional(v.string()),
    documentType: v.optional(v.string()),
    documentNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    profileId: v.optional(v.id("profiles")),
    state: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await ctx.db.patch(id, { ...rest, updatedAt: Date.now() });
  },
});

export const getSessionByContact = internalQuery({
  args: { contactId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("botSessions")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .first();
  },
});

export const ensureSession = internalMutation({
  args: {
    contactId: v.string(),
    profileId: v.optional(v.id("profiles")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("botSessions")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .first();

    const now = Date.now();
    if (existing) {
      const updates: Record<string, unknown> = { updatedAt: now };
      if (args.profileId && existing.profileId !== args.profileId) {
        updates.profileId = args.profileId;
      }
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    }

    const id = await ctx.db.insert("botSessions", {
      contactId: args.contactId,
      profileId: args.profileId,
      data: {},
      attachments: [],
      state: "INIT",
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const patchSession = internalMutation({
  args: {
    id: v.id("botSessions"),
    profileId: v.optional(v.union(v.id("profiles"), v.null())),
    threadId: v.optional(v.union(v.string(), v.null())),
    serviceId: v.optional(v.union(v.id("services"), v.null())),
    fieldIds: v.optional(v.union(v.array(v.id("serviceFields")), v.null())),
    currentFieldIndex: v.optional(v.union(v.number(), v.null())),
    data: v.optional(v.any()),
    attachments: v.optional(v.any()),
    state: v.optional(v.union(v.string(), v.null())),
    pendingMediaUrl: v.optional(v.union(v.string(), v.null())),
    pendingMediaId: v.optional(v.union(v.string(), v.null())),
    pendingMediaType: v.optional(v.union(v.string(), v.null())),
    pendingMediaFilename: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const updates = buildPatchSessionUpdates(args);

    await ctx.db.patch(args.id, updates);
  },
});

export function buildPatchSessionUpdates(args: {
  id: Id<"botSessions">;
  profileId?: Id<"profiles"> | null;
  threadId?: string | null;
  serviceId?: Id<"services"> | null;
  fieldIds?: Id<"serviceFields">[] | null;
  currentFieldIndex?: number | null;
  data?: unknown;
  attachments?: unknown;
  state?: string | null;
  pendingMediaUrl?: string | null;
  pendingMediaId?: string | null;
  pendingMediaType?: string | null;
  pendingMediaFilename?: string | null;
}): Record<string, unknown> {
  const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (Object.prototype.hasOwnProperty.call(args, "profileId")) {
      updates.profileId = args.profileId ?? undefined;
    }
    if (Object.prototype.hasOwnProperty.call(args, "threadId")) {
      updates.threadId = args.threadId ?? undefined;
    }
    if (Object.prototype.hasOwnProperty.call(args, "serviceId")) {
      updates.serviceId = args.serviceId ?? undefined;
    }
    if (Object.prototype.hasOwnProperty.call(args, "fieldIds")) {
      updates.fieldIds = args.fieldIds ?? undefined;
    }
    if (Object.prototype.hasOwnProperty.call(args, "currentFieldIndex")) {
      updates.currentFieldIndex = args.currentFieldIndex ?? undefined;
    }
    if (Object.prototype.hasOwnProperty.call(args, "data")) {
      updates.data = args.data;
    }
    if (Object.prototype.hasOwnProperty.call(args, "attachments")) {
      updates.attachments = args.attachments;
    }
    if (Object.prototype.hasOwnProperty.call(args, "state")) {
      updates.state = args.state ?? undefined;
    }
    if (Object.prototype.hasOwnProperty.call(args, "pendingMediaUrl")) {
      updates.pendingMediaUrl = args.pendingMediaUrl ?? undefined;
    }
    if (Object.prototype.hasOwnProperty.call(args, "pendingMediaId")) {
      updates.pendingMediaId = args.pendingMediaId ?? undefined;
    }
    if (Object.prototype.hasOwnProperty.call(args, "pendingMediaType")) {
      updates.pendingMediaType = args.pendingMediaType ?? undefined;
    }
    if (Object.prototype.hasOwnProperty.call(args, "pendingMediaFilename")) {
      updates.pendingMediaFilename = args.pendingMediaFilename ?? undefined;
    }

  return updates;
}

export const clearProfileAssociationForContact = internalMutation({
  args: { contactId: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();

    const applicant = await ctx.db
      .query("botApplicants")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .first();
    if (applicant) {
      await ctx.db.patch(applicant._id, { profileId: undefined, state: "NEEDS_PROFILE", updatedAt: now });
    }

    const session = await ctx.db
      .query("botSessions")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .first();
    if (session) {
      await ctx.db.patch(session._id, { profileId: undefined, updatedAt: now });
    }

    return { ok: true };
  },
});

export const createRequestShareLink = internalMutation({
  args: {
    token: v.string(),
    requestId: v.id("requests"),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("requestShareLinks", {
      token: args.token,
      requestId: args.requestId,
      createdAt: now,
      expiresAt: args.expiresAt,
    });
    return id;
  },
});

export const getRequestIdByShareToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("requestShareLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!link) return null;
    if (link.expiresAt && Date.now() > link.expiresAt) return null;
    return link.requestId;
  },
});
