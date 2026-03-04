import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { action, internalQuery, query, internalMutation } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { modifyAccountCredentials } from "@convex-dev/auth/server";

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
    
    return user;
  },
});

export const debugInspectUser = internalQuery({
  args: { email: v.optional(v.string()), userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    let users: Doc<"users">[] = [];
    if (args.userId) {
       const u = await ctx.db.get(args.userId);
       if (u) users.push(u);
     } else if (args.email) {
       users = await ctx.db
         .query("users")
         .filter((q) => q.eq(q.field("email"), args.email))
         .collect();
     }

     if (users.length === 0) return { error: "User not found" };

     const results = [];
     
     for (const user of users) {
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
         
         results.push({
           user,
           profile,
           authAccounts,
           roles
         });
     }

     return { results };
   },
 });

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    // Fetch roles
    const userRoles = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    const roles = await Promise.all(
      userRoles.map((ur) => ctx.db.get(ur.roleId))
    );

    return {
      ...user,
      roles: roles.filter((r) => r !== null).map((r) => r!.name),
    };
  },
});

export const getProfileForPasswordUpdate = internalQuery({
  args: { 
    profileId: v.id("profiles"),
    adminUserId: v.id("users")
  },
  handler: async (ctx, args) => {
    const currentUserId = args.adminUserId;
    
    // Check if admin
    const userRole = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", currentUserId))
      .first();
    
    let isAdmin = false;
    if (userRole) {
      const role = await ctx.db.get(userRole.roleId);
      if (role?.name === "Administrador") {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      return { authorized: false, error: "Solo los administradores pueden cambiar contraseñas de otros usuarios" };
    }

    // Get the profile to find the userId
    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      return { authorized: false, error: "Perfil de usuario no encontrado" };
    }
    if (!profile.userId) {
      return { authorized: false, error: "El perfil no está vinculado a un usuario de autenticación" };
    }

    const targetUserId = profile.userId;

    // Find the user's auth account with password provider
    const account = await ctx.db
      .query("authAccounts")
      .filter(q => q.and(
        q.eq(q.field("userId"), targetUserId),
        q.eq(q.field("provider"), "password")
      ))
      .first();

    if (!account) {
       // Si no tiene cuenta, verificamos si tiene email para poder crearle una
       const user = await ctx.db.get(targetUserId);
       const email = user?.email || profile.email;
       
       if (!email) {
         return { authorized: false, error: "El usuario no tiene una cuenta de contraseña configurada y no tiene email para crearla" };
       }
       
       return { 
           authorized: true, 
           account: null,
           email: email,
           targetUserId: targetUserId,
           userName: user?.name
       };
    }
    
    return { 
        authorized: true, 
        account: { 
          providerAccountId: account.providerAccountId,
          _id: account._id
        },
        email: account.providerAccountId // Usually the email
    };
  }
});

export const prepareUserForSwap = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.email) throw new Error("User not found or no email");
    
    const tempEmail = `temp_${Date.now()}_${user.email}`;
    await ctx.db.patch(args.userId, { email: tempEmail });
    return { tempEmail, originalEmail: user.email };
  }
});

export const completeUserSwap = internalMutation({
  args: { 
    oldUserId: v.id("users"),
    newEmail: v.string(),
    userName: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    // 1. Find the NEW user created by signIn
    const newUser = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("email"), args.newEmail))
      .first();
      
    if (!newUser) throw new Error("New user not found after sign up");
    const newUserId = newUser._id;

    // 2. Update references from oldUserId to newUserId
    
    // Update Profiles
    const profiles = await ctx.db
      .query("profiles")
      .withIndex("by_userId", q => q.eq("userId", args.oldUserId))
      .collect();
      
    for (const profile of profiles) {
      await ctx.db.patch(profile._id, { userId: newUserId });
    }
    
    // Update UserRoles
    const userRoles = await ctx.db
      .query("userRoles")
      .withIndex("by_user", q => q.eq("userId", args.oldUserId))
      .collect();
      
    for (const ur of userRoles) {
      // Check if role already exists for new user (unlikely but possible)
      const existing = await ctx.db
        .query("userRoles")
        .withIndex("by_user_role", q => q.eq("userId", newUserId).eq("roleId", ur.roleId))
        .first();
        
      if (!existing) {
        await ctx.db.patch(ur._id, { userId: newUserId });
      } else {
        await ctx.db.delete(ur._id);
      }
    }
    
    // Update Distributors
    // Note: Distributors table index depends on schema. searching by userId manually if no index
    // Checking schema: distributors has NO index on userId in provided snippets?
    // Let's check schema.ts again or distributors.ts
    // Wait, distributors.ts uses `by_userId` in `list`.
    // Let's assume there is an index or we use filter.
    // In `distributors.ts`: `.withIndex("by_userId", ...)`
    // So there IS an index.
    
    const distributors = await ctx.db
      .query("distributors")
      .withIndex("by_userId", q => q.eq("userId", args.oldUserId))
      .collect();
      
    for (const dist of distributors) {
      await ctx.db.patch(dist._id, { userId: newUserId });
    }

    // 3. Update Name if needed
    if (args.userName && newUser.name !== args.userName) {
      await ctx.db.patch(newUserId, { name: args.userName });
    }
    
    // 4. Delete old user
    await ctx.db.delete(args.oldUserId);
  }
});

export const updatePassword = action({
  args: {
    profileId: v.id("profiles"),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Debug: Check auth in action
    const actionUserId = await getAuthUserId(ctx);
    console.log("updatePassword Action: actionUserId", actionUserId);

    if (!actionUserId) {
      throw new Error("Unauthorized - Please log in");
    }

    const result = await ctx.runQuery(internal.users.getProfileForPasswordUpdate, { 
      profileId: args.profileId,
      adminUserId: actionUserId
    });

    if (!result.authorized) {
      throw new Error(result.error || "Unauthorized");
    }
    
    console.log("updatePassword result:", JSON.stringify(result, null, 2));

    // If account doesn't exist, we create it via Swap User strategy
    if (!result.account) {
       const targetUserId = result.targetUserId;
       if (!targetUserId) throw new Error("Target user ID missing");
       
       // 1. Prepare swap (rename old user)
       const { originalEmail } = await ctx.runMutation(internal.users.prepareUserForSwap, {
         userId: targetUserId
       });
       
       // 2. Create new user/account via signIn
       try {
         await ctx.runAction(api.auth.signIn, { 
           provider: "password", 
           params: { 
             email: originalEmail, 
             password: args.password, 
             flow: "signUp",
             name: result.userName 
           },
         });
       } catch (error) {
         // Revert? (change email back)
         // But we can't easily revert in action if failed?
         // We should try to recover or throw.
         console.error("SignIn failed during swap:", error);
         throw error;
       }
       
       // 3. Complete swap (move data and delete old)
       await ctx.runMutation(internal.users.completeUserSwap, {
         oldUserId: targetUserId,
         newEmail: originalEmail,
         userName: result.userName
       });
       
       return;
    }

    // Update the password using modifyAccountCredentials which handles hashing
    // If account exists, we use the account _id if available, otherwise providerAccountId
    const accountId = result.account?._id || result.account?.providerAccountId || result.email;
    
    if (!accountId) {
        throw new Error("Could not determine account ID for password update");
    }

    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: {
        id: accountId,
        secret: args.password,
      },
    });
  },
});
