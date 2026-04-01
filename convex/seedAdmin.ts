/* eslint-disable @typescript-eslint/no-explicit-any */
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { Scrypt } from "lucia";

/**
 * Seeds an admin user from environment variables.
 *
 * Usage (after resetting the database):
 *   npx convex run seedAdmin:seedAdmin
 *
 * Required env vars:
 *   ADMIN_EMAIL    — email for the admin account
 *   ADMIN_PASSWORD — plain-text password (will be hashed)
 *   ADMIN_NAME     — display name (defaults to "Administrador")
 */
const seedAdminHandler = async (ctx: any): Promise<any> => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Administrador";

  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required"
    );
  }

  const existingUser = await ctx.runQuery(internal.admin.getUserByEmail, {
    email,
  });

  let userId: any;
  let accountCreated = false;

  if (existingUser) {
    userId = existingUser._id;

    // Clean up ANY duplicate authAccounts BEFORE proceeding
    const allAccounts = await ctx.runQuery(
      internal.admin.getAllAccountsForUser,
      { userId, provider: "password" }
    );

    // If there are duplicates, delete all and recreate fresh
    if (allAccounts.length > 0) {
      for (const account of allAccounts) {
        await ctx.db.delete(account._id);
      }
      // Now create a fresh account
      await ctx.runMutation(internal.admin.createAccount, {
        userId,
        provider: "password",
        accountId: email,
        secret: await new Scrypt().hash(password),
      });
      accountCreated = true;
    } else {
      // No existing account - create one
      await ctx.runMutation(internal.admin.createAccount, {
        userId,
        provider: "password",
        accountId: email,
        secret: await new Scrypt().hash(password),
      });
      accountCreated = true;
    }
  } else {
    userId = await ctx.runMutation(internal.admin.createUser, {
      email,
      name,
    });

    await ctx.runMutation(internal.admin.createAccount, {
      userId,
      provider: "password",
      accountId: email,
      secret: await new Scrypt().hash(password),
    });

    accountCreated = true;
  }

  const roleResult = await ctx.runMutation(
    internal.admin.assignAdminRole,
    { userId }
  );

  return {
    status: "ok" as const,
    email,
    userId,
    account: accountCreated ? "created" : "updated",
    role: roleResult === "assigned" ? "newly assigned" : "already assigned",
  };
};

export const seedAdmin = action({
  args: {},
  handler: seedAdminHandler,
});