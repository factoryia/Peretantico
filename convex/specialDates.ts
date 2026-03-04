import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// List special dates with optional search
export const list = query({
  args: {
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.searchTerm) {
      return await ctx.db
        .query("specialDates")
        .withSearchIndex("search_title", (q) =>
          q.search("title", args.searchTerm!)
        )
        .collect();
    }
    return await ctx.db.query("specialDates").order("desc").collect();
  },
});

// Create a special date
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    date: v.string(),
    repeat: v.boolean(),
    status: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("specialDates", args);
  },
});

// Update a special date
export const update = mutation({
  args: {
    id: v.id("specialDates"),
    title: v.string(),
    description: v.optional(v.string()),
    date: v.string(),
    repeat: v.boolean(),
    status: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

// Delete a special date
export const remove = mutation({
  args: {
    id: v.id("specialDates"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
