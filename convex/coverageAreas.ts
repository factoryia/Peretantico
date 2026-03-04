import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("coverageAreas").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("coverageAreas")
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();

    if (existing) {
      throw new Error("Coverage area with this name already exists");
    }

    const id = await ctx.db.insert("coverageAreas", {
      name: args.name,
      description: args.description,
      status: true,
    });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("coverageAreas"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    await ctx.db.patch(id, data);
  },
});

export const remove = mutation({
  args: { id: v.id("coverageAreas") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
