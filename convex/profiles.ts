import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

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

export const list = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();

    // Fetch roles for each profile
    const profilesWithRoles = await Promise.all(
      profiles.map(async (profile) => {
        const userRoles = await ctx.db
          .query("userRoles")
          .withIndex("by_user", (q) => q.eq("userId", profile.userId!))
          .collect();

        const roles = await Promise.all(
          userRoles.map((ur) => ctx.db.get(ur.roleId))
        );

        return {
          ...profile,
          roles: roles.filter((r) => r !== null).map((r) => r!.name),
        };
      })
    );

    return profilesWithRoles;
  },
});

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    
    // Also fetch roles
    const userRoles = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    const roles = await Promise.all(
      userRoles.map((ur) => ctx.db.get(ur.roleId))
    );

    return { ...profile, roles: roles.filter(r => r !== null) };
  },
});

export const get = query({
  args: { id: v.id("profiles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const updateMe = mutation({
  args: {
    fullName: v.optional(v.string()),
    documentType: v.optional(v.string()),
    documentNumber: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    address: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    gender: v.optional(v.string()),
    documentStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!profile) throw new Error("Profile not found");

    await ctx.db.patch(profile._id, args);
  },
});

export const remove = mutation({
  args: { id: v.id("profiles") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const update = mutation({
  args: {
    id: v.id("profiles"),
    fullName: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, role, ...updates } = args;
    
    // Update profile fields
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(id, updates);
    }

    // Update role if provided
    if (role) {
      const profile = await ctx.db.get(id);
      if (!profile || !profile.userId) return;

      const userId = profile.userId;

      // Find the role ID
      const roleDoc = await ctx.db
        .query("roles")
        .withIndex("by_name", (q) => q.eq("name", role))
        .first();

      if (!roleDoc) {
        console.error(`Role ${role} not found`);
        return;
      }

      // Remove existing roles for this user
      const existingUserRoles = await ctx.db
        .query("userRoles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      for (const userRole of existingUserRoles) {
        await ctx.db.delete(userRole._id);
      }

      // Assign new role
      await ctx.db.insert("userRoles", {
        userId: profile.userId,
        roleId: roleDoc._id,
      });
    }
  },
});

// Internal mutation to create profile (called during registration)
export const create = mutation({
  args: {
    userId: v.id("users"),
    fullName: v.string(),
    documentType: v.string(),
    documentNumber: v.string(),
    phoneNumber: v.string(),
    address: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    gender: v.optional(v.string()),
    role: v.optional(v.string()), // Role name to assign
  },
  handler: async (ctx, args) => {
    // Check if profile exists
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    if (existing) throw new Error("Profile already exists");

    await ctx.db.insert("profiles", {
      userId: args.userId,
      fullName: args.fullName,
      documentType: args.documentType,
      documentNumber: args.documentNumber,
      phoneNumber: args.phoneNumber,
      address: args.address,
      birthDate: args.birthDate,
      gender: args.gender,
    });

    if (args.role) {
      const role = await ctx.db
        .query("roles")
        .withIndex("by_name", (q) => q.eq("name", args.role!))
        .first();
      
      if (role) {
        await ctx.db.insert("userRoles", {
          userId: args.userId,
          roleId: role._id,
        });
      }
    }
  },
});

export const createCustomer = mutation({
  args: {
    fullName: v.string(),
    documentType: v.string(),
    documentNumber: v.string(),
    phoneNumber: v.string(),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    department: v.optional(v.string()),
    municipality: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    gender: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedPhone = canonicalPhoneNumber(args.phoneNumber);

    // Check if profile with same document number exists
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_documentNumber", (q) => q.eq("documentNumber", args.documentNumber))
      .first();
    
    if (existing) {
      throw new Error("Ya existe un cliente con este número de documento");
    }

    const existingByPhone = await ctx.db
      .query("profiles")
      .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", normalizedPhone))
      .first();
    if (existingByPhone) return existingByPhone._id;

    const id = await ctx.db.insert("profiles", {
      fullName: args.fullName,
      documentType: args.documentType,
      documentNumber: args.documentNumber,
      phoneNumber: normalizedPhone,
      email: args.email,
      address: args.address,
      department: args.department,
      municipality: args.municipality,
      birthDate: args.birthDate,
      gender: args.gender,
    });

    return id;
  },
});

export const updateCustomer = mutation({
  args: {
    id: v.id("profiles"),
    fullName: v.optional(v.string()),
    documentType: v.optional(v.string()),
    documentNumber: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    department: v.optional(v.string()),
    municipality: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    gender: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const addAttachment = mutation({
  args: {
    profileId: v.id("profiles"),
    fileName: v.string(),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Failed to get URL for storageId");

    const id = await ctx.db.insert("attachments", {
      profileId: args.profileId,
      fileName: args.fileName,
      storageId: args.storageId,
      url,
      mimeType: args.mimeType,
      size: args.size,
    });
    
    // Update profile documentStorageId as well to keep in sync if needed
    await ctx.db.patch(args.profileId, {
      documentStorageId: args.storageId,
    });

    return id;
  },
});

export const findByPhoneNumber = query({
  args: { phoneNumber: v.string() },
  handler: async (ctx, args) => {
    for (const variant of phoneVariants(args.phoneNumber)) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", variant))
        .first();
      if (profile) return profile;
    }
    return null;
  },
});

export const findByDocumentNumber = query({
  args: { documentNumber: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("profiles")
      .withIndex("by_documentNumber", (q) => q.eq("documentNumber", args.documentNumber))
      .first();
  },
});

export const removeAttachment = mutation({
  args: {
    attachmentId: v.id("attachments"),
  },
  handler: async (ctx, args) => {
    const attachment = await ctx.db.get(args.attachmentId);
    if (!attachment) throw new Error("Attachment not found");
    
    if (attachment.storageId) {
      await ctx.storage.delete(attachment.storageId);
    }
    
    await ctx.db.delete(args.attachmentId);
    
    // If this was the profile document, clear it
    if (attachment.profileId) {
       const profile = await ctx.db.get(attachment.profileId);
       if (profile && profile.documentStorageId === attachment.storageId) {
         await ctx.db.patch(attachment.profileId, {
           documentStorageId: undefined,
         });
       }
    }
  },
});
