import { v } from "convex/values";
import { internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { Scrypt } from "lucia";

export const provision = internalAction({
  args: {
    email: v.string(),
    documentNumber: v.string(),
  },
  handler: async (ctx, args): Promise<{ status: "updated" | "created"; userId: Id<"users"> }> => {
    const email = args.email.trim().toLowerCase();
    const password = args.documentNumber.trim();
    if (!email) throw new Error("Correo requerido para credenciales del repartidor");
    if (!password) throw new Error("Número de documento requerido como contraseña");

    const user = await ctx.runQuery(internal.admin.getUserByEmail, { email });
    if (!user) {
      throw new Error(`No existe usuario con correo ${email}. Cree el repartidor con correo válido.`);
    }

    const hashed = await new Scrypt().hash(password);
    const account = await ctx.runQuery(internal.admin.getAccount, {
      userId: user._id,
      provider: "password",
    });

    if (account) {
      await ctx.runMutation(internal.admin.updateAccountSecret, {
        accountId: account._id,
        secret: hashed,
      });
      return { status: "updated" as const, userId: user._id };
    }

    await ctx.runMutation(internal.admin.createAccount, {
      userId: user._id,
      provider: "password",
      accountId: email,
      secret: hashed,
    });
    return { status: "created" as const, userId: user._id };
  },
});

export const listDistributorsForCredentialSync = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("distributors").collect();
    return rows
      .filter((row) => row.email?.trim() && row.documentNumber?.trim())
      .map((row) => ({
        distributorId: row._id,
        email: row.email!.trim().toLowerCase(),
        documentNumber: row.documentNumber.trim(),
      }));
  },
});

export const backfillAll = internalAction({
  args: {},
  handler: async (ctx): Promise<{ total: number; synced: number; errors: string[] }> => {
    const rows = await ctx.runQuery(internal.distributorCredentials.listDistributorsForCredentialSync, {});
    let synced = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        await ctx.runAction(internal.distributorCredentials.provision, {
          email: row.email,
          documentNumber: row.documentNumber,
        });
        synced += 1;
      } catch (error) {
        errors.push(
          `${row.email}: ${error instanceof Error ? error.message : "Error desconocido"}`
        );
      }
    }

    return { total: rows.length, synced, errors };
  },
});
