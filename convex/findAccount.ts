import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const findAccount = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("providerAccountId"), args.email))
      .first();
      
    if (!account) return { found: false };
    
    const user = await ctx.db.get(account.userId);
    return { found: true, account, user };
  },
});
