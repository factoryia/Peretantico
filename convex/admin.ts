import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Looks up a user by email.
 */
export const getUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
    return user;
  },
});

/**
 * Gets an auth account for a user by provider.
 */
export const getAccount = internalQuery({
  args: {
    userId: v.id("users"),
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("authAccounts")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("provider"), args.provider)
        )
      )
      .first();
    return account;
  },
});

/**
 * Gets ALL auth accounts for a user/provider (including duplicates).
 */
export const getAllAccountsForUser = internalQuery({
  args: {
    userId: v.id("users"),
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    const accounts = await ctx.db
      .query("authAccounts")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("provider"), args.provider)
        )
      )
      .collect();
    return accounts;
  },
});

/**
 * Creates a new user in the users table.
 */
export const createUser = internalMutation({
  args: {
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
    });
    return userId;
  },
});

/**
 * Creates a new auth account with a pre-hashed secret.
 */
export const createAccount = internalMutation({
  args: {
    userId: v.id("users"),
    provider: v.string(),
    accountId: v.string(),
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("authAccounts", {
      userId: args.userId,
      provider: args.provider,
      providerAccountId: args.accountId,
      secret: args.secret,
    });
  },
});

/**
 * Updates the secret of an existing auth account.
 */
export const updateAccountSecret = internalMutation({
  args: {
    accountId: v.id("authAccounts"),
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.accountId, {
      secret: args.secret,
    });
  },
});

/**
 * Assigns the "Administrador" role to a user.
 * Idempotent — does nothing if the role is already assigned.
 */
export const assignAdminRole = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const roleName = "Administrador";

    const role = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", roleName))
      .first();

    if (!role) {
      throw new Error(`Role "${roleName}" not found. Run seed first.`);
    }

    const existing = await ctx.db
      .query("userRoles")
      .withIndex("by_user_role", (q) =>
        q.eq("userId", args.userId).eq("roleId", role._id)
      )
      .first();

    if (existing) {
      return "already_assigned";
    }

    await ctx.db.insert("userRoles", {
      userId: args.userId,
      roleId: role._id,
    });

    return "assigned";
  },
});
