import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const fixAdmin = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const roleName = "Administrador";
    
    // 1. Find the role
    const role = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", roleName))
      .first();
      
    if (!role) {
      return `Error: Role "${roleName}" not found. Run seed first.`;
    }

    // 2. Find the user(s)
    const users = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .collect();

    if (users.length === 0) {
      return `Error: No user found with email "${args.email}". Please sign up first or check the email.`;
    }

    const results = [];

    for (const user of users) {
      // 3. Check if user has the role
      const existingUserRole = await ctx.db
        .query("userRoles")
        .withIndex("by_user_role", (q) => q.eq("userId", user._id).eq("roleId", role._id))
        .first();

      if (existingUserRole) {
        results.push(`User ${user._id} (${user.email}) ALREADY has role ${roleName}.`);
      } else {
        // 4. Assign role
        await ctx.db.insert("userRoles", {
          userId: user._id,
          roleId: role._id,
        });
        results.push(`User ${user._id} (${user.email}) ASSIGNED role ${roleName}.`);
      }
    }

    return results.join("\n");
  },
});
