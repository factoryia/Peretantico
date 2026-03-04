import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const inspectUser = internalQuery({
  args: { email: v.optional(v.string()), userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    let user = null;
    if (args.userId) {
      user = await ctx.db.get(args.userId);
    } else if (args.email) {
      user = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("email"), args.email))
        .first();
    }

    if (!user) return { error: "User not found" };

    const userId = user._id;
    
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    const authAccounts = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    const userRoles = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
      
    const roles = await Promise.all(
        userRoles.map((ur) => ctx.db.get(ur.roleId))
    );

    return {
      user,
      profile,
      authAccounts,
      roles
    };
  },
});
