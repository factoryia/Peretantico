import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

function parseMonthDay(date: string): string | null {
  const t = date.trim();
  const isoDateTime = t.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (isoDateTime) return `${isoDateTime[2]}-${isoDateTime[3]}`;
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[2]}-${iso[3]}`;
  const monthDay = t.match(/^(\d{2})-(\d{2})$/);
  if (monthDay) return `${monthDay[1]}-${monthDay[2]}`;
  return null;
}

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

export const getTodayForGreeting = query({
  args: {
    today: v.string(),
    monthDay: v.string(),
  },
  handler: async (ctx, args) => {
    const active = await ctx.db
      .query("specialDates")
      .filter((q) => q.eq(q.field("status"), true))
      .collect();

    const exact = active.find((d) => (d.date || "").trim().slice(0, 10) === args.today);
    if (exact) return exact;

    return active.find((d) => d.repeat === true && parseMonthDay(d.date) === args.monthDay) ?? null;
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
